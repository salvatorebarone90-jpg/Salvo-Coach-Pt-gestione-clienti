import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc,
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
  if (statusEl) statusEl.textContent = message;
}


function setActiveUI() {
  setStatus("✅ Notifiche push attive su questo dispositivo.");

  if (btn) {
    btn.textContent = "Notifiche push attive";
    btn.disabled = true;
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


    async function saveRegistration(user, installationId) {

      await setDoc(
        doc(db, "pushCoachTokens", user.uid),
        {
          fid: installationId,
          installationId: installationId,
          ownerUid: user.uid,
          enabled: true,
          device: navigator.userAgent,
          updatedAt: serverTimestamp()
        },
        {
          merge: true
        }
      );

      setActiveUI();
    }


    async function syncExistingRegistration(user) {

      try {

        const savedRegistration =
          await getDoc(
            doc(db, "pushCoachTokens", user.uid)
          );


        if (
          savedRegistration.exists() &&
          savedRegistration.data()?.enabled === true &&
          Notification.permission === "granted"
        ) {

          setActiveUI();

        }


        if (
          Notification.permission === "granted" &&
          "serviceWorker" in navigator &&
          await isSupported()
        ) {

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


          onRegistered(
            messaging,
            async (installationId) => {

              if (!installationId) return;

              try {

                await saveRegistration(
                  user,
                  installationId
                );

              } catch (error) {

                console.error(
                  "Push Coach sync:",
                  error
                );

              }

            }
          );


          await register(
            messaging,
            {
              vapidKey: VAPID_KEY,
              serviceWorkerRegistration:
                swRegistration
            }
          );

        }

      } catch (error) {

        console.error(
          "Controllo registrazione push:",
          error
        );

      }

    }


    onAuthStateChanged(
      auth,
      async (user) => {

        currentUser =
          user || null;


        if (currentUser) {

          await syncExistingRegistration(
            currentUser
          );

        }

      }
    );


    btn.addEventListener(
      "click",
      async () => {

        try {

          setStatus(
            "⏳ Avvio configurazione notifiche..."
          );


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


          const supported =
            await isSupported();


          if (!supported) {
            throw new Error(
              "Firebase Messaging non è supportato su questo dispositivo."
            );
          }


          const permission =
            await Notification.requestPermission();


          if (permission !== "granted") {
            throw new Error(
              "Permesso notifiche non concesso."
            );
          }


          setStatus(
            "⏳ Registrazione dispositivo con Firebase..."
          );


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


          onRegistered(
            messaging,
            async (installationId) => {

              if (!installationId) return;


              try {

                setStatus(
                  "⏳ Registrazione completata. Salvataggio..."
                );


                await saveRegistration(
                  currentUser,
                  installationId
                );


              } catch (error) {

                console.error(
                  "Errore salvataggio FID:",
                  error
                );


                setStatus(
                  "⚠️ Dispositivo registrato, ma errore durante il salvataggio: " +
                  (
                    error?.message ||
                    String(error)
                  )
                );

              }

            }
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

      }
    );


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
