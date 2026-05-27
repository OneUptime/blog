# Validation Summary: How to Perform Real-Time Listeners on Firestore Collections Using the

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Firestore in Native mode
- `@google-cloud/firestore` Node.js client library
- Node.js
- Firestore real-time listeners / snapshot listeners
- Firestore queries, indexes, IAM, and listener billing
- Cloud Run process shutdown behavior

## Sources Consulted
- Google Cloud Node.js Firestore client reference, `Firestore` class: https://cloud.google.com/nodejs/docs/reference/firestore/latest/firestore/firestore
- Google Cloud Node.js Firestore client reference, `Query` class and `onSnapshot`: https://cloud.google.com/nodejs/docs/reference/firestore/latest/firestore/query
- Firebase documentation, Get realtime updates with Cloud Firestore: https://firebase.google.com/docs/firestore/query-data/listen
- Firebase documentation, Manage indexes in Cloud Firestore: https://firebase.google.com/docs/firestore/query-data/indexing
- Firebase documentation, Understand Cloud Firestore billing: https://firebase.google.com/docs/firestore/pricing
- Google Cloud documentation, Firestore client libraries and server-client security model: https://cloud.google.com/firestore/native/docs/reference/libraries
- Google Cloud documentation, Security for Firestore server client libraries with IAM: https://cloud.google.com/firestore/native/docs/security/iam

## Issues Found
- The error-handling section said a permanent listener error could occur when the collection is deleted. Firestore collections do not have standalone metadata in this context; deleting documents results in changed query results rather than a deleted-collection listener error. I changed the example to database unavailability.
- The same section told readers to check Firestore Security Rules for permission-denied errors. The post uses the `@google-cloud/firestore` server client library, and official documentation says server client libraries bypass Firestore Security Rules and are secured with IAM. I changed the guidance to check the service account IAM permissions.
- The performance section simplified listener billing by saying every changed document in subsequent updates counts as a read. Official billing documentation distinguishes added/updated documents, documents removed from a query because they changed, and documents removed because they were deleted; it also notes index entry reads can be billed. I updated the bullet to reflect those details.

## Review Notes
The code examples use current `@google-cloud/firestore` APIs such as `new Firestore()`, `collection()`, `where()`, `orderBy()`, `limit()`, `doc()`, and `onSnapshot()`. The filtered queries may require composite indexes depending on existing index configuration, which the post correctly notes.
