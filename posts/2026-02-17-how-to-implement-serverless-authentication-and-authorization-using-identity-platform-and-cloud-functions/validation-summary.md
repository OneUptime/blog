# Validation Summary: How to Use Serverless Authentication and Authorization Using Identity Platform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Identity Platform
- Firebase Authentication Web SDK
- Firebase Admin SDK for Node.js
- Firebase custom claims
- Google Cloud Functions / Cloud Run functions
- Node.js Functions Framework
- Cloud Firestore
- Google Cloud CLI

## Sources Consulted
- Google Cloud Identity Platform: Sign in a user with email and password: https://cloud.google.com/identity-platform/docs/sign-in-user-email
- Google Cloud Identity Platform: Blocking functions: https://cloud.google.com/identity-platform/docs/blocking-functions
- Firebase Authentication: Verify ID tokens: https://firebase.google.com/docs/auth/admin/verify-id-tokens
- Firebase Authentication: Custom claims: https://firebase.google.com/docs/auth/admin/custom-claims
- Firebase Admin SDK Node.js API reference, BaseAuth: https://firebase.google.com/docs/reference/admin/node/firebase-admin.auth.baseauth
- Google Cloud SDK reference for `gcloud functions deploy`: https://cloud.google.com/sdk/gcloud/reference/functions/deploy
- Google Cloud Run functions: Write functions: https://cloud.google.com/functions/docs/writing
- Google Cloud Run functions: Deploy a function: https://cloud.google.com/run/docs/deploy-functions
- Google Cloud Firestore Node.js client reference: https://cloud.google.com/nodejs/docs/reference/firestore/latest/overview

## Issues Found
- The Identity Platform setup snippet used `gcloud identity-platform config update --enable-email-signin`, which is not documented in the current Google Cloud SDK reference. Changed the snippet to enable the Identity Platform API with `gcloud services enable identitytoolkit.googleapis.com` and configure Email/Password from the Google Cloud console, matching the official Identity Platform provider setup flow.
- The custom-claims role example said `revokeRefreshTokens()` could force a token refresh. Firebase documents that custom claims appear when a new ID token is issued, and that revoking refresh tokens revokes sessions while existing ID tokens can remain valid until expiration. Updated the wording to say users must refresh their ID token and revocation signs out sessions after the current ID token expires.
- The lifecycle section described the example as a blocking function triggered by Identity Platform, but the code is an authenticated HTTP function called by the client after sign-up. Updated the prose and code comment to describe the actual behavior.
- The Firestore example used `Firestore.Timestamp.now()` after importing only `Firestore`. Updated the import to include `Timestamp` from `@google-cloud/firestore` and changed the call to `Timestamp.now()`.

## Review Notes
- The post uses public HTTP Cloud Functions and performs application-level Firebase ID token verification. That is technically valid for this pattern, but production deployments should also consider CORS, rate limiting, IAM where appropriate, and whether Cloud Run functions or `gcloud functions deploy --gen2` better matches the target platform.
- The examples initialize the Firebase Admin SDK in separate files. If combined into a single deployable module, initialization should be guarded to avoid duplicate-app initialization errors.
