import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(__dirname, '.env');
const envStr = fs.readFileSync(envPath, 'utf-8');
const envs = {};
envStr.split('\n').forEach(line => {
  if (line.includes('=')) {
    const [k, v] = line.split('=');
    envs[k] = v.trim();
  }
});

const firebaseConfig = {
  apiKey: envs.VITE_FIREBASE_API_KEY,
  authDomain: envs.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: envs.VITE_FIREBASE_PROJECT_ID,
  storageBucket: envs.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: envs.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: envs.VITE_FIREBASE_APP_ID,
  measurementId: envs.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function clean() {
  const querySnapshot = await getDocs(collection(db, "routes"));
  let deleted = 0;
  for (const docSnap of querySnapshot.docs) {
    const data = docSnap.data();
    const o = data.origin?.toLowerCase() || '';
    const d = data.dest?.toLowerCase() || data.destination?.toLowerCase() || '';
    
    if (o.includes('york') || d.includes('york') || 
        o.includes('paris') || d.includes('paris') || 
        o.includes('tokyo') || d.includes('tokyo') || 
        o.includes('london') || d.includes('london')) {
      await deleteDoc(doc(db, "routes", docSnap.id));
      console.log(`Deleted route: ${data.origin || 'Unknown'} -> ${data.dest || data.destination || 'Unknown'}`);
      deleted++;
    }
  }
  console.log(`Finished! Deleted ${deleted} routes.`);
  process.exit(0);
}
clean();
