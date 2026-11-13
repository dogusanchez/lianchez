import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, doc, getDoc, setDoc, updateDoc, increment, query, orderBy, serverTimestamp, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";

const firebaseConfig = {
    apiKey: "AIzaSyAYTaUdfhWAngCSZQjAyFtP_IRubX_Gw4c",
    authDomain: "lianchezportal.firebaseapp.com",
    projectId: "lianchezportal",
    storageBucket: "lianchezportal.firebasestorage.app",
    messagingSenderId: "283567832811",
    appId: "1:283567832811:web:cff0981ba1fa305a0dc8ae",
    measurementId: "G-8KPN5EG95S"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

export { auth, db, provider, signInWithPopup, signOut, onAuthStateChanged, collection, addDoc, getDocs, doc, getDoc, setDoc, updateDoc, increment, query, orderBy, serverTimestamp, where };