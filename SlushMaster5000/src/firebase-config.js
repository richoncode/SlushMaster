// Firebase configuration for SlushMaster5000
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, GithubAuthProvider } from 'firebase/auth';

// Firebase configuration
// NOTE: In production, these should be in environment variables
const firebaseConfig = {
    apiKey: "AIzaSyDXJ1n3lq9jwiViwkJ9jP7UK0W9jGZ-WZ4",
    authDomain: "slushmaster5000.firebaseapp.com",
    projectId: "slushmaster5000",
    storageBucket: "slushmaster5000.firebasestorage.app",
    messagingSenderId: "632323375348",
    appId: "1:632323375348:web:6afa0c7c54ec8ce1059ea1",
    measurementId: "G-NBLWE6HKGV"
};

import { getFirestore } from 'firebase/firestore';

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

// Initialize auth providers
export const googleProvider = new GoogleAuthProvider();
export const githubProvider = new GithubAuthProvider();

export default app;
