importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyD2KH46cUna2Fy8j_VbjHS3jBLFWUR_94s",
  authDomain: "sb-personal-coach-gestionale.firebaseapp.com",
  projectId: "sb-personal-coach-gestionale",
  storageBucket: "sb-personal-coach-gestionale.firebasestorage.app",
  messagingSenderId: "42241133439",
  appId: "1:42241133439:web:033ccdc8ad72f99781e84a"
});

const messaging=firebase.messaging();

messaging.onBackgroundMessage((payload)=>{
  const notification=payload.notification||{};
  const data=payload.data||{};
  const title=notification.title||data.title||"SB Personal Coach";
  const options={
    body:notification.body||data.body||"Hai una nuova notifica.",
    icon:"./logo.jpeg",
    badge:"./logo.jpeg",
    data:{url:data.url||"./"}
  };
  self.registration.showNotification(title,options);
});

self.addEventListener("notificationclick",(event)=>{
  event.notification.close();
  const url=event.notification?.data?.url||"./";
  event.waitUntil(clients.openWindow(url));
});
