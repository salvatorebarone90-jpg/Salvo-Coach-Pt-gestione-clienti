import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

import {
  getMessaging,
  isSupported,
  onRegistered,
  register
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-messaging.js";


const firebaseConfig = {
  apiKey: "AIzaSyB8mfqeM8CHjU03agJSExCudvDPpuSvw6Q",
  authDomain: "sb-personal-coach-dev.firebaseapp.com",
  projectId: "sb-personal-coach-dev",
  storageBucket: "sb-personal-coach-dev.firebasestorage.app",
  messagingSenderId: "778054518663",
  appId: "1:778054518663:web:9db7dcbd429ae464b87522"
};


const VAPID_KEY =
  "BO82pf6a3SlQnOWtPGrGlD-Ra6BJf1N3hk_sAH2DekpLp9zj28Vg9wjDFDqGF_I3GtHtc_XIBsqZZnUMbhoLRIA";


const statusEl = document.getElementById("pushCoachStatus");
const btn = document.getElementById("pushCoachEnable");


function setStatus(message) {
  if (statusEl) {
    statusEl.textContent = message;
  }
}


if (!btn) {

  console.warn("Push Coach: pulsante non trovato.");

} else {

  let currentUser = null;

  try {

    const app =
      getApps().length > 0
        ? getApp()
        : initializeApp(firebaseConfig);

    const auth = getAuth(app);
    const db = getFirestore(app);


    onAuthStateChanged(auth, (user) => {
      currentUser = user || null;
    });


    btn.addEventListener("click", async () => {

      try {

        setStatus("⏳ Avvio configurazione notifiche...");


        if (!currentUser) {
          throw new Error(
            "Utente coach non ancora disponibile. Attendi qualche secondo e riprova."
          );
        }


        if (!("Notification" in window)) {
          throw new Error(
            "Le notifiche non sono supportate su questo dispositivo."
          );
        }


        if (!("serviceWorker" in navigator)) {
          throw new Error(
            "Service Worker non supportato."
          );
        }


        const supported = await isSupported();

        if (!supported) {
          throw new Error(
            "Firebase Messaging non è supportato su questo dispositivo."
          );
        }


        setStatus("⏳ Richiesta autorizzazione notifiche...");


        const permission =
          await Notification.requestPermission();


        if (permission !== "granted") {
          throw new Error(
            "Permesso notifiche non concesso."
          );
        }


        setStatus("⏳ Collegamento al servizio notifiche...");


        const swRegistration =
          await navigator.serviceWorker.register(
            "./firebase-messaging-sw.js",
            {
              scope: "./"
            }
          );


        await navigator.serviceWorker.ready;


        const messaging =
          getMessaging(app);


        let completed = false;


        onRegistered(
          messaging,
          async (installationId) => {

            if (!installationId || completed) {
              return;
            }

            completed = true;


            console.log(
              "Push Coach FID:",
              installationId
            );


            setStatus(
              "⏳ Registrazione dispositivo completata. Salvataggio..."
            );


            try {

              await setDoc(
                doc(
                  db,
                  "pushCoachTokens",
                  currentUser.uid
                ),
                {

                  fid: installationId,

                  installationId:
                    installationId,

                  ownerUid:
                    currentUser.uid,

                  enabled: true,

                  device:
                    navigator.userAgent,

                  updatedAt:
                    serverTimestamp()

                },
                {
                  merge: true
                }
              );


              setStatus(
                "✅ Notifiche push attive su questo dispositivo."
              );


              btn.textContent =
                "Notifiche push attive";

              btn.disabled = true;


            } catch (firestoreError) {

              console.error(
                "Errore salvataggio FID:",
                firestoreError
              );


              setStatus(
                "⚠️ Dispositivo registrato, ma errore durante il salvataggio: " +
                (
                  firestoreError?.message ||
                  String(firestoreError)
                )
              );

            }

          }
        );


        setStatus(
          "⏳ Registrazione dispositivo con Firebase..."
        );


        await register(
          messaging,
          {
            vapidKey: VAPID_KEY,
            serviceWorkerRegistration:
              swRegistration
          }
        );


      } catch (error) {

        console.error(
          "Push Coach:",
          error
        );


        setStatus(
          "⚠️ " +
          (
            error?.message ||
            String(error)
          )
        );

      }

    });


  } catch (error) {

    console.error(
      "Push Coach INIT:",
      error
    );


    setStatus(
      "⚠️ Errore inizializzazione modulo notifiche: " +
      (
        error?.message ||
        String(error)
      )
    );

  }

}
