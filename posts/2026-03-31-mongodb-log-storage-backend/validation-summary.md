# Validation Summary: How to Use MongoDB as a Log Storage Backend

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (document model, schema validation, indexing, TTL indexes)
- MongoDB Node.js Driver
- mongosh (MongoDB Shell)

## Sources Consulted
- MongoDB $jsonSchema validation: https://www.mongodb.com/docs/manual/reference/operator/query/jsonSchema/
- MongoDB TTL Indexes: https://www.mongodb.com/docs/manual/core/index-ttl/
- MongoDB Text Indexes: https://www.mongodb.com/docs/manual/core/index-text/
- MongoDB Node.js Driver API (MongoClient, Collection): https://www.mongodb.com/docs/drivers/node/current/
- MongoDB createCollection with validation: https://www.mongodb.com/docs/manual/reference/method/db.createCollection/
- MongoDB Compound Indexes: https://www.mongodb.com/docs/manual/core/index-compound/

## Issues Found
No technical issues found.

## Review Notes
- The TTL expireAfterSeconds value (2,592,000) correctly equals 30 days.
- The TTL index is correctly defined as a single-field index on `timestamp`, which is required for TTL functionality. The compound indexes on `{ service: 1, timestamp: -1 }` and `{ level: 1, timestamp: -1 }` are separate and do not conflict with the TTL index.
- The `$jsonSchema` validator correctly uses `enum` without a `bsonType` for the `level` field, which is valid — the enum values implicitly constrain the type.
- The top-level `await` in the usage example assumes an async context, which is standard for example code snippets.
- WiredTiger compression is enabled by default (using snappy); the 50-70% storage reduction claim is reasonable, especially with zstd or zlib compression.
