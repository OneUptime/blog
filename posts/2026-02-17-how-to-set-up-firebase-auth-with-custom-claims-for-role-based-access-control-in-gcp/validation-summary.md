# Validation Summary: How to Set Up Firebase Auth with Custom Claims for Role-Based Access Control

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Firebase Authentication
- Firebase Admin SDK
- Cloud Functions for Firebase
- Firebase CLI
- Cloud Firestore Security Rules
- Firebase JavaScript SDK
- TypeScript

## Sources Consulted
- Firebase Authentication custom claims documentation: https://firebase.google.com/docs/auth/admin/custom-claims
- Cloud Functions for Firebase callable functions documentation: https://firebase.google.com/docs/functions/callable
- Cloud Functions for Firebase Auth triggers documentation: https://firebase.google.com/docs/functions/1st-gen/auth-events
- Firebase Security Rules basics and custom claims documentation: https://firebase.google.com/docs/rules/basics
- Cloud Firestore Security Rules structure and overlapping match behavior: https://firebase.google.com/docs/firestore/security/rules-structure
- Firebase CLI reference: https://firebase.google.com/docs/cli
- Firebase JavaScript Auth API reference: https://firebase.google.com/docs/reference/js/auth

## Issues Found
- The Firestore rules used two overlapping `match /posts/{postId}` blocks. Because Firestore allows access when any matching `allow` expression evaluates to true, the broad authenticated read rule made the later "published posts only" viewer rule ineffective. I consolidated the post rules so admins and editors can read all posts, while viewers can read only published posts.
- The Firestore rules accessed `request.auth.token.role` in write rules without first checking `request.auth != null`. I added authentication guards before role checks so unauthenticated requests are denied cleanly.
- The client-side role refresh listener used `getAuth()` without importing it and dereferenced `auth.currentUser.uid` without checking that a user was signed in. I added the missing import and a null guard around the listener setup.

## Review Notes
- The post uses first-generation Firebase Functions syntax for the Auth `onCreate` trigger. This remains valid, but Firebase's current documentation notes that Firebase Auth lifecycle triggers are not supported by Cloud Functions for Firebase 2nd gen.
- The first-admin bootstrap function is suitable as a simple tutorial pattern, but a production system should prefer a controlled one-time script or otherwise guard against concurrent first sign-ups.
