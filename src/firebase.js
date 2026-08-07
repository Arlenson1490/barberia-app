import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCN1Tsi8R6Kq04W5k_sCQmYdzEtW2Lqyto",
  authDomain: "barberia-app-f1c40.firebaseapp.com",
  projectId: "barberia-app-f1c40",
  storageBucket: "barberia-app-f1c40.firebasestorage.app",
  messagingSenderId: "1087018169305",
  appId: "1:1087018169305:web:b0e516c3078d2b56a79fc8"
};

// Inicializamos Firebase
const app = initializeApp(firebaseConfig);

// Exportamos Firestore para usarlo en App.jsx
export const db = getFirestore(app);