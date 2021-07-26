/* eslint-disable no-restricted-globals */

// This service worker can be customized!
// See https://developers.google.com/web/tools/workbox/modules
// for the list of available Workbox modules, or add any other
// code you'd like.
// You can also remove this file if you'd prefer not to use a
// service worker, and the Workbox build step will be skipped.

// import { clientsClaim } from "workbox-core";
// import { ExpirationPlugin } from "workbox-expiration";
// import { precacheAndRoute, createHandlerBoundToURL } from "workbox-precaching";
// import { registerRoute } from "workbox-routing";
// import { StaleWhileRevalidate } from "workbox-strategies";
// import localforage from "localforage";
// self.
// importScripts(
//   ""
// );
// import {
//   APP_BASE_URL,
//   ENCRYPT_OPTIONS,
//   NOTIFICATION_PRIVATE_KEY,
// } from "./constants";

const RSA_MODULUS_LENGTH = Math.pow(2, 11); // used for rsa encryption
const ENCRYPT_OPTIONS = { default_key_size: RSA_MODULUS_LENGTH.toString() };
const NOTIFICATION_PRIVATE_KEY = "NOTIFICATION_PRIVATE_KEY";
const APP_BASE_URL = "https://celopns.web.app/";

// clientsClaim();

// // Precache all of the assets generated by your build process.
// // Their URLs are injected into the manifest variable below.
// // This variable must be present somewhere in your service worker file,
// // even if you decide not to use precaching. See https://cra.link/PWA
// precacheAndRoute(self.__WB_MANIFEST);

// // Set up App Shell-style routing, so that all navigation requests
// // are fulfilled with your index.html shell. Learn more at
// // https://developers.google.com/web/fundamentals/architecture/app-shell
// const fileExtensionRegexp = new RegExp("/[^/?]+\\.[^/]+$");
// registerRoute(
//   // Return false to exempt requests from being fulfilled by index.html.
//   ({ request, url }) => {
//     // If this isn't a navigation, skip.
//     if (request.mode !== "navigate") {
//       return false;
//     } // If this is a URL that starts with /_, skip.

//     if (url.pathname.startsWith("/_")) {
//       return false;
//     } // If this looks like a URL for a resource, because it contains // a file extension, skip.

//     if (url.pathname.match(fileExtensionRegexp)) {
//       return false;
//     } // Return true to signal that we want to use the handler.

//     return true;
//   },
//   createHandlerBoundToURL(process.env.PUBLIC_URL + "/index.html")
// );

// // An example runtime caching route for requests that aren't handled by the
// // precache, in this case same-origin .png requests like those from in public/
// registerRoute(
//   // Add in any other file extensions or routing criteria as needed.
//   ({ url }) =>
//     url.origin === self.location.origin && url.pathname.endsWith(".png"), // Customize this strategy as needed, e.g., by changing to CacheFirst.
//   new StaleWhileRevalidate({
//     cacheName: "images",
//     plugins: [
//       // Ensure that once this runtime cache reaches a maximum size the
//       // least-recently used images are removed.
//       new ExpirationPlugin({ maxEntries: 50 }),
//     ],
//   })
// );

// // This allows the web app to trigger skipWaiting via
// // registration.waiting.postMessage({type: 'SKIP_WAITING'})
// self.addEventListener("message", (event) => {
//   if (event.data && event.data.type === "SKIP_WAITING") {
//     self.skipWaiting();
//   }
// });

// Any other custom service worker logic can go here.
self.addEventListener("push", async (event) => {
  // console.log("[Service Worker] Push Received.");
  const receivedData = event.data.json();
  // console.log(`[Service Worker] Push had this data: "${receivedData}"`);

  let notificationOptions = {};
  Object.keys(receivedData)
    // .filter((e) =>
    //   ["title", "body", "data", "iconHash", "imageHash", "badgeHash"].includes(
    //     e
    //   )
    // )
    .forEach((key) => {
      let value = receivedData[key];
      if (value) {
        notificationOptions[key] = value;
      }
    });

  if (receivedData.privateNotification) {
    try {
      const privateKey = await localforage.getItem(NOTIFICATION_PRIVATE_KEY);
      const decrypt = new JSEncrypt(ENCRYPT_OPTIONS);

      decrypt.setKey(privateKey);

      [
        ...Object.keys(notificationOptions).filter((e) =>
          ["title", "data", "body", "imageHash"].includes(e)
        ),
      ].forEach((key) => {
        try {
          const decrypted = decrypt.decrypt(notificationOptions[key]);
          if (key === "imageHash") {
            notificationOptions["image"] = decrypted;
          } else {
            notificationOptions[key] = decrypted;
          }
        } catch (e) {
          // console.log("could not decrypt field " + key, e);
          // trying to salvage what we can by deleting this problematic key and showing
          // whatever we can
          delete notificationOptions[key];
        }
      });
    } catch (e) {
      notificationOptions = {
        title: "CPNS - You just missed a private notification",
        body: "Go reset your private keys to start receiving private notifications again",
        data: APP_BASE_URL + "permissions",
      };
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationOptions.title, {
      vibrate: [200, 100, 200, 100, 200, 100, 400],
      ...notificationOptions,
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  // console.log("[Service Worker] Notification click Received.");
  // console.log(event.notification);
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data));
});
