import admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';

import 'dotenv/config';

const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
const serviceAccountPath = path.resolve('serviceAccountKey.json');
const HAS_SERVICE_ACCOUNT_FILE = fs.existsSync(serviceAccountPath);

if (!serviceAccountEnv && !HAS_SERVICE_ACCOUNT_FILE) {
    console.error('No service account found (env or file). Cannot clear DB.');
    process.exit(1);
}

if (serviceAccountEnv) {
    try {
        const serviceAccount = JSON.parse(serviceAccountEnv);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    } catch (e) {
        console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT env var:', e);
        process.exit(1);
    }
} else {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function deleteCollection(collectionPath, batchSize) {
    const collectionRef = db.collection(collectionPath);
    const query = collectionRef.orderBy('__name__').limit(batchSize);

    return new Promise((resolve, reject) => {
        deleteQueryBatch(db, query, resolve).catch(reject);
    });
}

async function deleteQueryBatch(db, query, resolve) {
    const snapshot = await query.get();

    const batchSize = snapshot.size;
    if (batchSize === 0) {
        resolve();
        return;
    }

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
    });
    await batch.commit();

    process.nextTick(() => {
        deleteQueryBatch(db, query, resolve);
    });
}

console.log('Clearing "matches" collection...');
await deleteCollection('matches', 100);
console.log('Successfully cleared "matches" collection.');

console.log('Clearing team histories...');
const teamsSnapshot = await db.collection('teams').get();
for (const teamDoc of teamsSnapshot.docs) {
    console.log(`  Clearing history for ${teamDoc.id}...`);
    await deleteCollection(`teams/${teamDoc.id}/history`, 100);
}
console.log('Successfully cleared all team histories.');

process.exit(0);
