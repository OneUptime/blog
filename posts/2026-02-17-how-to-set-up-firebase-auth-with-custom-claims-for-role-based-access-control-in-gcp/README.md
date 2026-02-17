# How to Set Up Firebase Auth with Custom Claims for Role-Based Access Control in GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Firebase, GCP, Authentication, RBAC, Cloud Functions

Description: Learn how to implement role-based access control in your GCP application using Firebase Auth custom claims and Cloud Functions for secure user management.

---

Firebase Authentication handles the heavy lifting of user sign-up, sign-in, and session management. But once you move beyond simple authentication, you quickly run into the need for authorization - who gets to do what in your app. That is where custom claims come in.

Custom claims let you attach arbitrary key-value pairs to a user's authentication token. You can use these claims to define roles like "admin", "editor", or "viewer", and then enforce those roles both on the client side and in your security rules. This guide walks through setting it all up from scratch.

## Why Custom Claims Over Database-Based Roles

You might wonder why not just store roles in Firestore and check them on every request. You can, but there are trade-offs. Custom claims are embedded directly in the ID token, which means:

- No extra database reads to check permissions
- Security rules can access them directly without additional lookups
- They propagate with every authenticated request automatically
- Token verification is cryptographically secure

The downside is that custom claims have a 1000-byte limit and only refresh when the token refreshes (usually every hour). For most role-based scenarios, this works perfectly.

## Setting Up the Firebase Project

First, make sure you have a Firebase project linked to your GCP project. If you are starting fresh, install the Firebase CLI and initialize your project.

This command initializes Firebase in your project directory with Functions support:

```bash
# Install Firebase CLI globally
npm install -g firebase-tools

# Log in and initialize your project
firebase login
firebase init functions
```

Choose TypeScript when prompted - it makes working with the Admin SDK much more pleasant.

## Creating the Cloud Function to Set Custom Claims

The core of the setup is a Cloud Function that sets custom claims on user accounts. Only server-side code (like Cloud Functions) can set custom claims - you cannot do it from the client.

Here is a callable Cloud Function that lets an existing admin assign roles to other users:

```typescript
// functions/src/index.ts
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Initialize the Admin SDK
admin.initializeApp();

// Define the allowed roles in your system
const VALID_ROLES = ["admin", "editor", "viewer"] as const;
type Role = typeof VALID_ROLES[number];

// Cloud Function to set a user's role
export const setUserRole = functions.https.onCall(async (data, context) => {
  // Check that the caller is authenticated and is an admin
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Must be logged in to set user roles."
    );
  }

  // Verify the caller has admin privileges
  if (context.auth.token.role !== "admin") {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only admins can assign roles."
    );
  }

  // Validate the input
  const { uid, role } = data;
  if (!uid || !role) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Must provide uid and role."
    );
  }

  if (!VALID_ROLES.includes(role)) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      `Role must be one of: ${VALID_ROLES.join(", ")}`
    );
  }

  // Set the custom claim on the target user
  await admin.auth().setCustomUserClaims(uid, { role });

  return { message: `Successfully set role '${role}' for user ${uid}` };
});
```

## Bootstrapping the First Admin

You have a chicken-and-egg problem - you need an admin to create admins. The simplest approach is a one-time script or a Cloud Function triggered on the first user creation.

This function automatically grants admin role to the first user who signs up:

```typescript
// functions/src/index.ts - add this alongside the previous function
export const onFirstUserCreated = functions.auth.user().onCreate(async (user) => {
  // Check how many users exist
  const listResult = await admin.auth().listUsers(2);

  // If this is the first user, make them admin
  if (listResult.users.length === 1) {
    await admin.auth().setCustomUserClaims(user.uid, { role: "admin" });
    console.log(`First user ${user.email} granted admin role`);
  } else {
    // Default role for subsequent users
    await admin.auth().setCustomUserClaims(user.uid, { role: "viewer" });
    console.log(`User ${user.email} granted default viewer role`);
  }
});
```

## Deploying the Functions

Deploy your functions to GCP with a single command:

```bash
# Deploy only the functions
firebase deploy --only functions
```

