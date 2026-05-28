# Validation Summary: How to Migrate from Firebase Realtime Database to Firestore on GCP

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Firebase Realtime Database
- Cloud Firestore
- Firebase Admin SDK for Node.js
- Firebase JavaScript SDK
- Firebase CLI
- Google Cloud CLI
- Firestore Security Rules
- Realtime Database Security Rules
- Google Compute Engine
- Cloud Run jobs

## Sources Consulted
- Firebase CLI reference: https://firebase.google.com/docs/cli
- Realtime Database locations: https://firebase.google.com/docs/database/locations
- Realtime Database Admin SDK data retrieval: https://firebase.google.com/docs/database/admin/retrieve-data
- Cloud Firestore locations: https://firebase.google.com/docs/firestore/locations
- Cloud Firestore transactions and batched writes: https://firebase.google.com/docs/firestore/manage-data/transactions
- Cloud Firestore Web get data documentation: https://firebase.google.com/docs/firestore/query-data/get-data
- Cloud Firestore query documentation: https://firebase.google.com/docs/firestore/query-data/queries
- Cloud Firestore aggregation queries: https://firebase.google.com/docs/firestore/query-data/aggregation-queries
- Cloud Firestore Security Rules conditions: https://firebase.google.com/docs/firestore/security/rules-conditions
- Google Cloud CLI Firestore export reference: https://cloud.google.com/sdk/gcloud/reference/firestore/export
- Cloud Functions for Firebase quotas and time limits: https://firebase.google.com/docs/functions/quotas
- Cloud Run jobs task timeout documentation: https://cloud.google.com/run/docs/configuring/task-timeout

## Issues Found
- The introduction described Realtime Database as having a "single-region constraint" and Firestore as having "automatic multi-region replication." Updated this to explain that each Realtime Database instance has a fixed regional location and Firestore supports both regional and multi-region locations.
- The Firestore data model example said it used collections and subcollections, but the example only used top-level collections and documents. Changed the wording to "collections and documents."
- The guidance recommended Cloud Functions for larger migrations "to avoid timeout issues." Cloud Functions have fixed maximum invocation durations, while Cloud Run jobs are better suited for long-running retryable work. Replaced Cloud Functions with Cloud Run jobs.
- The Realtime Database URL placeholder used `YOUR_PROJECT_ID`, which is not always the database name. Updated the placeholder to `YOUR_DATABASE_NAME`.
- The Realtime Database security rule checked `data.child('authorId')`, which is the existing value and fails or behaves incorrectly for creates. Updated it to check `newData.child('authorId')`.
- The Firestore security rule checked `resource.data.authorId`, which refers to the existing document state and is incorrect for creates. Updated it to check `request.resource.data.authorId`.
- The verification command was labeled as counting Firestore documents, but `gcloud firestore export` exports documents to Cloud Storage. Updated the comment to describe it as an export for backup/comparison.

## Review Notes
The migration script is reasonable for small-to-medium datasets, but large production migrations should also consider streaming reads, BulkWriter or parallelized individual writes, resumability, document size limits, and regional database URL formats such as `firebasedatabase.app` for non-legacy Realtime Database instances.
