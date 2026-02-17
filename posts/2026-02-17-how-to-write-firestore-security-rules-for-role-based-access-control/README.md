# How to Write Firestore Security Rules for Role-Based Access Control

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Firestore, Security Rules, RBAC, Firebase

Description: Learn how to implement role-based access control in Firestore using security rules to protect your data based on user roles and permissions.

---

If you have ever built an app where different users need different levels of access - admins who can do everything, editors who can modify content, and viewers who can only read - you know that getting access control right is critical. Firestore Security Rules give you a powerful, declarative way to enforce role-based access control (RBAC) directly at the database level, so even if your client-side code has a bug, your data stays protected.

In this guide, I will walk through building a complete RBAC system in Firestore Security Rules, from storing user roles to writing rules that enforce them.

## Understanding Firestore Security Rules

Firestore Security Rules run on Google's servers and evaluate every read and write request before it reaches your data. They are not optional filters - they are hard enforcement. If a rule says deny, the operation fails, period.

Rules are written in a custom language that looks a lot like JavaScript but has some important differences. You cannot loop, you cannot call external APIs, and every rule must evaluate to a boolean.

## Storing User Roles

Before you write any rules, you need a place to store user roles. The most common pattern is a `users` collection where each document has the user's UID as the document ID.

Here is the structure we will use throughout this guide:

```
// Firestore document structure for user roles
// Collection: users
// Document ID: the Firebase Auth UID
{
  "email": "alice@example.com",
  "displayName": "Alice",
  "role": "admin"  // Can be: "admin", "editor", "viewer"
}
```

You can also use a separate `roles` collection or custom claims in Firebase Auth tokens. Custom claims are great for roles that rarely change because they are embedded in the auth token and do not require an extra database read. But for this guide, we will use the document-based approach because it is more flexible and easier to update.

## Basic Rule Structure

Every Firestore Security Rules file starts with the same boilerplate. Here is the skeleton we will build on:

```javascript
// Root rules file - all Firestore rules go here
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper function to get the current user's role
    function getUserRole() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role;
    }

    // Helper function to check if user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }

    // We will add match blocks below
  }
}
```

The `getUserRole()` function does a document read every time it is called. Firestore allows up to 10 document access calls per rule evaluation, so be mindful of how often you use this pattern.

## Writing Rules for Each Role

Let us say we have a `posts` collection where admins can do anything, editors can create and update posts, and viewers can only read.

```javascript
// Rules for the posts collection with role-based access
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function getUserRole() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role;
    }

    function isAuthenticated() {
      return request.auth != null;
    }

    // Check if the user has one of the allowed roles
    function hasRole(allowedRoles) {
      return isAuthenticated() && getUserRole() in allowedRoles;
    }

    match /posts/{postId} {
      // Anyone with a valid role can read posts
      allow read: if hasRole(['admin', 'editor', 'viewer']);

      // Only admins and editors can create posts
      allow create: if hasRole(['admin', 'editor']);

      // Only admins and editors can update posts
      allow update: if hasRole(['admin', 'editor']);

      // Only admins can delete posts
      allow delete: if hasRole(['admin']);
    }
  }
}
```

The `hasRole` function accepts a list of allowed roles and checks if the current user's role is in that list. This pattern scales well - you can reuse it across multiple collections.

## Protecting the Users Collection

You need special rules for the `users` collection itself. If anyone can modify their own role document, your entire RBAC system falls apart.

```javascript
// Rules for the users collection - only admins can modify roles
match /users/{userId} {
  // Users can read their own profile
  allow read: if isAuthenticated() && request.auth.uid == userId;

  // Admins can read any user profile
  allow read: if hasRole(['admin']);

  // Only admins can create new user documents
  allow create: if hasRole(['admin']);

  // Users can update their own profile, but NOT the role field
  allow update: if isAuthenticated()
    && request.auth.uid == userId
    && !request.resource.data.diff(resource.data).affectedKeys().hasAny(['role']);

  // Admins can update any user profile including roles
  allow update: if hasRole(['admin']);

  // Only admins can delete users
  allow delete: if hasRole(['admin']);
}
```

