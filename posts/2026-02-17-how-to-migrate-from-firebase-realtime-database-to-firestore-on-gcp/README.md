# How to Migrate from Firebase Realtime Database to Firestore on GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Firebase, GCP, Firestore, Realtime Database, Migration

Description: A complete walkthrough for migrating your data and application logic from Firebase Realtime Database to Cloud Firestore on Google Cloud Platform.

---

Firebase Realtime Database served many of us well for years. It is simple, fast, and great for small-to-medium datasets. But as applications grow, its limitations start showing - limited querying capabilities, scaling challenges with deeply nested data, and the single-region constraint. Firestore addresses all of these with a more powerful query model, automatic multi-region replication, and a document-collection structure that scales better.

The migration is not a flip-a-switch operation, though. It requires careful planning around data restructuring, query rewrites, and a transition strategy that keeps your application running throughout.

## Assessing Your Current Realtime Database Usage

Before writing any migration code, take stock of what you are working with. Export your Realtime Database data and analyze its structure.

This command exports your Realtime Database to a JSON file for analysis:

```bash
# Export the entire database to JSON
firebase database:get / --project YOUR_PROJECT_ID > rtdb-export.json

# Check the file size to understand the volume
ls -lh rtdb-export.json
```

Look at your data and note:

- How deeply nested is it?
- What are the top-level keys?
- How are relationships modeled (embedded vs. fan-out)?
- What queries does your application run?
- How large is each logical entity?

## Planning the Data Model Conversion

Realtime Database uses a giant JSON tree. Firestore uses collections and documents. The conversion is not always one-to-one.

Here is a typical Realtime Database structure and how it maps to Firestore:

```
Realtime Database (JSON tree):
/users
  /user123
    name: "Alice"
    email: "alice@example.com"
/posts
  /post456
    title: "My Post"
    authorId: "user123"
    timestamp: 1678900000
/user-posts
  /user123
    /post456: true
```

The Firestore equivalent uses collections and subcollections:

```
Firestore (collections/documents):
users (collection)
  user123 (document)
    name: "Alice"
    email: "alice@example.com"

posts (collection)
  post456 (document)
    title: "My Post"
    authorId: "user123"
    timestamp: Timestamp
```

Notice that the `user-posts` fan-out pattern is unnecessary in Firestore because you can query posts directly with `where("authorId", "==", "user123")`.

## Writing the Migration Script

For small-to-medium databases (under a few GB), a Node.js script running locally works fine. For larger datasets, you should run the migration on a GCE instance or as a Cloud Function to avoid timeout issues.

This script reads from Realtime Database and writes to Firestore in batches:

```javascript
// migrate.js - Migration script for RTDB to Firestore
const admin = require("firebase-admin");

// Initialize with a service account key
const serviceAccount = require("./service-account-key.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://YOUR_PROJECT_ID.firebaseio.com"
});

const rtdb = admin.database();
const firestore = admin.firestore();

// Firestore batch writes are limited to 500 operations
const BATCH_SIZE = 450;

async function migrateUsers() {
  console.log("Starting user migration...");

  // Read all users from RTDB
  const snapshot = await rtdb.ref("/users").once("value");
  const users = snapshot.val();

  if (!users) {
    console.log("No users found.");
    return;
  }

  const userIds = Object.keys(users);
  console.log(`Found ${userIds.length} users to migrate`);

  // Process in batches
  for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
    const batch = firestore.batch();
    const chunk = userIds.slice(i, i + BATCH_SIZE);

    for (const userId of chunk) {
      const userData = users[userId];
      const docRef = firestore.collection("users").doc(userId);

      // Transform data types during migration
      batch.set(docRef, {
        ...userData,
        // Convert RTDB timestamp (milliseconds) to Firestore Timestamp
        createdAt: userData.createdAt
          ? admin.firestore.Timestamp.fromMillis(userData.createdAt)
          : admin.firestore.FieldValue.serverTimestamp(),
        // Add migration metadata
        migratedFromRTDB: true,
        migratedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    await batch.commit();
    console.log(`Migrated users ${i + 1} to ${Math.min(i + BATCH_SIZE, userIds.length)}`);
  }

  console.log("User migration complete.");
}

async function migratePosts() {
  console.log("Starting post migration...");

  const snapshot = await rtdb.ref("/posts").once("value");
  const posts = snapshot.val();

  if (!posts) {
    console.log("No posts found.");
    return;
  }

  const postIds = Object.keys(posts);
  console.log(`Found ${postIds.length} posts to migrate`);

  for (let i = 0; i < postIds.length; i += BATCH_SIZE) {
    const batch = firestore.batch();
    const chunk = postIds.slice(i, i + BATCH_SIZE);

    for (const postId of chunk) {
      const postData = posts[postId];
      const docRef = firestore.collection("posts").doc(postId);

      batch.set(docRef, {
        ...postData,
        timestamp: postData.timestamp
          ? admin.firestore.Timestamp.fromMillis(postData.timestamp)
          : admin.firestore.FieldValue.serverTimestamp(),
        migratedFromRTDB: true
      });
    }

    await batch.commit();
    console.log(`Migrated posts ${i + 1} to ${Math.min(i + BATCH_SIZE, postIds.length)}`);
  }

  console.log("Post migration complete.");
}

// Run the migration
async function main() {
  try {
    await migrateUsers();
    await migratePosts();
    console.log("All migrations complete!");
  } catch (error) {
    console.error("Migration failed:", error);
  }
  process.exit(0);
}

main();
```

