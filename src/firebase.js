import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCZIcw72suXnmt8UVgn24VL1XHJ3sV5AEw",
  authDomain: "sssss-3d037.firebaseapp.com",
  projectId: "sssss-3d037",
  storageBucket: "sssss-3d037.firebasestorage.app",
  messagingSenderId: "255728202852",
  appId: "1:255728202852:web:b8c06cd0d0c10d31a59b71",
  measurementId: "G-RKYYGVEMPC",
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
