const { initializeApp, cert } = require('firebase-admin/app');
const {
  getFirestore,
  FieldValue
} = require('firebase-admin/firestore');

const {
  getMessaging
} = require('firebase-admin/messaging');


function loadServiceAccount() {
  const raw =
    process.env.FIREBASE_SERVICE_ACCOUNT_MAIN;

  if (!raw) {
    throw new Error(
      'Manca il secret FIREBASE_SERVICE_ACCOUNT_MAIN.'
    );
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT_MAIN non contiene JSON valido.'
    );
  }
}


const serviceAccount =
  loadServiceAccount();


if (
  serviceAccount.project_id !==
  'sb-personal-coach-gestionale'
) {
  throw new Error(
    `Secret del progetto sbagliato: ` +
    `${serviceAccount.project_id}. ` +
    `Atteso sb-personal-coach-gestionale.`
  );
}


initializeApp({
  credential:
    cert(serviceAccount),

  projectId:
    serviceAccount.project_id
});


const db =
  getFirestore();

const messaging =
  getMessaging();


function fmtDate(iso) {

  if (!iso) {
    return '-';
  }

  const [y, m, d] =
    String(iso)
      .slice(0, 10)
      .split('-');

  return y && m && d
    ? `${d}/${m}/${y}`
    : String(iso);
}


function safeFid(value) {

  return String(
    value || ''
  ).trim();

}


async function main() {

  console.log(
    '🔥 Progetto Firebase:',
    serviceAccount.project_id
  );


  console.log(
    '🔎 Controllo richieste di recupero...'
  );


  const snapshot =
    await db
      .collectionGroup('recuperi')
      .where(
        'stato',
        '==',
        'Richiesta'
      )
      .get();


  console.log(
    `📋 Richieste trovate: ${snapshot.size}`
  );


  let sent = 0;
  let skipped = 0;
  let failed = 0;


  for (
    const recuperoDoc
    of snapshot.docs
  ) {

    const data =
      recuperoDoc.data() || {};


    /*
     * Se la push è già stata
     * inviata correttamente,
     * non la reinviamo.
     */
    if (
      data.pushCoachSentAt ||
      data.pushCoachSent === true
    ) {

      skipped++;

      console.log(
        '⏭️ Già inviata:',
        recuperoDoc.ref.path
      );

      continue;
    }


    /*
     * Struttura prevista:
     *
     * users/{ownerUid}/recuperi/{id}
     */
    const ownerRef =
      recuperoDoc.ref.parent.parent;


    const ownerUid =
      ownerRef
        ? ownerRef.id
        : null;


    if (!ownerUid) {

      console.warn(
        '⚠️ Owner UID non ricavabile:',
        recuperoDoc.ref.path
      );

      skipped++;
      continue;
    }


    /*
     * Recupera il dispositivo
     * Coach registrato.
     */
    const pushDoc =
      await db
        .doc(
          `pushCoachTokens/${ownerUid}`
        )
        .get();


    if (!pushDoc.exists) {

      console.warn(
        `⚠️ Nessun dispositivo Coach ` +
        `registrato per ${ownerUid}`
      );

      skipped++;
      continue;
    }


    const push =
      pushDoc.data() || {};


    const fid =
      safeFid(
        push.fid ||
        push.installationId
      );


    console.log(
      '📱 Documento dispositivo:',
      pushDoc.ref.path
    );


    console.log(
      '📱 Push enabled:',
      push.enabled === true
    );


    console.log(
      '📱 Lunghezza FID:',
      fid.length
    );


    /*
     * Non stampiamo il FID completo
     * nei log per sicurezza.
     */
    if (fid) {

      console.log(
        '📱 FID preview:',
        `${fid.slice(0, 6)}...${fid.slice(-6)}`
      );

    }


    if (
      push.enabled !== true
    ) {

      console.warn(
        `⚠️ Push disattivata per ${ownerUid}`
      );

      skipped++;
      continue;
    }


    if (!fid) {

      console.warn(
        `⚠️ FID mancante per ${ownerUid}`
      );

      skipped++;
      continue;
    }


    /*
     * Un FID Firebase è una stringa
     * compatta. Se troviamo spazi,
     * ritorni a capo o valori palesemente
     * strani, evitiamo di chiamare FCM.
     */
    if (
      /\s/.test(fid)
    ) {

      console.error(
        '❌ FID non valido: contiene spazi ' +
        'o caratteri di nuova riga.'
      );

      failed++;
      continue;
    }


    const clienteNome =
      String(
        data.clienteNome ||
        'Un cliente'
      );


    const body =
      `${clienteNome} ha richiesto il recupero ` +
      `della lezione del ${fmtDate(data.data)} ` +
      `alle ${data.ora || '-'}.`;


    const url =
      'https://salvatorebarone90-jpg.github.io/' +
      'Salvo-Coach-Pt-gestione-clienti/';


    /*
     * I valori di "data" devono essere stringhe.
     */
    const message = {

  token: fid,

  data: {

        title:
          '🔄 Nuova richiesta di recupero',

        body:
          String(body),

        url:
          String(url),

        tipo:
          'recupero',

        recuperoId:
          String(recuperoDoc.id),

        ownerUid:
          String(ownerUid)

      }

    };


    try {

      console.log(
        '🚀 Invio push:',
        recuperoDoc.ref.path
      );


      const messageId =
        await messaging.send(
          message
        );


      await recuperoDoc.ref.set(
        {

          pushCoachSent:
            true,

          pushCoachSentAt:
            FieldValue.serverTimestamp(),

          pushCoachMessageId:
            messageId

        },
        {
          merge: true
        }
      );


      console.log(
        '✅ Push inviata:',
        recuperoDoc.ref.path
      );


      console.log(
        '📨 Message ID:',
        messageId
      );


      sent++;

    } catch (error) {

      failed++;


      console.error(
        '❌ Errore invio push:',
        recuperoDoc.ref.path
      );


      console.error(
        '❌ Firebase code:',
        error?.code ||
        'nessun codice'
      );


      console.error(
        '❌ Firebase message:',
        error?.message ||
        String(error)
      );


      /*
       * Questo ci permette di capire
       * immediatamente se Firebase
       * rifiuta proprio il FID.
       */
      if (
        error?.code ===
        'messaging/invalid-argument'
      ) {

        console.error(
          '🛑 Firebase ha rifiutato il target FID. ' +
          'Il dispositivo dovrà essere registrato nuovamente.'
        );

      }


      if (
        error?.code ===
        'messaging/installation-id-not-registered'
      ) {

        console.error(
          '🛑 Questo FID non risulta più registrato ' +
          'su Firebase Cloud Messaging.'
        );

      }

    }

  }


  console.log(
    '🏁 Fine controllo.'
  );


  console.log(
    `✅ Inviate: ${sent}`
  );


  console.log(
    `⏭️ Saltate: ${skipped}`
  );


  console.log(
    `❌ Fallite: ${failed}`
  );


  console.log(
    `📋 Richieste lette: ${snapshot.size}`
  );

}


main()
  .catch(
    (error) => {

      console.error(
        '❌ ERRORE GENERALE:',
        error
      );

      process.exit(1);

    }
  );
