const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');

function loadServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_MAIN;

  if (!raw) {
    throw new Error('Manca il secret FIREBASE_SERVICE_ACCOUNT_MAIN.');
  }

  try {
    return JSON.parse(raw);
  } catch (e) {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT_MAIN non contiene JSON valido.'
    );
  }
}

const serviceAccount = loadServiceAccount();

if (serviceAccount.project_id !== 'sb-personal-coach-gestionale') {
  throw new Error(
    `Secret del progetto sbagliato: ${serviceAccount.project_id}. Atteso sb-personal-coach-gestionale.`
  );
}

initializeApp({
  credential: cert(serviceAccount),
  projectId: serviceAccount.project_id
});

const db = getFirestore();
const messaging = getMessaging();

function fmtDate(iso) {
  if (!iso) return '-';

  const [y, m, d] = String(iso).slice(0, 10).split('-');

  return y && m && d
    ? `${d}/${m}/${y}`
    : String(iso);
}

async function main() {
  console.log('🔥 Progetto Firebase:', serviceAccount.project_id);
  console.log('🔎 Controllo richieste di recupero...');

  const snapshot = await db
    .collectionGroup('recuperi')
    .where('stato', '==', 'Richiesta')
    .get();

  console.log(`📋 Richieste trovate: ${snapshot.size}`);

  let sent = 0;
  let skipped = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data() || {};

    if (data.pushCoachSentAt || data.pushCoachSent === true) {
      skipped++;
      continue;
    }

    const ownerRef = doc.ref.parent.parent;
    const ownerUid = ownerRef && ownerRef.id;

    if (!ownerUid) {
      console.warn(
        '⚠️ Owner UID non ricavabile:',
        doc.ref.path
      );
      skipped++;
      continue;
    }

    const pushDoc = await db
      .doc(`pushCoachTokens/${ownerUid}`)
      .get();

    if (!pushDoc.exists) {
      console.warn(
        `⚠️ Nessun dispositivo Coach registrato per ${ownerUid}`
      );
      skipped++;
      continue;
    }

    const push = pushDoc.data() || {};

    if (push.enabled !== true || !push.fid) {
      console.warn(
        `⚠️ Push non attiva o FID mancante per ${ownerUid}`
      );
      skipped++;
      continue;
    }

    const clienteNome = String(
      data.clienteNome || 'Un cliente'
    );

    const body =
      `${clienteNome} ha richiesto il recupero ` +
      `della lezione del ${fmtDate(data.data)} ` +
      `alle ${data.ora || '-'}.`;

    const url =
      'https://salvatorebarone90-jpg.github.io/Salvo-Coach-Pt-gestione-clienti/';

    try {
      const messageId = await messaging.send({
        fid: push.fid,

        data: {
          title: '🔄 Nuova richiesta di recupero',
          body,
          url,
          tipo: 'recupero',
          recuperoId: doc.id,
          ownerUid
        }
      });

      await doc.ref.set(
        {
          pushCoachSent: true,
          pushCoachSentAt: FieldValue.serverTimestamp(),
          pushCoachMessageId: messageId
        },
        {
          merge: true
        }
      );

      console.log(
        '✅ Push inviata:',
        doc.ref.path,
        messageId
      );

      sent++;
    } catch (error) {
      console.error(
        '❌ Errore invio push:',
        doc.ref.path,
        error
      );
    }
  }

  console.log(
    `🏁 Fine controllo. Inviate: ${sent}; ` +
    `saltate: ${skipped}; ` +
    `richieste lette: ${snapshot.size}.`
  );
}

main().catch((err) => {
  console.error('❌ ERRORE GENERALE:', err);
  process.exit(1);
});
