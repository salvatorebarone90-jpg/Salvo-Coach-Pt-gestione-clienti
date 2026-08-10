import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const config = {"apiKey": "AIzaSyD2KH46cUna2Fy8j_VbjHS3jBLFWUR_94s", "authDomain": "sb-personal-coach-gestionale.firebaseapp.com", "projectId": "sb-personal-coach-gestionale", "storageBucket": "sb-personal-coach-gestionale.firebasestorage.app", "messagingSenderId": "42241133439", "appId": "1:42241133439:web:033ccdc8ad72f99781e84a"};
const VAPID_KEY = "BO82pf6a3SlQnOWtPGrGlD-Ra6BJf1N3hk_sAH2DekpLp9zj28Vg9wjDFDqGF_I3GtHtc_XIBsqZZnUMbhoLRIA";

const statusEl = document.getElementById("pushCoachStatus");
const btn = document.getElementById("pushCoachEnable");

function status(msg) {
  if (statusEl) statusEl.textContent = msg;
}

if (!btn) {
  console.warn("Push Coach: pulsante non trovato.");
} else {
  let currentUser = null;
  try {
    const app = getApps().length ? getApp() : initializeApp(config);
    const auth = getAuth(app);
    const db = getFirestore(app);

    onAuthStateChanged(auth, user => {
      currentUser = user || null;
    });

    btn.addEventListener("click", async () => {
      try {
        if (!currentUser) throw new Error("Apri prima il gestionale come coach e attendi il caricamento dei dati.");
        if (!("Notification" in window)) throw new Error("Notifiche non supportate su questo dispositivo.");
        if (!("serviceWorker" in navigator)) throw new Error("Service Worker non supportato.");

        const permission = await Notification.requestPermission();
        if (permission !== "granted") throw new Error("Permesso notifiche non concesso.");

        const registration = await navigator.serviceWorker.register("./firebase-messaging-sw.js", { scope: "./" });
        await navigator.serviceWorker.ready;

        // Dynamic import: un errore Messaging NON può bloccare il gestionale principale.
        const { getMessaging, getToken, isSupported } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging.js");
        if (!(await isSupported())) throw new Error("Firebase Messaging non è supportato qui.");

        const messaging = getMessaging(app);
        const token = await getToken(messaging, {
          vapidKey: VAPID_KEY,
          serviceWorkerRegistration: registration
        });
        if (!token) throw new Error("Token push non disponibile.");

        await setDoc(doc(db, "pushCoachTokens", currentUser.uid), {
          token,
          ownerUid: currentUser.uid,
          enabled: true,
          platform: navigator.userAgent,
          updatedAt: serverTimestamp()
        }, { merge: true });

        status("✅ Notifiche push attive su questo dispositivo.");
        btn.textContent = "Notifiche push attive";
        btn.disabled = true;
      } catch (e) {
        console.error("Push Coach:", e);
        status("⚠️ " + (e?.message || String(e)));
      }
    });
  } catch (e) {
    console.error("Push Coach init:", e);
    status("⚠️ Modulo push non disponibile. Il gestionale continua a funzionare normalmente.");
  }
}
