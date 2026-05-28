# Validation Summary: How to Handle Firestore 10-Write-Per-Second Document Limit

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google Cloud Firestore
- Firebase Web SDK for Firestore
- Firebase Admin SDK for Node.js
- Cloud Functions for Firebase
- Google Cloud Pub/Sub
- Google Cloud Monitoring
- gcloud CLI

## Sources Consulted
- Firebase Firestore distributed counters: https://firebase.google.com/docs/firestore/solutions/counters
- Firestore best practices for updates to a single document: https://cloud.google.com/firestore/native/docs/best-practices#updates_to_a_single_document
- Firestore reads and writes at scale: https://cloud.google.com/firestore/native/docs/understand-reads-writes-scale
- Firebase Firestore add data and modular Web SDK examples: https://firebase.google.com/docs/firestore/manage-data/add-data
- Cloud Functions for Firebase scheduled functions: https://firebase.google.com/docs/functions/schedule-functions
- Cloud Functions for Firebase Pub/Sub namespace reference: https://firebase.google.com/docs/reference/functions/firebase-functions.pubsub
- Cloud Functions for Firebase scaling and maxInstances: https://firebase.google.com/docs/functions/manage-functions#limit_the_maximum_number_of_instances_for_a_function
- Google Cloud Pub/Sub quotas and limits: https://cloud.google.com/pubsub/quotas
- Firestore monitoring usage: https://firebase.google.com/docs/firestore/monitor-usage
- Google Cloud Monitoring Firestore metrics reference: https://cloud.google.com/monitoring/api/metrics_gcp_d_h#firestore

## Issues Found
- The title and opening described a fixed "10-write-per-second" or "1 write per second" per-document limit. Current Firestore guidance says the exact maximum update rate for a single document depends on workload, contention, and indexes. Updated the title and wording to describe workload-dependent single-document write contention.
- The explanation said a document lives on a single node because Firestore distributes data by document paths. Firestore writes update document and index rows atomically and commit across a quorum of replicas. Updated the explanation to match the official write path.
- The post claimed 10,000 simultaneous writes to different documents in a collection are no problem. Firestore supports high concurrent writes, but collection hotspots can still occur with patterns such as sequentially indexed fields. Updated the claim to be less absolute.
- The distributed counter comments implied each shard has a fixed 1 write/sec limit and that 50 shards necessarily support 50 writes/sec. Updated this to the officially supported principle that write throughput increases with shard count without guaranteeing an exact rate.
- The client-side batching example used `collection`, `doc`, and `setDoc` without importing them. Added the missing Firebase Web SDK modular imports.
- The Pub/Sub section claimed Pub/Sub can handle millions of messages per second. Official quotas are expressed mainly in regional throughput units and are quota-dependent. Updated the wording to "very high throughput, subject to project and regional quotas."
- The Cloud Function subscriber example said Cloud Functions has built-in rate limiting through concurrency settings. That is misleading unless runtime scaling controls are configured. Updated the example to use `runWith({ maxInstances: 10 })` and clarified that `maxInstances` and the data model must be tuned to control Firestore load.
- The Cloud Monitoring metric command queried only `firestore.googleapis.com/document/write_count`, which may miss the newer database-scoped `document/write_ops_count` metric. Updated the filter to list Firestore document write metrics with a `starts_with` filter.

## Review Notes
The Cloud Functions examples use the 1st gen `firebase-functions` API, which is still documented, while current Firebase docs prefer 2nd gen handlers such as `onSchedule` and `onMessagePublished` for new work. The client-side batching pattern is valid, but production code should also account for Firestore's 1 MiB document size limit and index growth when storing arrays of events.
