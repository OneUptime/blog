# Validation Summary: How to Use Firestore Bundle Files for Preloaded Query Results

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Firestore
- Firestore data bundles
- Firebase Admin SDK for Node.js
- Firebase JavaScript SDK
- Cloud Functions for Firebase
- Google Cloud Storage
- Cloud CDN
- gcloud CLI

## Sources Consulted
- Firebase documentation: Cloud Firestore data bundles, https://firebase.google.com/docs/firestore/bundles
- Firebase JavaScript SDK reference for `loadBundle`, `namedQuery`, `getDocs`, and `getDocsFromCache`, https://firebase.google.com/docs/reference/js/firestore_
- Google Cloud Firestore Node.js client reference for `BundleBuilder`, https://cloud.google.com/nodejs/docs/reference/firestore/latest/firestore/bundlebuilder
- Firebase documentation: Cloud Firestore triggers with Cloud Functions for Firebase, https://firebase.google.com/docs/functions/firestore-events
- Google Cloud SDK reference for `gcloud compute backend-buckets create`, https://docs.cloud.google.com/sdk/gcloud/reference/compute/backend-buckets/create
- Firebase/Google Cloud Firestore pricing documentation, https://firebase.google.com/docs/firestore/pricing and https://cloud.google.com/firestore/pricing

## Issues Found
- The Web client example used `getDocs()` with modular query constraints directly and did not import `getDocs`, `collection`, `where`, `orderBy`, or `limit`. Updated the example to import the required symbols and build a `Query` with `query()` before calling `getDocs()`.
- The Cloud Functions example used the older 1st gen `functions.firestore.document(...).onWrite(...)` style while current Firebase documentation recommends the 2nd gen `onDocumentWritten` API. Updated the example to use `firebase-functions/v2/firestore`.
- The cost example stated that 5 million reads cost about $3 per day without a location caveat. Current Firestore pricing varies by location and lists $0.03 per 100,000 reads for many regional locations, so the estimate was updated to about $1.50 per day at that rate, with a note that higher-priced locations can cost more.

## Review Notes
The bundle generation and loading flow is consistent with official Firestore bundle documentation. The Cloud Storage `makePublic()` example assumes object ACLs are usable; projects using uniform bucket-level access should grant access with IAM or serve through an authenticated/CDN path instead.
