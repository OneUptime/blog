# Validation Summary: How the MongoDB Oplog Works for Replication

## Status
validated

## Post Type
Technical explainer / Reference

## Technologies Covered
- MongoDB (oplog internals, replication)
- MongoDB Replica Sets
- MongoDB shell (`mongosh`) commands and helpers

## Sources Consulted
- MongoDB Manual: Replica Set Oplog — https://www.mongodb.com/docs/manual/core/replica-set-oplog/
- MongoDB Manual: Replication — https://www.mongodb.com/docs/manual/replication/
- MongoDB Manual: replSetGetStatus — https://www.mongodb.com/docs/manual/reference/command/replSetGetStatus/
- MongoDB Manual: Server Parameters (replWriterThreadCount) — https://www.mongodb.com/docs/manual/reference/parameters/
- MongoDB Manual: rs.printReplicationInfo() — https://www.mongodb.com/docs/manual/reference/method/rs.printReplicationInfo/

## Issues Found

1. **Removed `h` field from sample oplog entry.** The `h` (hash) field was deprecated in MongoDB 4.0 (always set to 0) and removed entirely in MongoDB 4.2+. Since the post does not target a legacy version, including this field in the sample oplog entry is misleading. Removed it from the example.

2. **Incorrect parallelization granularity in "How Secondaries Apply the Oplog" section.** The original text stated: "The secondary applies operations sequentially within a namespace but can parallelize operations across different namespaces." This is incorrect for MongoDB 3.6+. The oplog applier parallelizes at the document level — operations on different documents, even within the same collection, can be applied concurrently. Only operations on the same document are serialized. This contradicted the post's own "Parallel Oplog Application" section, which correctly described document-level parallelism. Fixed the earlier section to be consistent and accurate.

## Review Notes
- `rs.printReplicationInfo()` and `rs.printSecondaryReplicationInfo()` were deprecated in MongoDB 6.1 in favor of `db.getReplicationInfo()` and `db.printSecondaryReplicationInfo()`. They still function but may be removed in a future release. Not fixed since the methods still work and the post does not target a specific version.
- Modern oplog entries (MongoDB 4.2+) also include a `wall` field (wall clock time as an ISODate). The sample entry omits this, but the post does not claim to show all fields, so this is acceptable.
- The post does not specify which MongoDB version it targets. Adding a version note (e.g., "applies to MongoDB 5.0+") would help readers gauge applicability.
