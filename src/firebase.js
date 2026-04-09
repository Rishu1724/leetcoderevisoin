// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDypmPuNhoaIIldMLZ7wh1LOIDkmR5OidE",
  authDomain: "leetcoderevision-3dfc1.firebaseapp.com",
  projectId: "leetcoderevision-3dfc1",
  storageBucket: "leetcoderevision-3dfc1.firebasestorage.app",
  messagingSenderId: "592067859197",
  appId: "1:592067859197:web:61cac3a068042d1fcbe494",
  measurementId: "G-57H9FGD36X"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Helper function to update user solved questions
export async function syncSolvedQuestions(username, solvedMap) {
  if (!username) return;
  try {
    const userRef = doc(db, "users", username);
    await setDoc(userRef, { solvedQuestions: solvedMap }, { merge: true });
  } catch (error) {
    console.error("Error syncing to Firebase:", error);
  }
}

// Helper function to fetch user solved questions
export async function getSolvedQuestions(username) {
  if (!username) return {};
  try {
    const userRef = doc(db, "users", username);
    const docSnap = await getDoc(userRef);
    if (docSnap.exists()) {
      return docSnap.data().solvedQuestions || {};
    }
  } catch (error) {
    console.error("Error fetching from Firebase:", error);
  }
  return {};
}
