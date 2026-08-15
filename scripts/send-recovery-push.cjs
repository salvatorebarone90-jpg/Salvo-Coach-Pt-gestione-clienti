const { initializeApp, cert } = require('firebase-admin/app');
const {
  getFirestore,
  FieldValue
} = require('firebase-admin/firestore');

const {
  getMessaging
} = require('firebase-admin/messaging');

function loadServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_MAIN;

  if (!raw) {
    throw new Error('Manca il secret FIREBASE_SERVICE_ACCOUNT_MAIN.');
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT_MAIN non contiene JSON valido.'
    );
  }
}

const serviceAccount = loadServiceAccount();

if (serviceAccount.project_id !== 'sb-personal-coach-gestionale') {
  throw new Error(
    `Secret del progetto sbagliato: ${serviceAccount.project_id}. ` +
    `Atteso sb-personal-coach-gestionale.`
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

  const [y, m, d] =
    String(iso).slice(0, 10).split('-');

  return y && m && d
    ? `${d}/${m}/${y}`
    : String(iso);
}

function clean(value) {
  return String(value || '').trim();
}

async function main() {
  console.log('🔥 Progetto Firebase:', serviceAccount.project_id);
  console.log('🔎 Controllo richieste di recupero...');

  const snapshot =
    await db
      .collectionGroup('recuperi')
      .where('stato', '==', 'Richiesta')
      .get();

  console.log(`📋 Richieste trovate: ${snapshot.size}`);

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const recuperoDoc of snapshot.docs) {
    const data = recuperoDoc.data() || {};

    if (data.pushCoachSentAt || data.pushCoachSent === true) {
      skipped++;
      console.log('⏭️ Già inviata:', recuperoDoc.ref.path);
      continue;
    }

    const ownerRef = recuperoDoc.ref.parent.parent;
    const ownerUid = ownerRef ? ownerRef.id : null;

    if (!ownerUid) {
      console.warn('⚠️ Owner UID non ricavabile:', recuperoDoc.ref.path);
      skipped++;
      continue;
    }

    const pushDoc =
      await db.doc(`pushCoachTokens/${ownerUid}`).get();

    if (!pushDoc.exists) {
      console.warn(
        `⚠️ Nessun dispositivo Coach registrato per ${ownerUid}`
      );
      skipped++;
      continue;
    }

    const push = pushDoc.data() || {};
    const token = clean(push.token);

    console.log('📱 Documento dispositivo:', pushDoc.ref.path);
    console.log('📱 Push enabled:', push.enabled === true);
    console.log('📱 Modalità registrazione:', push.registrationMode || '-');
    console.log('📱 Lunghezza token FCM:', token.length);

    if (token) {
      console.log(
        '📱 Token preview:',
        `${token.slice(0, 8)}...${token.slice(-8)}`
      );
    }

    if (push.enabled !== true) {
      console.warn(`⚠️ Push disattivata per ${ownerUid}`);
      skipped++;
      continue;
    }

    if (!token) {
      console.warn(
        `⚠️ Token FCM mancante per ${ownerUid}. ` +
        `Apri il gestionale Coach sul dispositivo per registrarlo.`
      );
      skipped++;
      continue;
    }

    if (/\s/.test(token)) {
      console.error(
        '❌ Token FCM non valido: contiene spazi o ritorni a capo.'
      );
      failed++;
      continue;
    }

    const clienteNome =
      String(data.clienteNome || 'Un cliente');

    const body =
      `${clienteNome} ha richiesto il recupero ` +
      `della lezione del ${fmtDate(data.data)} ` +
      `alle ${data.ora || '-'}.`;

    const url =
      'https://salvatorebarone90-jpg.github.io/' +
      'Salvo-Coach-Pt-gestione-clienti/';

    const message = {
      token,
      data: {
        title: '🔄 Nuova richiesta di recupero',
        body: String(body),
        url: String(url),
        tipo: 'recupero',
        recuperoId: String(recuperoDoc.id),
        ownerUid: String(ownerUid)
      }
    };

    try {
      console.log('🚀 Invio push:', recuperoDoc.ref.path);

      const messageId = await messaging.send(message);

      await recuperoDoc.ref.set(
        {
          pushCoachSent: true,
          pushCoachSentAt: FieldValue.serverTimestamp(),
          pushCoachMessageId: messageId
        },
        { merge: true }
      );

      console.log('✅ Push inviata:', recuperoDoc.ref.path);
      console.log('📨 Message ID:', messageId);
      sent++;

    } catch (error) {
      failed++;

      console.error('❌ Errore invio push:', recuperoDoc.ref.path);
      console.error(
        '❌ Firebase code:',
        error?.code || 'nessun codice'
      );
      console.error(
        '❌ Firebase message:',
        error?.message || String(error)
      );

      if (
        error?.code === 'messaging/registration-token-not-registered' ||
        error?.code === 'messaging/invalid-registration-token'
      ) {
        console.error(
          '🛑 Il token FCM non è più valido. ' +
          'Riapri il gestionale Coach per aggiornarlo.'
        );
      }
    }
  }

  console.log('🏁 Fine controllo.');
  console.log(`✅ Inviate: ${sent}`);
  console.log(`⏭️ Saltate: ${skipped}`);
  console.log(`❌ Fallite: ${failed}`);
  console.log(`📋 Richieste lette: ${snapshot.size}`);
}

main().catch((error) => {
  console.error('❌ ERRORE GENERALE:', error);
  process.exit(1);
});