## Enforcing Roles in Firestore Security Rules

With custom claims in place, you can reference them directly in your Firestore security rules. The claims appear under `request.auth.token`.

Here is an example set of rules for a content management system:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Admin can read and write everything
    match /{document=**} {
      allow read, write: if request.auth.token.role == "admin";
    }

    // Editors can read all posts and write their own
    match /posts/{postId} {
      allow read: if request.auth != null;
      allow create: if request.auth.token.role in ["admin", "editor"];
      allow update: if request.auth.token.role in ["admin", "editor"]
                    && resource.data.authorUid == request.auth.uid;
      allow delete: if request.auth.token.role == "admin";
    }

    // Viewers can only read published posts
    match /posts/{postId} {
      allow read: if request.auth != null
                  && resource.data.published == true;
    }
  }
}
```

## Reading Custom Claims on the Client

On the client side, you can access custom claims from the ID token result. This is useful for rendering UI elements conditionally.

This snippet shows how to check the current user's role in a web app:

```javascript
// client-side JavaScript
import { getAuth } from "firebase/auth";

const auth = getAuth();

async function getUserRole() {
  const user = auth.currentUser;
  if (!user) return null;

  // getIdTokenResult includes the custom claims
  const tokenResult = await user.getIdTokenResult();
  return tokenResult.claims.role || "viewer";
}

// Force a token refresh after a role change
async function refreshUserRole() {
  const user = auth.currentUser;
  if (!user) return;

  // Pass true to force a refresh
  await user.getIdToken(true);
  const tokenResult = await user.getIdTokenResult();
  return tokenResult.claims.role;
}
```

## Calling the Role Assignment Function from the Client

Here is how an admin user would call the setUserRole function from a web client:

```javascript
// Call the Cloud Function to assign a role
import { getFunctions, httpsCallable } from "firebase/functions";

const functions = getFunctions();
const setUserRole = httpsCallable(functions, "setUserRole");

async function assignRole(targetUid, newRole) {
  try {
    const result = await setUserRole({ uid: targetUid, role: newRole });
    console.log(result.data.message);
  } catch (error) {
    console.error("Failed to set role:", error.message);
  }
}
```

## Handling Token Refresh Timing

One thing that catches people off guard is the token refresh delay. When you update a user's custom claims, those changes do not appear in their token until it refreshes. Tokens refresh automatically every hour, but you probably want faster propagation.

A practical approach is to use Firestore as a signaling mechanism. When a role changes, write a timestamp to a user-specific document. The client listens for changes and forces a token refresh.

This pattern uses a Firestore listener to detect role changes in near real-time:

```typescript
// In your Cloud Function, after setting claims
await admin.firestore().doc(`userMeta/${uid}`).set({
  roleUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
}, { merge: true });
```

```javascript
// On the client side, listen for role changes
import { getFirestore, doc, onSnapshot } from "firebase/firestore";

const db = getFirestore();
const auth = getAuth();

onSnapshot(doc(db, "userMeta", auth.currentUser.uid), (snapshot) => {
  if (snapshot.exists()) {
    // Force token refresh when role metadata changes
    auth.currentUser.getIdToken(true);
  }
});
```

## Testing Your RBAC Setup

Before going to production, verify everything works by writing a simple test scenario. Create a few test users, assign different roles, and confirm that security rules block unauthorized access.

You can also verify claims directly using the Firebase Admin SDK in a local script:

```typescript
// scripts/verify-claims.ts
import * as admin from "firebase-admin";

admin.initializeApp();

async function checkUserClaims(email: string) {
  const user = await admin.auth().getUserByEmail(email);
  console.log(`User: ${user.email}`);
  console.log(`Claims:`, user.customClaims);
}

checkUserClaims("testuser@example.com");
```

## Summary

Setting up role-based access control with Firebase custom claims gives you a clean, performant authorization layer. The claims live in the token itself, so security rules and backend checks are straightforward without extra database calls. Just keep the 1000-byte limit in mind, handle the token refresh delay gracefully, and bootstrap your first admin through a controlled process. For most applications, this approach covers everything you need for multi-role authorization on GCP.
