import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyCYd2PbWd5d1riF4FzxWmwD2NxTefPs_4I",
    authDomain: "bettracker-de153.firebaseapp.com",
    projectId: "bettracker-de153",
    storageBucket: "bettracker-de153.firebasestorage.app",
    messagingSenderId: "930126674844",
    appId: "1:930126674844:web:027a7d21c2f11d7513e659",
    measurementId: "G-VC51G9W9SX"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
