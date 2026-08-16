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
  getToken,
  deleteToken,
  isSupported
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

const COACH_OWNER_UID =
  "2Oiruc1vW6e0Mo432j6oLSo2sAV2";

const statusEl = document.getElementById("pushCoachStatus");
const btn = document.getElementById("pushCoachEnable");

function setStatus(message) {
  if (statusEl) statusEl.textContent = message;
}

function setWorkingUI(message) {
  setStatus(message);
  if (btn) {
    btn.textContent = "Configurazione notifiche...";
    btn.disabled = true;
  }
}

function setActiveUI() {
  setStatus("✅ Notifiche push attive su questo dispositivo.");
  if (btn) {
    btn.textContent = "Notifiche push attive";
    btn.disabled = true;
  }
}

function setReadyUI(message) {
  setStatus(message);
  if (btn) {
    btn.textContent = "Attiva notifiche push";
    btn.disabled = false;
  }
}

if (!btn) {
  console.warn("Push Coach: pulsante non trovato.");
} else {
  let currentUser = null;
  let registrationInProgress = false;

  try {
    const app =
      getApps().length > 0
        ? getApp()
        : initializeApp(firebaseConfig);

    if (app.options?.projectId !== firebaseConfig.projectId) {
      throw new Error(
        "Il gestionale sta utilizzando un progetto Firebase diverso: " +
        String(app.options?.projectId || "sconosciuto")
      );
    }

    const auth = getAuth(app);
    const db = getFirestore(app);
    const messaging = getMessaging(app);

    async function saveToken(user, token) {
      const cleanToken = String(token || "").trim();

      if (!cleanToken) {
        throw new Error("Firebase non ha restituito un token FCM.");
      }

      await setDoc(
        doc(db, "pushCoachTokens", COACH_OWNER_UID),
        {
          token: cleanToken,
          ownerUid: COACH_OWNER_UID,
          authUid: user.uid,
          enabled: true,
          registrationMode: "fcm-token",
          projectId: firebaseConfig.projectId,
          messagingSenderId: firebaseConfig.messagingSenderId,
          device: navigator.userAgent,
          tokenLength: cleanToken.length,
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );

      console.log("✅ Token FCM Coach salvato. Lunghezza:", cleanToken.length);
      setActiveUI();
    }

    async function ensureServiceWorker() {
      const registration =
        await navigator.serviceWorker.register(
          "./firebase-messaging-sw.js",
          {
            scope: "./",
            updateViaCache: "none"
          }
        );

      try {
        await registration.update();
      } catch (error) {
        console.warn("Aggiornamento Service Worker:", error);
      }

      await navigator.serviceWorker.ready;
      return registration;
    }

    async function registerCoachDevice(user, requestPermission) {
      if (registrationInProgress) return;
      registrationInProgress = true;

      try {
        setWorkingUI("⏳ Configurazione notifiche push...");

        if (!("Notification" in window)) {
          throw new Error("Le notifiche non sono supportate su questo dispositivo.");
        }

        if (!("serviceWorker" in navigator)) {
          throw new Error("Service Worker non supportato.");
        }

        if (!(await isSupported())) {
          throw new Error("Firebase Messaging non è supportato su questo dispositivo.");
        }

        if (Notification.permission !== "granted") {
          if (!requestPermission) {
            setReadyUI("Notifiche non configurate su questo dispositivo.");
            return;
          }

          const permission = await Notification.requestPermission();

          if (permission !== "granted") {
            throw new Error("Permesso notifiche non concesso.");
          }
        }

        const swRegistration = await ensureServiceWorker();

        setWorkingUI("⏳ Rigenerazione token FCM...");

        await deleteToken(messaging);

        const token =
          await getToken(
            messaging,
            {
              vapidKey: VAPID_KEY,
              serviceWorkerRegistration: swRegistration
            }
          );

        if (!token) {
          throw new Error(
            "Nessun token FCM disponibile. Chiudi e riapri la web app e riprova."
          );
        }

        await saveToken(user, token);

      } catch (error) {
        console.error("Push Coach:", error);
        setReadyUI("⚠️ " + (error?.message || String(error)));
      } finally {
        registrationInProgress = false;
      }
    }

    onAuthStateChanged(
      auth,
      async (user) => {
        currentUser = user || null;

        if (!currentUser) {
          setReadyUI("⚠️ Accedi come Coach per configurare le notifiche.");
          return;
        }

        console.log("Coach Auth UID:", currentUser.uid);
        console.log("Coach Owner UID:", COACH_OWNER_UID);
        console.log("Firebase project:", app.options?.projectId);

        if (Notification.permission === "granted") {
          await registerCoachDevice(currentUser, false);
        } else {
          setReadyUI("Notifiche non configurate su questo dispositivo.");
        }
      }
    );

    btn.addEventListener(
      "click",
      async () => {
        if (!currentUser) {
          setReadyUI(
            "⚠️ Utente Coach non ancora disponibile. Attendi qualche secondo e riprova."
          );
          return;
        }

        await registerCoachDevice(currentUser, true);
      }
    );

  } catch (error) {
    console.error("Push Coach INIT:", error);
    setReadyUI(
      "⚠️ Errore inizializzazione notifiche: " +
      (error?.message || String(error))
    );
  }
}
