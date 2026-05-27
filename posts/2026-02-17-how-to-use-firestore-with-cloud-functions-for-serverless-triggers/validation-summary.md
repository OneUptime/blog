# Validation Summary: How to Use Firestore with Cloud Functions for Serverless Triggers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Platform
- Firebase
- Cloud Firestore
- Cloud Functions for Firebase, 1st gen and 2nd gen
- JavaScript / Node.js
- Firebase Admin SDK
- Cloud Storage for Firebase

## Sources Consulted
- Firebase documentation: Cloud Firestore triggers for Cloud Functions for Firebase - https://firebase.google.com/docs/functions/firestore-events
- Firebase documentation: Extend Cloud Firestore with Cloud Functions, 1st gen - https://firebase.google.com/docs/firestore/extend-with-functions
- Firebase documentation: Retry asynchronous functions - https://firebase.google.com/docs/functions/retries
- Firebase documentation: Manage functions and runtime options - https://firebase.google.com/docs/functions/manage-functions

## Issues Found
- The post incorrectly stated that Firestore-triggered Cloud Functions are automatically retried on failure by default. Firebase documentation says retries are not enabled by default; they must be enabled explicitly with `failurePolicy: true` for 1st gen functions or `retry: true` for 2nd gen functions. Updated the text and the payment example to enable `failurePolicy`.
- The payment retry example checked only the original event snapshot for the `processed` flag. During a retry, that snapshot can be stale, so the example now reads the current document before deciding whether to process. The example also passes `paymentId` to the payment provider call as an idempotency key, which is the safer pattern for avoiding duplicate external charges.

## Review Notes
The 1st gen `functions.firestore.document(...).onCreate/onUpdate/onDelete/onWrite` examples and the 2nd gen `onDocumentCreated` example match Firebase's documented APIs. The post uses CommonJS syntax, which remains supported by Cloud Functions for Firebase. Future updates could mention that 1st gen Firestore triggers only support the default Firestore database in native mode, while 2nd gen is required for named databases or Datastore mode.
