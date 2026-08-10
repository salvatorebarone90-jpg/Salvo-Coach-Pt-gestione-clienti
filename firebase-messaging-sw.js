importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyB8mfqeM8CHjU03agJSExCudvDPpuSvw6Q",
  authDomain: "sb-personal-coach-dev.firebaseapp.com",
  projectId: "sb-personal-coach-dev",
  storageBucket: "sb-personal-coach-dev.firebasestorage.app",
  messagingSenderId: "778054518663",
  appId: "1:778054518663:web:9db7dcbd429ae464b87522"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const n = payload.notification || {};
  const d = payload.data || {};
  self.registration.showNotification(n.title || d.title || "SB Personal Coach", {
    body: n.body || d.body || "Hai una nuova notifica.",
    icon: "./logo.jpeg",
    badge: "./logo.jpeg",
    data: { url: d.url || "./" }
  });
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification?.data?.url || "./"));
});
