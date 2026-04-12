# Validation Summary: How to Implement Referential Integrity in MongoDB Applications

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (schema validation, change streams, aggregation pipeline, partial indexes)
- JavaScript / Node.js (MongoDB Node.js driver)

## Sources Consulted
- MongoDB Partial Indexes documentation: https://www.mongodb.com/docs/manual/core/index-partial/
- MongoDB Schema Validation ($jsonSchema): https://www.mongodb.com/docs/manual/core/schema-validation/
- MongoDB Change Streams documentation: https://www.mongodb.com/docs/manual/changeStreams/
- MongoDB $lookup aggregation stage: https://www.mongodb.com/docs/manual/reference/operator/aggregation/lookup/
- MongoDB collMod command: https://www.mongodb.com/docs/manual/reference/command/collMod/

## Issues Found
1. **Unsupported `$ne` operator in `partialFilterExpression`** (Technique 4): The original code used `{ deleted: { $ne: true } }` as a `partialFilterExpression` for a partial index. MongoDB's `partialFilterExpression` only supports a limited set of operators: equality (`$eq`), `$exists: true`, `$gt`, `$gte`, `$lt`, `$lte`, `$type`, `$and` (top-level only), and `$in` (from MongoDB 5.0+). The `$ne` operator is not supported and would cause an error at index creation time. Fixed by changing to an equality expression `{ deleted: false }` and adding guidance to set `deleted: false` on document creation so the partial index covers active documents.

## Review Notes
- Technique 2 (application-layer pre-checks) has an inherent TOCTOU race condition — the referenced document could be deleted between the existence check and the insert. The post doesn't claim this is bulletproof, but readers implementing critical integrity guarantees should consider wrapping the check-and-insert in a multi-document transaction (available since MongoDB 4.0 for replica sets, 4.2 for sharded clusters).
- The partial index fix using `{ deleted: false }` requires that documents are created with an explicit `deleted: false` field. Documents without the `deleted` field at all will not be included in the index.
- All other code examples, API usage, and technical explanations are accurate and use current MongoDB APIs.
