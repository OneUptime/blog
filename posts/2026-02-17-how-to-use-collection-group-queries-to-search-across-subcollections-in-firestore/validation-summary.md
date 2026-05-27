# Validation Summary: How to Use Collection Group Queries to Search Across Subcollections in Firestore

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Firestore
- Firebase JavaScript SDK
- Firestore collection group queries
- Firestore security rules
- Firestore composite indexes
- Firebase CLI
- Google Cloud CLI

## Sources Consulted
- Firebase documentation: Perform simple and compound queries in Cloud Firestore - https://firebase.google.com/docs/firestore/query-data/queries
- Firebase documentation: Index types in Cloud Firestore - https://firebase.google.com/docs/firestore/query-data/index-overview
- Firebase documentation: Manage indexes in Cloud Firestore - https://firebase.google.com/docs/firestore/query-data/indexing
- Firebase documentation: Cloud Firestore Index Definition Reference - https://firebase.google.com/docs/reference/firestore/indexes
- Firebase documentation: Securely query data with Cloud Firestore Security Rules - https://firebase.google.com/docs/firestore/security/rules-query
- Firebase documentation: Order and limit data with Cloud Firestore - https://firebase.google.com/docs/firestore/query-data/order-limit-data
- Firebase documentation: Query with range and inequality filters on multiple fields - https://firebase.google.com/docs/firestore/query-data/multiple-range-fields
- Firebase JavaScript API reference: CollectionReference - https://firebase.google.com/docs/reference/js/firestore_.collectionreference
- Firebase JavaScript API reference: DocumentReference - https://firebase.google.com/docs/reference/js/firestore_.documentreference
- Google Cloud SDK reference: gcloud firestore indexes composite create - https://cloud.google.com/sdk/gcloud/reference/firestore/indexes/composite/create

## Issues Found
- The post stated that collection group queries always require a specific index. Updated this to clarify that filtered or ordered collection group queries require an index with collection group scope; unfiltered and unordered collection group queries do not require an additional index definition.
- The Firebase CLI deployment example used `firebase deploy --only firestore:indexes`. Updated it to the officially documented `firebase deploy --only firestore` form and adjusted the comment to note that this deploys Firestore indexes and rules.
- The `gcloud firestore indexes composite create` example used `--query-scope=COLLECTION_GROUP`, which is the index definition enum style, not the documented gcloud flag value. Updated it to `--query-scope=collection-group`.
- The parent-reference helper used `getDoc(roomRef)` without importing `getDoc` and assumed `doc.ref.parent.parent` is always non-null. Added the missing import and made the helper usage null-safe for the case where a matching collection exists at the database root.
- The performance section said collection group queries "scan across" matching collections and described unfiltered queries as slow and expensive. Updated the wording to reflect that Firestore uses indexes and that large unfiltered result sets are expensive because they read every returned document.

## Review Notes
The examples use the current modular Firebase JavaScript SDK APIs. Several snippets still assume an existing initialized `db` value, which is standard for short Firestore examples but should be called out if this post is later expanded into a fully standalone tutorial.
