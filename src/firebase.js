import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "<redacted>",
  authDomain: "<redacted>",
  projectId: "<redacted>",
  storageBucket: "<redacted>",
  messagingSenderId: "<redacted>",
  appId: "<redacted>",
  measurementId: "<redacted>"
};

const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);


