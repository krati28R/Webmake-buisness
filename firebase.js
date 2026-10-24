import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider,
  createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, addDoc, collection, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAiZnajVh2z7OC6-Zey0H3BfkH5-MdAvLs",
  authDomain: "webmaker-site.firebaseapp.com",
  projectId: "webmaker-site",
  storageBucket: "webmaker-site.firebasestorage.app",
  messagingSenderId: "956049428038",
  appId: "1:956049428038:web:271d39c444b8294fbe0447"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export {
  onAuthStateChanged, signInWithPopup, GoogleAuthProvider,
  createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut,
  doc, getDoc, setDoc, addDoc, collection, serverTimestamp
};