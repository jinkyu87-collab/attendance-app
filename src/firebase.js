import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// auth is initialized lazily (not at module load) so a missing/invalid
// Firebase config doesn't crash the whole app before React can render.
// sGet/sSet already catch failures from ensureSignedIn() and fall back gracefully.
let readyPromise = null;
export function ensureSignedIn() {
  if (!readyPromise) {
    readyPromise = new Promise((resolve, reject) => {
      const auth = getAuth(app);
      const unsub = onAuthStateChanged(
        auth,
        (user) => {
          if (user) {
            unsub();
            resolve(user);
          }
        },
        reject
      );
      signInAnonymously(auth).catch(reject);
    }).catch((e) => {
      readyPromise = null; // allow retry once config is fixed
      throw e;
    });
  }
  return readyPromise;
}