The key line here is the `diff().affectedKeys().hasAny(['role'])` check. This prevents regular users from escalating their own privileges by changing their role field. They can update their display name or email, but not their role.

## Adding Resource-Level Permissions

Sometimes role is not enough. You might want editors to only update posts they created. You can combine role checks with resource data checks.

```javascript
// Posts rules with ownership checks
match /posts/{postId} {
  allow read: if hasRole(['admin', 'editor', 'viewer']);

  // Editors can only create posts where they are the author
  allow create: if hasRole(['admin', 'editor'])
    && request.resource.data.authorId == request.auth.uid;

  // Editors can only update their own posts, admins can update any post
  allow update: if hasRole(['admin'])
    || (hasRole(['editor']) && resource.data.authorId == request.auth.uid);

  // Only admins can delete
  allow delete: if hasRole(['admin']);
}
```

## Using Custom Claims Instead

If you want to avoid the extra document read on every request, you can set custom claims on the Firebase Auth token using the Admin SDK.

```javascript
// Server-side code to set custom claims (Node.js)
const admin = require('firebase-admin');

// Set an admin role on a user's auth token
async function setUserRole(uid, role) {
  await admin.auth().setCustomUserClaims(uid, { role: role });
  console.log(`Set role ${role} for user ${uid}`);
}
```

Then your security rules can read the role directly from the token:

```javascript
// Rules using custom claims - no extra document read needed
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function hasRole(allowedRoles) {
      return request.auth != null
        && request.auth.token.role in allowedRoles;
    }

    match /posts/{postId} {
      allow read: if hasRole(['admin', 'editor', 'viewer']);
      allow create: if hasRole(['admin', 'editor']);
      allow update: if hasRole(['admin', 'editor']);
      allow delete: if hasRole(['admin']);
    }
  }
}
```

Custom claims are limited to 1000 bytes per user, so they work best for simple role strings rather than complex permission objects.

## Testing Your Rules

Firestore provides an emulator and a rules testing library. You should absolutely use them - deploying untested security rules to production is asking for trouble.

```javascript
// Test file using the Firebase Rules testing library
const { initializeTestEnvironment, assertSucceeds, assertFails } =
  require('@firebase/rules-unit-testing');

const testEnv = await initializeTestEnvironment({
  projectId: 'my-project',
  firestore: {
    rules: fs.readFileSync('firestore.rules', 'utf8'),
  },
});

// Test that a viewer cannot delete a post
const viewerContext = testEnv.authenticatedContext('viewer-uid');
const viewerDb = viewerContext.firestore();
await assertFails(
  viewerDb.collection('posts').doc('post-1').delete()
);

// Test that an admin can delete a post
const adminContext = testEnv.authenticatedContext('admin-uid');
const adminDb = adminContext.firestore();
await assertSucceeds(
  adminDb.collection('posts').doc('post-1').delete()
);
```

## Common Pitfalls

There are a few things that trip people up regularly. First, remember that `get()` calls count toward your document access limit of 10 per rule evaluation. If you call `getUserRole()` in multiple nested match blocks, each call is a separate read.

Second, Firestore rules do not cascade. A rule on a parent collection does not automatically apply to subcollections. You need explicit rules for every path you want to protect.

Third, if no rule matches a request, the default is deny. This is good for security but can be confusing during development when you forget to add a rule for a new collection.

## Wrapping Up

Role-based access control in Firestore is straightforward once you understand the patterns. Store roles in user documents or custom claims, write helper functions to check those roles, and apply them consistently across your collections. Test everything with the emulator before deploying, and remember that security rules are your last line of defense - they should enforce your access policy regardless of what the client code does.

For production systems, consider combining document-based roles with custom claims. Use custom claims for the hot path (reads that happen constantly) and document-based roles for less frequent operations where you need more flexibility.
