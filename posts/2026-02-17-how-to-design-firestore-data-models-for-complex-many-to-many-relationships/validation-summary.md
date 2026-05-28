# Validation Summary: How to Design Firestore Data Models for Complex Many-to-Many Relationships

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google Cloud Firestore
- Firebase Admin SDK for Node.js
- Cloud Functions for Firebase
- JavaScript
- NoSQL data modeling

## Sources Consulted
- Firebase Firestore quotas and limits: https://firebase.google.com/docs/firestore/quotas
- Firebase Firestore transactions and batched writes: https://firebase.google.com/docs/firestore/manage-data/transactions
- Firebase Firestore query limitations: https://firebase.google.com/docs/firestore/query-data/queries
- Firebase Cloud Firestore triggers for Cloud Functions: https://firebase.google.com/docs/firestore/extend-with-functions
- Firebase JavaScript Firestore API reference: https://firebase.google.com/docs/reference/js/firestore_
- Google Cloud Firestore Node.js client reference: https://cloud.google.com/nodejs/docs/reference/firestore/latest/firestore/firestore.html

## Issues Found
- The array pattern section said querying becomes a single read, but the example still fetches related group documents after reading the user's `groupIds` array. Updated the wording to say reading relationship IDs is a single document read, while fetching details requires additional reads.
- The `array-contains` limitation was worded as one array field per query. Updated it to match current Firestore documentation: at most one `array-contains` clause per disjunction, and it cannot be combined with `array-contains-any` in the same disjunction.
- The Cloud Function batching example committed a `WriteBatch` inside a loop and then reused the same committed batch. Updated the example to create a new batch after each commit and use the documented 500-write batch limit.
- The Cloud Function example included an unused `collectionGroup('members')` query with an invalid-looking `__name__` range filter for the task. Removed it because the function correctly uses the user's `groups` subcollection to find the affected memberships.

## Review Notes
The examples use the Firebase Functions v1 `functions.firestore.document(...).onUpdate(...)` style, which is still documented. For future updates, consider adding explicit imports and initialization snippets if the post is meant to be copied into a standalone project.
