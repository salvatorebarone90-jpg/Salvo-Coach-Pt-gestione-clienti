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
  onUnregistered,
  register,
  unregister
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


function sleep(ms) {

  return new Promise(
    resolve => setTimeout(resolve, ms)
  );

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


    if (
      app.options?.projectId !==
      firebaseConfig.projectId
    ) {

      throw new Error(
        "Il gestionale sta utilizzando un progetto Firebase diverso: " +
        String(
          app.options?.projectId ||
          "sconosciuto"
        )
      );

    }


    const auth =
      getAuth(app);

    const db =
      getFirestore(app);

    const installations =
      getInstallations(app);

    const messaging =
      getMessaging(app);


    /*
     * SALVATAGGIO DEL NUOVO FID
     */
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
        "✅ Nuovo FID salvato in Firestore."
      );


      setActiveUI();

    }


    /*
     * DISABILITA TEMPORANEAMENTE IL VECCHIO RECORD
     */
    async function markRegistrationDisabled() {

      try {

        await setDoc(
          doc(
            db,
            "pushCoachTokens",
            COACH_OWNER_UID
          ),
          {

            enabled:
              false,

            updatedAt:
              serverTimestamp()

          },
          {
            merge: true
          }
        );


        console.log(
          "✅ Vecchia registrazione segnata come disattivata."
        );

      } catch (error) {

        console.warn(
          "Impossibile disattivare temporaneamente il vecchio record:",
          error
        );

      }

    }


    /*
     * RIGENERAZIONE COMPLETA
     */
    async function createFreshRegistration(user) {

      if (registrationInProgress) {
        return;
      }


      registrationInProgress =
        true;


      let unsubscribeRegistered = null;
      let unsubscribeUnregistered = null;


      try {

        setWorkingUI(
          "⏳ Avvio rigenerazione completa notifiche..."
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
          Notification.permission !==
          "granted"
        ) {

          const permission =
            await Notification.requestPermission();


          if (
            permission !==
            "granted"
          ) {

            throw new Error(
              "Permesso notifiche non concesso."
            );

          }

        }


        /*
         * 1 — Disabilitiamo temporaneamente
         * il vecchio record Firestore.
         */
        await markRegistrationDisabled();


        /*
         * 2 — Ascoltiamo l'evento di unregister.
         */
        unsubscribeUnregistered =
          onUnregistered(
            messaging,
            (oldInstallationId) => {

              console.log(
                "🗑️ FCM ha rimosso il vecchio FID:",
                oldInstallationId
              );

            }
          );


        /*
         * 3 — Rimuoviamo PRIMA
         * la registrazione FCM.
         */
        setWorkingUI(
          "⏳ Rimozione vecchia registrazione FCM..."
        );


        try {

          await unregister(
            messaging
          );


          console.log(
            "✅ Vecchia registrazione FCM eliminata."
          );

        } catch (error) {

          console.warn(
            "⚠️ Nessuna vecchia registrazione FCM da eliminare oppure già rimossa:",
            error
          );

        }


        /*
         * Lasciamo completare la rimozione.
         */
        await sleep(1500);


        /*
         * 4 — Recuperiamo il vecchio
         * Firebase Installation ID
         * solo per diagnostica.
         */
        let oldFID = null;


        try {

          oldFID =
            await getId(
              installations
            );


          console.log(
            "🗑️ Firebase Installation precedente:",
            oldFID
          );

        } catch (error) {

          console.warn(
            "Impossibile leggere il vecchio FID:",
            error
          );

        }


        /*
         * 5 — Eliminiamo Firebase Installation.
         * Questo forza Firebase a crearne
         * una completamente nuova.
         */
        setWorkingUI(
          "⏳ Eliminazione vecchia Firebase Installation..."
        );


        try {

          await deleteInstallations(
            installations
          );


          console.log(
            "✅ Firebase Installation eliminata."
          );

        } catch (error) {

          console.warn(
            "⚠️ Firebase Installation già eliminata o non disponibile:",
            error
          );

        }


        await sleep(2000);


        /*
         * 6 — Registriamo / aggiorniamo
         * il Service Worker.
         */
        setWorkingUI(
          "⏳ Aggiornamento Service Worker..."
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

        } catch (error) {

          console.warn(
            "Aggiornamento Service Worker:",
            error
          );

        }


        await navigator.serviceWorker.ready;


        /*
         * 7 — Prepariamo l'ascolto del
         * NUOVO FID PRIMA di register().
         */
        let receivedFID =
          false;


        unsubscribeRegistered =
          onRegistered(
            messaging,
            async (installationId) => {

              if (!installationId) {
                return;
              }


              if (receivedFID) {
                return;
              }


              receivedFID =
                true;


              try {

                const cleanFID =
                  String(
                    installationId
                  ).trim();


                setWorkingUI(
                  "⏳ Nuovo FID ricevuto. Verifica..."
                );


                console.log(
                  "📱 Nuovo FID da onRegistered:",
                  cleanFID
                );


                console.log(
                  "📱 Lunghezza nuovo FID:",
                  cleanFID.length
                );


                /*
                 * Controllo che non sia uguale
                 * al vecchio FID.
                 */
                if (
                  oldFID &&
                  cleanFID ===
                  String(oldFID).trim()
                ) {

                  console.warn(
                    "⚠️ Firebase ha restituito lo stesso FID precedente."
                  );

                } else {

                  console.log(
                    "✅ Il nuovo FID è diverso dal precedente."
                  );

                }


                /*
                 * Controlliamo anche Firebase Installations.
                 */
                try {

                  const currentInstallationId =
                    await getId(
                      installations
                    );


                  console.log(
                    "📱 Installations.getId():",
                    currentInstallationId
                  );


                  if (
                    cleanFID !==
                    String(
                      currentInstallationId
                    ).trim()
                  ) {

                    console.warn(
                      "⚠️ onRegistered e Installations.getId() non coincidono."
                    );

                  } else {

                    console.log(
                      "✅ onRegistered e Firebase Installations coincidono."
                    );

                  }

                } catch (error) {

                  console.warn(
                    "Controllo nuovo Installation ID:",
                    error
                  );

                }


                /*
                 * 8 — Solo adesso salviamo
                 * il nuovo FID in Firestore.
                 */
                setWorkingUI(
                  "⏳ Salvataggio nuova registrazione..."
                );


                await saveRegistration(
                  user,
                  cleanFID
                );


              } catch (error) {

                console.error(
                  "Errore durante il salvataggio del nuovo FID:",
                  error
                );


                setReadyUI(
                  "⚠️ Nuova registrazione ricevuta ma non salvata: " +
                  (
                    error?.message ||
                    String(error)
                  )
                );

              }

            }
          );


        /*
         * 9 — Nuova registrazione FCM.
         */
        setWorkingUI(
          "⏳ Registrazione Firebase Cloud Messaging..."
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


        console.log(
          "✅ register() completato."
        );


        /*
         * Attendiamo onRegistered().
         */
        for (
          let i = 0;
          i < 20;
          i++
        ) {

          if (receivedFID) {
            break;
          }

          await sleep(500);

        }


        if (!receivedFID) {

          throw new Error(
            "Firebase ha completato register(), ma non ha restituito il nuovo FID tramite onRegistered()."
          );

        }


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


        try {

          if (
            unsubscribeRegistered
          ) {

            unsubscribeRegistered();

          }

        } catch (_) {}


        try {

          if (
            unsubscribeUnregistered
          ) {

            unsubscribeUnregistered();

          }

        } catch (_) {}

      }

    }


    /*
     * FIREBASE AUTH
     */
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
          "Coach Owner UID:",
          COACH_OWNER_UID
        );


        console.log(
          "Firebase project:",
          app.options?.projectId
        );


        /*
         * Non rigeneriamo automaticamente.
         * Serve un click volontario.
         */
        setReadyUI(
          "Registrazione da rigenerare. Premi il pulsante una volta."
        );

      }
    );


    /*
     * PULSANTE
     */
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
