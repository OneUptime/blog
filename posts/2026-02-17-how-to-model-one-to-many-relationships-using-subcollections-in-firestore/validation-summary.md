# Validation Summary: How to Model One-to-Many Relationships Using Subcollections in Firestore

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Firestore
- Firebase Admin SDK for Node.js
- Google Cloud Firestore Python client
- Firebase CLI
- Google Cloud CLI
- NoSQL data modeling

## Sources Consulted
- Cloud Firestore data model: https://firebase.google.com/docs/firestore/data-model
- Cloud Firestore queries and Python filters: https://cloud.google.com/firestore/docs/query-data/queries
- Cloud Firestore collection group indexes: https://firebase.google.com/docs/firestore/query-data/index-overview
- gcloud firestore indexes composite create reference: https://cloud.google.com/sdk/gcloud/reference/firestore/indexes/composite/create
- Cloud Firestore delete data: https://firebase.google.com/docs/firestore/manage-data/delete-data
- Firebase CLI reference: https://firebase.google.com/docs/cli
- Cloud Firestore query cursors and pagination: https://firebase.google.com/docs/firestore/query-data/query-cursors
- Cloud Firestore quotas and limits: https://firebase.google.com/docs/firestore/quotas

## Issues Found
- The Python example used the older positional `where('status', '==', status_filter)` form. Updated it to import `FieldFilter` and call `where(filter=FieldFilter(...))`, matching current official Python Firestore documentation.
- The Python example comment and variable name said "pending orders" while the code filtered for `shipped`. Updated them to "shipped orders" to match the actual query.
- The `gcloud firestore indexes composite create` command used uppercase enum values for `--query-scope` and `order`. Updated them to the lowercase values shown in the current gcloud reference: `collection-group`, `ascending`, and `descending`.
- The deletion example used one write batch for all orders plus the parent document, which would fail for larger subcollections because Firestore write batches are limited. Updated the example to delete orders in batches and then delete the parent document separately.

## Review Notes
The remaining examples and claims are consistent with Firestore documentation: subcollection paths alternate collections and documents, subcollections are not returned with parent document reads, deleting a parent document does not automatically delete subcollection documents, collection group queries can query same-named subcollections across parents, embedded arrays count toward the 1 MiB document limit, and cursor-based pagination using the last document snapshot is documented.
