importScripts("https://www.gstatic.com/firebasejs/12.16.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.16.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyD2KH46cUna2Fy8j_VbjHS3jBLFWUR_94s",
  authDomain: "sb-personal-coach-gestionale.firebaseapp.com",
  projectId: "sb-personal-coach-gestionale",
  storageBucket: "sb-personal-coach-gestionale.firebasestorage.app",
  messagingSenderId: "42241133439",
  appId: "1:42241133439:web:033ccdc8ad72f99781e84a"
});

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(self.clients.claim());
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(payload => {
  const notification = payload.notification || {};
  const data = payload.data || {};

  const title =
    notification.title ||
    data.title ||
    "SB Personal Coach";

  const options = {
    body:
      notification.body ||
      data.body ||
      "Hai una nuova notifica.",

    icon: "./logo.jpeg",
    badge: "./logo.jpeg",

    data: {
      url: data.url || "./"
    }
  };

  return self.registration.showNotification(
    title,
    options
  );
});

self.addEventListener(
  "notificationclick",
  event => {

    event.notification.close();

    const targetUrl =
      event.notification?.data?.url || "./";

    event.waitUntil(
      (async () => {

        const windows =
          await clients.matchAll({
            type: "window",
            includeUncontrolled: true
          });

        for (const client of windows) {

          if ("focus" in client) {

            try {

              await client.focus();

              if ("navigate" in client) {
                await client.navigate(targetUrl);
              }

              return;

            } catch (_) {}

          }

        }

        if (clients.openWindow) {
          await clients.openWindow(targetUrl);
        }

      })()
    );

  }
);
