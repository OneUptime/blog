# Validation Summary: How to Model an Event Logging System in MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (document schema design, indexing, TTL indexes, aggregation pipeline)
- JavaScript / Node.js (driver usage patterns for insertOne, insertMany, find, aggregate)
- MongoDB Shell (mongosh) helpers (ObjectId, ISODate)

## Sources Consulted
- MongoDB ObjectId documentation: https://www.mongodb.com/docs/manual/reference/method/ObjectId/
- MongoDB TTL Indexes documentation: https://www.mongodb.com/docs/manual/core/index-ttl/
- MongoDB createIndex documentation: https://www.mongodb.com/docs/manual/reference/method/db.collection.createIndex/
- MongoDB insertMany documentation: https://www.mongodb.com/docs/manual/reference/method/db.collection.insertMany/
- MongoDB Aggregation Pipeline documentation: https://www.mongodb.com/docs/manual/core/aggregation-pipeline/
- MongoDB Date Expression Operators ($year, $month, $dayOfMonth, $hour): https://www.mongodb.com/docs/manual/reference/operator/aggregation/#date-expression-operators

## Issues Found

1. **Invalid ObjectId format**: `ObjectId("e001")` is not a valid ObjectId. MongoDB's `ObjectId()` constructor requires a 24-character hexadecimal string (representing 12 bytes). The value `"e001"` is only 4 characters and would throw an error. Changed to `ObjectId("65e8a1b2c3d4e5f6a7b8c9d0")`, which is a valid 24-character hex string.

2. **Incorrect sort in error-rate-by-hour aggregation**: The sort stage `{ $sort: { "_id.hour": 1 } }` only sorts by the hour component (0-23), which incorrectly interleaves hours from different calendar days when the 24-hour query window spans midnight. Changed to `{ $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1, "_id.hour": 1 } }` to produce correct chronological ordering across day boundaries.

## Review Notes
- The TTL index on `{ timestamp: 1 }` (90-day expiry) and the `expiresAt`-based TTL index are presented as alternatives. If a reader accidentally creates both, the timestamp-based TTL would delete all documents after 90 days regardless of severity, overriding the per-severity retention logic. The post does present them as separate approaches, but a reader could benefit from an explicit warning not to use both simultaneously.
- The `expireAfterSeconds: 7776000` value correctly equals 90 days (90 x 86400 = 7,776,000 seconds).
- The `critical: 2555` retention days (~7 years) is a reasonable value for compliance-sensitive critical events.
- All MongoDB aggregation operators, index patterns, and query syntax are correct and current.
- The compound index design follows MongoDB's recommended ESR (Equality, Sort, Range) pattern appropriately.
