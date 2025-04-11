// public/firebase-messaging-sw.js

importScripts('https://www.gstatic.com/firebasejs/11.1.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.1.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCSzCOlqIAhpBEE-xpOjK36xppnLGbFadk",
  messagingSenderId: "204002999906",
  projectId: "qrcode-441614",
  appId: "1:204002999906:web:0ab85ef5048a05b1c35b3b",

});

const messaging = firebase.messaging();

// Gérer les notifications en arrière-plan
messaging.onBackgroundMessage((payload) => {
  console.log('Message reçu en arrière-plan:', payload);

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icon/favicon.ico'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});