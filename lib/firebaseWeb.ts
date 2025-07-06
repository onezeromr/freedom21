import { initializeApp, getApps } from 'firebase/app';
import { getAnalytics, Analytics } from 'firebase/analytics';
import { Platform } from 'react-native';

// Firebase configuration using environment variables
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "AIzaSyAvfUuvudNdclX2DjN-tcJOIBvj_h5yuFs",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "freedom21-405d1.firebaseapp.com",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "freedom21-405d1",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "freedom21-405d1.firebasestorage.app",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "1040019532233",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "1:1040019532233:web:20d17ff1ad2ca21dfd6018",
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-0YX989X36T"
};

let app: any = null;
let analytics: Analytics | null = null;

// Initialize Firebase for web only
export const initializeFirebaseWeb = () => {
  if (Platform.OS !== 'web') {
    return null;
  }

  try {
    // Check if Firebase is already initialized
    if (getApps().length === 0) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApps()[0];
    }

    // Initialize Analytics only in browser environment
    if (typeof window !== 'undefined') {
      analytics = getAnalytics(app);
    }

    return { app, analytics };
  } catch (error) {
    console.error('Error initializing Firebase:', error);
    return null;
  }
};

export { analytics };
export default app;