## Updating Client-Side Code

The client-side API differences between Realtime Database and Firestore are significant. Here is a side-by-side comparison of common operations.

Reading a single document:

```javascript
// RTDB - reading a user
import { getDatabase, ref, get } from "firebase/database";
const db = getDatabase();
const snapshot = await get(ref(db, `users/${userId}`));
const user = snapshot.val();

// Firestore - reading a user
import { getFirestore, doc, getDoc } from "firebase/firestore";
const db = getFirestore();
const snapshot = await getDoc(doc(db, "users", userId));
const user = snapshot.data();
```

Querying with conditions:

```javascript
// RTDB - query posts by author (requires fan-out or indexing)
const snapshot = await get(ref(db, `user-posts/${userId}`));

// Firestore - query posts by author (direct query)
import { collection, query, where, getDocs } from "firebase/firestore";
const q = query(
  collection(db, "posts"),
  where("authorId", "==", userId)
);
const snapshot = await getDocs(q);
```

Real-time listeners:

```javascript
// RTDB - listen for changes
import { onValue } from "firebase/database";
onValue(ref(db, `posts/${postId}`), (snapshot) => {
  const post = snapshot.val();
});

// Firestore - listen for changes
import { onSnapshot } from "firebase/firestore";
onSnapshot(doc(db, "posts", postId), (snapshot) => {
  const post = snapshot.data();
});
```

## Updating Security Rules

Your Realtime Database rules need to be rewritten as Firestore security rules.

Realtime Database rules:

```json
{
  "rules": {
    "posts": {
      "$postId": {
        ".read": true,
        ".write": "auth != null && data.child('authorId').val() === auth.uid"
      }
    }
  }
}
```

Equivalent Firestore rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /posts/{postId} {
      allow read: if true;
      allow write: if request.auth != null
                   && resource.data.authorId == request.auth.uid;
    }
  }
}
```

## Running a Dual-Write Strategy

For zero-downtime migration, run both databases simultaneously during the transition period. Write to both, read from Firestore once migration is verified.

This approach uses a wrapper that writes to both databases:

```javascript
// dual-write.js - Write to both databases during transition
async function createPost(postData) {
  const postId = firestore.collection("posts").doc().id;

  // Write to Firestore (primary)
  await firestore.collection("posts").doc(postId).set({
    ...postData,
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  });

  // Write to RTDB (secondary, for backward compatibility)
  await rtdb.ref(`posts/${postId}`).set({
    ...postData,
    timestamp: Date.now()
  });

  return postId;
}
```

## Verification and Cleanup

After migrating, verify data integrity by comparing record counts and sampling individual documents:

```bash
# Count documents in Firestore
gcloud firestore export gs://YOUR_BUCKET/verification --project YOUR_PROJECT_ID
```

Once verified, remove the Realtime Database references from your codebase, delete the dual-write logic, and optionally delete the Realtime Database if you no longer need it.

## Summary

Migrating from Realtime Database to Firestore is a worthwhile investment that pays off in query flexibility, scalability, and operational simplicity. The key steps are mapping your JSON tree to collections and documents, running a batch migration script, updating client code and security rules, and using a dual-write period for safe transition. Take your time with the data model design - getting that right makes everything else straightforward.
