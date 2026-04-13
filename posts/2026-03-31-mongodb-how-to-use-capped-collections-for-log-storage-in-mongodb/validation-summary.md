# Validation Summary: How to Use Capped Collections for Log Storage in MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (capped collections, tailable cursors, `$natural` sort, indexing)
- Node.js MongoDB driver (MongoClient, insertOne, find with tailable options)
- BSON document format and sizing

## Sources Consulted
- MongoDB official documentation on capped collections: https://www.mongodb.com/docs/manual/core/capped-collections/
- MongoDB Node.js driver documentation and FindOptions interface: https://www.mongodb.com/docs/drivers/node/current/
- MongoDB `$natural` sort documentation: https://www.mongodb.com/docs/manual/reference/operator/meta/natural/
- MongoDB `db.createCollection()` reference: https://www.mongodb.com/docs/manual/reference/method/db.createCollection/
- BSON specification for document size estimation: https://bsonspec.org/

## Issues Found
- **Unrealistic per-document size estimate**: The comment on the first `createCollection` example stated "~50 bytes per log entry" with a `max` of 200,000 documents. Based on BSON encoding overhead (document header, `_id` ObjectId, Date, string field names, string values, and null terminators), a minimal log document matching the schema shown in the post is approximately 150 bytes, not 50. This 3x underestimate could lead readers to significantly under-provision their capped collections. **Fix**: Changed the comment to "~150 bytes per log entry, keep ~65k entries" and adjusted the `max` parameter from 200,000 to 65,000 to be consistent with the 10 MB size limit.

## Review Notes
- The `$natural` ordering is not guaranteed to be consistent across replica set members. The blog does not discuss replica sets so this is not an error, but readers deploying to replica sets should be aware.
- Tailable cursors (as used in the "Streaming Logs in Real Time" section) do not support `.sort()`, `.limit()`, or `.skip()` chaining. The blog code does not attempt this, so no fix is needed, but it is worth noting for readers who might extend the example.
- The high-volume example (10k entries/sec, ~3.6 GB) uses a per-entry estimate of 100 bytes, which is more realistic than the 50-byte estimate in the first example but still on the low end for documents with metadata subdocuments.
- The Node.js usage section uses top-level `await`, which requires ES modules or an async wrapper. This is standard practice in example code and does not need a fix.
