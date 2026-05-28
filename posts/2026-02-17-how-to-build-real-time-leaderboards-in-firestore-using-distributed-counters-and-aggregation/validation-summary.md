# Validation Summary: How to Build Real-Time Leaderboards in Firestore

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Firestore
- Firebase JavaScript SDK
- Firestore distributed counters
- Firestore aggregation queries
- Firestore real-time listeners
- Firestore Security Rules
- Cloud Functions for Firebase scheduled functions

## Sources Consulted
- Firebase Firestore best practices: https://firebase.google.com/docs/firestore/best-practices
- Firebase Firestore distributed counters: https://firebase.google.com/docs/firestore/solutions/counters
- Firebase Firestore aggregation queries: https://firebase.google.com/docs/firestore/query-data/aggregation-queries
- Firebase Firestore real-time listeners: https://firebase.google.com/docs/firestore/query-data/listen
- Firebase Firestore query cursors and pagination: https://firebase.google.com/docs/firestore/query-data/query-cursors
- Firebase Firestore add/update data and increment transforms: https://firebase.google.com/docs/firestore/manage-data/add-data
- Firebase Firestore Security Rules field control: https://firebase.google.com/docs/firestore/security/rules-fields
- Firebase Security Rules data validation: https://firebase.google.com/docs/rules/data-validation
- Cloud Functions for Firebase scheduled functions: https://firebase.google.com/docs/functions/schedule-functions

## Issues Found
- The post stated a fixed Firestore document write limit of about 1 write per second. Current Firestore best-practices documentation says a single document cannot be updated at an unlimited rate and the exact maximum depends on workload. Updated the wording accordingly.
- The distributed counter section claimed 10 shards allow 10 concurrent writes per second. The official distributed counter guidance describes linear throughput improvement relative to a single-document counter. Updated the text to say 10 shards provide roughly 10x the write throughput.
- The distributed counter code omitted required Firestore SDK imports. Added imports for `collection`, `doc`, `getDocs`, `increment`, `updateDoc`, and `writeBatch`.
- The player-rank example used `getDoc()` and `doc()` without importing them. Added the missing imports.
- The scheduled function example used the older `functions.pubsub.schedule()` style. Updated it to the current `firebase-functions/v2/scheduler` `onSchedule()` API and added `admin.initializeApp()`.
- The rank-bucketing example used Firestore `offset()`, which official best practices advise against because skipped documents are still read internally. Replaced it with cursor-based scanning using `startAfter()`.
- The security rules snippet claimed score updates were constrained "within bounds" but only restricted changed field names. Added create and update validation that enforces owner-only writes, initial score values, allowed fields, bounded score increments, one-game increments, and server timestamp usage.
- The Firestore Security Rules snippet was labeled as JavaScript. Changed the code fence language to `firestore`.

## Review Notes
- The examples assume a configured `db` instance. That is acceptable for a focused article, but a future revision could add a short setup snippet if readers need a complete runnable sample.
- Absolute rank calculation with `count()` is technically correct, but Firestore aggregation latency scales with index entries scanned, so cached rank buckets or write-time aggregation remain important for very large leaderboards.
