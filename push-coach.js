import {
  initializeApp,
  getApps,
  getApp
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";

import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

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
  apiKey: "AIzaSyD2KH46cUna2Fy8j_VbjHS3jBLFWUR_94s",
  authDomain: "sb-personal-coach-gestionale.firebaseapp.com",
  projectId: "sb-personal-coach-gestionale",
  storageBucket: "sb-personal-coach-gestionale.firebasestorage.app",
  messagingSenderId: "42241133439",
  appId: "1:42241133439:web:033ccdc8ad72f99781e84a"
};


const VAPID_KEY =
  "BOxOk2OGYA83KVKEogQTRVjXhV7_q_AVt3UuM6i5b3kvSIr_PJ_elv-muBvjbiltWyFCWcKMJ3XnX8xYqC9kfFE";


/*
 * UID del Coach proprietario dei dati.
 * È lo stesso UID sotto cui trovi:
 *
 * users / 2Oiruc1vW6e0Mo432j6oLSo2sAV2 / recuperi
 */
const COACH_OWNER_UID =
  "2Oiruc1vW6e0Mo432j6oLSo2sAV2";


const statusEl =
  document.getElementById("pushCoachStatus");

const btn =
  document.getElementById("pushCoachEnable");


function setStatus(message) {
  if (statusEl) {
    statusEl.textContent = message;
  }
}


function setWorkingUI(message) {

  setStatus(message);

  if (btn) {
    btn.textContent = "Configurazione notifiche...";
    btn.disabled = true;
  }

}


function setActiveUI() {

  setStatus(
    "✅ Notifiche push attive su questo dispositivo."
  );

  if (btn) {
    btn.textContent = "Notifiche push attive";
    btn.disabled = true;
  }

}


function setRetryUI(message) {

  setStatus("⚠️ " + message);

  if (btn) {
    btn.textContent = "Attiva notifiche push";
    btn.disabled = false;
  }

}


if (!btn) {

  console.warn(
    "Push Coach: pulsante non trovato."
  );

} else {

  let currentUser = null;
  let registrationInProgress = false;

  try {

    const app =
      getApps().length > 0
        ? getApp()
        : initializeApp(firebaseConfig);

    const auth =
      getAuth(app);

    const db =
      getFirestore(app);


    async function saveRegistration(
      user,
      installationId
    ) {

      if (!installationId) {
        throw new Error(
          "Firebase non ha restituito un FID."
        );
      }


      /*
       * IMPORTANTE:
       * salviamo il dispositivo esattamente
       * nel documento cercato dal workflow GitHub.
       */
      await setDoc(
        doc(
          db,
          "pushCoachTokens",
          COACH_OWNER_UID
        ),
        {
          fid: installationId,
          installationId: installationId,

          ownerUid: COACH_OWNER_UID,

          authUid: user.uid,

          enabled: true,

          device:
            navigator.userAgent,

          projectId:
            firebaseConfig.projectId,

          updatedAt:
            serverTimestamp()
        },
        {
          merge: true
        }
      );


      console.log(
        "✅ Dispositivo Coach salvato:",
        COACH_OWNER_UID,
        installationId
      );


      setActiveUI();
    }


    async function registerCoachDevice(
      user,
      showProgress = true
    ) {

      if (registrationInProgress) {
        return;
      }

      registrationInProgress = true;


      try {

        if (showProgress) {
          setWorkingUI(
            "⏳ Registrazione dispositivo con Firebase..."
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


        if (
          Notification.permission !== "granted"
        ) {

          const permission =
            await Notification.requestPermission();


          if (permission !== "granted") {
            throw new Error(
              "Permesso notifiche non concesso."
            );
          }

        }


        const swRegistration =
          await navigator.serviceWorker.register(
            "./firebase-messaging-sw.js",
            {
              scope: "./",
              updateViaCache: "none"
            }
          );


        try {
          await swRegistration.update();
        } catch (_) {
          // Non blocca la registrazione.
        }


        await navigator.serviceWorker.ready;


        const messaging =
          getMessaging(app);


        let receivedFID = false;


        const unsubscribe =
          onRegistered(
            messaging,
            async (installationId) => {

              if (!installationId) {
                return;
              }


              receivedFID = true;


              try {

                setWorkingUI(
                  "⏳ FID ricevuto. Salvataggio dispositivo..."
                );


                await saveRegistration(
                  user,
                  installationId
                );


              } catch (error) {

                console.error(
                  "Errore salvataggio dispositivo Coach:",
                  error
                );


                setRetryUI(
                  "FID ricevuto ma non salvato: " +
                  (
                    error?.message ||
                    String(error)
                  )
                );

              } finally {

                try {
                  unsubscribe();
                } catch (_) {}

              }

            }
          );


        /*
         * register() forza una registrazione FCM.
         * Il FID arriverà attraverso onRegistered().
         */
        await register(
          messaging,
          {
            vapidKey:
              VAPID_KEY,

            serviceWorkerRegistration:
              swRegistration
          }
        );


        /*
         * Se entro 12 secondi onRegistered non restituisce
         * il FID, riattiviamo il pulsante invece di
         * mostrare falsamente "notifiche attive".
         */
        setTimeout(
          () => {

            if (!receivedFID) {

              try {
                unsubscribe();
              } catch (_) {}


              setRetryUI(
                "Registrazione Firebase non completata. Premi nuovamente per riprovare."
              );

            }

          },
          12000
        );


      } catch (error) {

        console.error(
          "Push Coach:",
          error
        );


        setRetryUI(
          error?.message ||
          String(error)
        );

      } finally {

        registrationInProgress = false;

      }

    }


    /*
     * Quando Firebase Auth identifica il Coach:
     *
     * - NON dichiariamo subito che le push sono attive;
     * - se iOS ha già dato il permesso, forziamo una
     *   nuova sincronizzazione FCM;
     * - il pulsante diventa "attivo" solo dopo
     *   l'effettivo salvataggio del nuovo FID.
     */
    onAuthStateChanged(
      auth,
      async (user) => {

        currentUser =
          user || null;


        if (!currentUser) {

          setRetryUI(
            "Accedi come Coach per configurare le notifiche."
          );

          return;
        }


        console.log(
          "Coach Auth UID:",
          currentUser.uid
        );

        console.log(
          "Coach Owner UID:",
          COACH_OWNER_UID
        );


        if (
          Notification.permission === "granted"
        ) {

          setStatus(
            "⏳ Verifica registrazione notifiche..."
          );


          await registerCoachDevice(
            currentUser,
            false
          );

        } else {

          setStatus(
            "Notifiche non configurate su questo dispositivo."
          );

          btn.textContent =
            "Attiva notifiche push";

          btn.disabled =
            false;

        }

      }
    );


    btn.addEventListener(
      "click",
      async () => {

        if (!currentUser) {

          setRetryUI(
            "Utente Coach non ancora disponibile. Attendi qualche secondo e riprova."
          );

          return;
        }


        await registerCoachDevice(
          currentUser,
          true
        );

      }
    );


  } catch (error) {

    console.error(
      "Push Coach INIT:",
      error
    );


    setRetryUI(
      "Errore inizializzazione modulo notifiche: " +
      (
        error?.message ||
        String(error)
      )
    );

  }

}
