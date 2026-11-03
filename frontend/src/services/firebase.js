import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyAKgS2LtP3iV5ZeVunA7ICqAnInVOZSX1c',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'acemockai-5b434.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'acemockai-5b434',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'acemockai-5b434.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '921914811228',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:921914811228:web:195beab83eb890ba329799'
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

/**
 * Triggers Google Sign-In Popup
 */
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    return {
      success: true,
      user: {
        name: user.displayName || user.email.split('@')[0],
        email: user.email,
        avatar: user.photoURL,
        firebaseUid: user.uid
      }
    };
  } catch (error) {
    console.error('Firebase Google Sign-In Error:', error.message);
    return {
      success: false,
      message: error.message
    };
  }
};
