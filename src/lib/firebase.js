import { initializeApp } from 'firebase/app'
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyB8jb7ZJy9KvY5uuTfB6vCJPZtSUZ6aIh0",
  authDomain: "routewatch-64b21.firebaseapp.com",
  projectId: "routewatch-64b21",
  storageBucket: "routewatch-64b21.firebasestorage.app",
  messagingSenderId: "522688382849",
  appId: "1:522688382849:web:5ae1dc36f350b73e568a80",
  measurementId: "G-H4CP3JGE04",
}

const app = initializeApp(firebaseConfig)

export const auth     = getAuth(app)
export const provider = new GoogleAuthProvider()
export const db       = getFirestore(app)

export { signInWithPopup, signOut }

export default app
