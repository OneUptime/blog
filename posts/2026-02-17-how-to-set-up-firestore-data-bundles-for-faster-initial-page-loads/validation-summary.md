# Validation Summary: How to Set Up Firestore Data Bundles for Faster Initial Page Loads

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Firestore
- Firebase JavaScript SDK
- Firebase Admin SDK for Node.js
- Cloud Functions for Firebase
- Cloud Storage
- Firebase Hosting/CDN caching concepts

## Sources Consulted
- Firebase JavaScript SDK Firestore API reference: https://firebase.google.com/docs/reference/js/firestore_
- Cloud Firestore "Get data" documentation: https://firebase.google.com/docs/firestore/query-data/get-data
- Google Cloud Firestore Node.js BundleBuilder reference: https://cloud.google.com/nodejs/docs/reference/firestore/latest/firestore/bundlebuilder
- Google Cloud Firestore Node.js Firestore class reference: https://cloud.google.com/nodejs/docs/reference/firestore/latest/firestore/firestore
- Firebase Extensions Firestore Bundle Builder documentation: https://firebase.google.com/docs/extensions/official/firestore-bundle-builder
- Cloud Functions for Firebase scheduled functions documentation: https://firebase.google.com/docs/functions/1st-gen/schedule-functions-1st
- Cloud Functions for Firebase pubsub namespace reference: https://firebase.google.com/docs/reference/functions/firebase-functions.pubsub

## Issues Found
- The post said matching queries would be served from the local cache and used `getDocs()` on a named query. The modular Firebase SDK documents that default get calls attempt to fetch current server data when possible, while `getDocsFromCache()` explicitly reads query results from cache. Updated the explanation and code examples to use `getDocsFromCache()` for bundled named-query reads.
- The "Loading a Bundle Client-Side" snippet imported `namedQuery` and `getDocs` even though that snippet only used `loadBundle`. Removed the unused imports to keep the example accurate.

## Review Notes
- The scheduled function example uses the 1st gen `functions.pubsub.schedule()` API, which is still documented and supported. Firebase's documentation also points to 2nd gen scheduled functions as the newer option with improved features and performance.
- The bundle-generation examples use `db.bundle()`, `BundleBuilder.add(queryName, querySnapshot)`, and `BundleBuilder.build()` consistently with the current Node.js Firestore reference.
