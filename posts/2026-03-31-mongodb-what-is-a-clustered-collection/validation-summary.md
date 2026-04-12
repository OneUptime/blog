# Validation Summary: What Is a Clustered Collection in MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (5.3+)
- Clustered Collections
- Clustered Indexes
- TTL (Time-To-Live) expiration
- Time Series data patterns
- WiredTiger storage engine

## Sources Consulted
- MongoDB Clustered Collections documentation: https://www.mongodb.com/docs/manual/core/clustered-collections/
- MongoDB db.createCollection() reference: https://www.mongodb.com/docs/manual/reference/method/db.createCollection/
- MongoDB Time Series Collections documentation: https://www.mongodb.com/docs/manual/core/timeseries-collections/
- MongoDB TTL / Expire Data documentation: https://www.mongodb.com/docs/manual/tutorial/expire-data/
- MongoDB db.getCollectionInfos() reference: https://www.mongodb.com/docs/manual/reference/method/db.getCollectionInfos/

## Issues Found
No technical issues found.

All claims verified:
- Clustered collections introduced in MongoDB 5.3 — confirmed.
- Clustered index key must be `{ _id: 1 }` — confirmed.
- No separate `_id` index exists for clustered collections — confirmed.
- `expireAfterSeconds` can be set directly in `db.createCollection()` alongside `clusteredIndex` — confirmed.
- `db.createCollection()` syntax with `clusteredIndex` object (key, unique, name) is correct — confirmed.
- `db.getCollectionInfos()` returns clustered index info in options — confirmed.
- Clustered collections cannot be capped collections — confirmed.
- Time series collections introduced in MongoDB 5.0 — confirmed.

## Review Notes
- The post correctly notes that for TTL to work on clustered collections, the `_id` field must contain date values, though it could be more explicit that only BSON Date types are supported for TTL expiration (not arbitrary values).
- The `name` field in the `clusteredIndex` option is optional; the post includes it in the first example but omits it in the TTL example, which is fine as both forms are valid.
