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

import {
  getInstallations,
  deleteInstallations,
  getId
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-installations.js";


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


function setReadyUI(message) {

  setStatus(message);

  if (btn) {
    btn.textContent = "Rigenera registrazione push";
    btn.disabled = false;
  }

}


function setActiveUI() {

  setStatus(
    "✅ Notifiche push registrate su questo dispositivo."
  );

  if (btn) {
    btn.textContent = "Rigenera registrazione push";
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


    /*
     * Verifica importante:
     * il Firebase App già inizializzato deve
     * appartenere allo stesso progetto.
     */
    if (
      app.options?.projectId !==
      firebaseConfig.projectId
    ) {

      throw new Error(
        "Il gestionale sta utilizzando un progetto Firebase diverso: " +
        String(app.options?.projectId || "sconosciuto")
      );

    }


    const auth =
      getAuth(app);

    const db =
      getFirestore(app);

    const installations =
      getInstallations(app);


    async function saveRegistration(
      user,
      installationId
    ) {

      if (!installationId) {

        throw new Error(
          "Firebase non ha restituito un FID."
        );

      }


      const cleanFID =
        String(installationId).trim();


      console.log(
        "✅ Nuovo FID:",
        cleanFID
      );

      console.log(
        "✅ Lunghezza nuovo FID:",
        cleanFID.length
      );


      await setDoc(
        doc(
          db,
          "pushCoachTokens",
          COACH_OWNER_UID
        ),
        {

          fid:
            cleanFID,

          installationId:
            cleanFID,

          ownerUid:
            COACH_OWNER_UID,

          authUid:
            user.uid,

          enabled:
            true,

          projectId:
            firebaseConfig.projectId,

          messagingSenderId:
            firebaseConfig.messagingSenderId,

          device:
            navigator.userAgent,

          regeneratedAt:
            serverTimestamp(),

          updatedAt:
            serverTimestamp()

        },
        {
          merge: true
        }
      );


      console.log(
        "✅ Registrazione Coach salvata in Firestore."
      );


      setActiveUI();

    }


    async function createFreshRegistration(user) {

      if (registrationInProgress) {
        return;
      }


      registrationInProgress = true;


      try {

        setWorkingUI(
          "⏳ Rigenerazione completa della registrazione Firebase..."
        );


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


        /*
         * 1.
         * Eliminiamo completamente la Firebase Installation
         * precedente. Firebase creerà quindi un FID nuovo.
         */
        setWorkingUI(
          "⏳ Eliminazione vecchia registrazione Firebase..."
        );


        try {

          const oldFID =
            await getId(installations);


          console.log(
            "🗑️ Vecchio FID:",
            oldFID
          );


          await deleteInstallations(
            installations
          );


          console.log(
            "✅ Vecchia Firebase Installation eliminata."
          );

        } catch (error) {

          console.warn(
            "Eliminazione vecchia installation:",
            error
          );

        }


        /*
         * Piccola attesa per permettere alla cancellazione
         * di propagarsi prima della nuova registrazione.
         */
        await new Promise(
          resolve =>
            setTimeout(resolve, 1500)
        );


        /*
         * 2.
         * Aggiorniamo / registriamo il Service Worker.
         */
        setWorkingUI(
          "⏳ Registrazione Service Worker..."
        );


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

        } catch (_) {}


        await navigator.serviceWorker.ready;


        /*
         * 3.
         * Firebase Messaging.
         */
        const messaging =
          getMessaging(app);


        let receivedFID =
          false;


        const unsubscribe =
          onRegistered(
            messaging,
            async (installationId) => {

              if (!installationId) {
                return;
              }


              receivedFID =
                true;


              try {

                setWorkingUI(
                  "⏳ Nuovo FID ricevuto. Salvataggio..."
                );


                /*
                 * Controlliamo anche che Firebase Installations
                 * restituisca lo stesso identificativo.
                 */
                const currentInstallationId =
                  await getId(installations);


                console.log(
                  "📱 onRegistered FID:",
                  installationId
                );


                console.log(
                  "📱 Installations.getId():",
                  currentInstallationId
                );


                if (
                  String(installationId) !==
                  String(currentInstallationId)
                ) {

                  console.warn(
                    "⚠️ I due FID non coincidono."
                  );

                }


                await saveRegistration(
                  user,
                  installationId
                );


              } catch (error) {

                console.error(
                  "Errore salvataggio nuovo FID:",
                  error
                );


                setReadyUI(
                  "⚠️ Registrazione ricevuta ma non salvata: " +
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
         * 4.
         * Nuova registrazione FCM.
         */
        setWorkingUI(
          "⏳ Nuova registrazione Firebase Cloud Messaging..."
        );


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
         * Se onRegistered non arriva entro 15 secondi,
         * non mostriamo falsamente "attivo".
         */
        setTimeout(
          () => {

            if (!receivedFID) {

              try {
                unsubscribe();
              } catch (_) {}


              setReadyUI(
                "⚠️ Firebase non ha restituito il nuovo FID. Premi nuovamente per riprovare."
              );

            }

          },
          15000
        );


      } catch (error) {

        console.error(
          "Push Coach:",
          error
        );


        setReadyUI(
          "⚠️ " +
          (
            error?.message ||
            String(error)
          )
        );

      } finally {

        registrationInProgress =
          false;

      }

    }


    onAuthStateChanged(
      auth,
      async (user) => {

        currentUser =
          user || null;


        if (!currentUser) {

          setReadyUI(
            "⚠️ Accedi come Coach per configurare le notifiche."
          );

          return;
        }


        console.log(
          "Coach Auth UID:",
          currentUser.uid
        );


        console.log(
          "Firebase project:",
          app.options?.projectId
        );


        /*
         * NON eseguiamo più automaticamente
         * la vecchia registrazione.
         *
         * Vogliamo che questa volta sia l'utente
         * a premere il pulsante e generare
         * volontariamente una Installation nuova.
         */
        setReadyUI(
          "Registrazione da rigenerare. Premi il pulsante una volta."
        );

      }
    );


    btn.addEventListener(
      "click",
      async () => {

        if (!currentUser) {

          setReadyUI(
            "⚠️ Utente Coach non ancora disponibile. Attendi qualche secondo."
          );

          return;
        }


        await createFreshRegistration(
          currentUser
        );

      }
    );


  } catch (error) {

    console.error(
      "Push Coach INIT:",
      error
    );


    setReadyUI(
      "⚠️ Errore inizializzazione notifiche: " +
      (
        error?.message ||
        String(error)
      )
    );

  }

}
