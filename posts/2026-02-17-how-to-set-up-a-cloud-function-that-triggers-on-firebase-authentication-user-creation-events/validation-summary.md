# Validation Summary: How to Set Up a Cloud Function That Triggers on Firebase Auth User Creation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Functions for Firebase
- Firebase Authentication
- Firebase Authentication with Identity Platform blocking functions
- Firebase Admin SDK
- Cloud Firestore
- Firebase CLI
- Firebase Local Emulator Suite
- Google Cloud CLI
- Node.js

## Sources Consulted
- Firebase Authentication triggers: https://firebase.google.com/docs/functions/auth-events
- Auth blocking triggers: https://firebase.google.com/docs/functions/auth-blocking-events
- Cloud Functions for Firebase runtime and deployment options: https://firebase.google.com/docs/functions/manage-functions
- Retry asynchronous functions: https://firebase.google.com/docs/functions/retries
- Run functions locally with the Firebase emulator: https://firebase.google.com/docs/functions/local-emulator
- Firebase Emulator Suite setup and CLI flags: https://firebase.google.com/docs/emulator-suite/install_and_configure
- gcloud functions logs read reference: https://cloud.google.com/sdk/gcloud/reference/functions/logs/read

## Issues Found
- The prerequisites recommended Node.js 18 or later. Current Firebase documentation lists Node.js 18 as deprecated and recommends supported runtimes Node.js 20 or 22, so the prerequisite was changed to Node.js 20 or 22.
- The Gen 2 section implied that the after-creation Firebase Auth trigger has a Gen 2 equivalent. Firebase documentation states that Cloud Functions for Firebase 2nd gen does not support the Auth lifecycle triggers from the Firebase Authentication triggers guide, so the section now clarifies that `functions.auth.user().onCreate()` remains a 1st gen trigger and that Gen 2 applies to blocking functions.
- The Gen 2 blocking function example imported an unused Firestore trigger and threw `functions.https.HttpsError` without importing `functions`. The example now imports `beforeUserCreated` and `HttpsError` from `firebase-functions/v2/identity`, matching the official blocking-functions documentation.
- The Gen 2 example could throw when `user.email` was absent, such as phone-provider signups. The fallback display-name logic now handles users without email addresses.
- The retry section stated that Auth-triggered functions automatically retry after thrown errors. Official Firebase retry documentation says retries are not enabled by default and must be configured with `failurePolicy: true` for 1st gen background functions, so the text and example were updated.
- The `gcloud functions logs read --min-log-level` example used `ERROR`; the gcloud reference lists accepted values as `debug`, `info`, and `error`, so the example now uses lowercase `error`.
- The wrap-up said the function "supports retries" without noting configuration. It now says the function can be configured for retries.

## Review Notes
The 1st gen `functions.auth.user().onCreate()` examples remain valid for Firebase Authentication user creation events. Future updates could add a note that blocking functions require Firebase Authentication with Identity Platform and must return within the documented blocking-function timeout.
