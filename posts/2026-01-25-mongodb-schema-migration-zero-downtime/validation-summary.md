# Validation Summary: How to Migrate MongoDB Schemas with Zero Downtime

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- MongoDB
- mongosh
- JavaScript
- MongoDB schema validation
- MongoDB bulk writes
- Zero-downtime database migration patterns

## Sources Consulted
- MongoDB Manual: db.collection.updateMany() - https://www.mongodb.com/docs/manual/reference/method/db.collection.updatemany/
- MongoDB Manual: db.collection.bulkWrite() - https://www.mongodb.com/docs/manual/reference/method/db.collection.bulkwrite/
- MongoDB Manual: Modify Schema Validation - https://www.mongodb.com/docs/manual/core/schema-validation/update-schema-validation/
- MongoDB Manual: Choose How to Handle Invalid Documents - https://www.mongodb.com/docs/manual/core/schema-validation/handle-invalid-documents/
- MongoDB Manual: $currentOp aggregation stage - https://www.mongodb.com/docs/manual/reference/operator/aggregation/currentop/
- MongoDB Manual: rs.status() - https://www.mongodb.com/docs/manual/reference/method/rs.status/
- MongoDB Manual: serverStatus command - https://www.mongodb.com/docs/manual/reference/command/serverstatus/

## Issues Found
- The cleanup and preferences backfill examples used `updateMany(..., { limit: 1000 })`. MongoDB's `updateMany()` options do not include `limit`, and `updateMany()` updates all documents matching the filter. Changed both examples to fetch a limited batch of `_id` values and apply those updates with `bulkWrite()`.
- The pre-migration checklist used `db.currentOp()`. MongoDB documentation recommends the `$currentOp` aggregation stage instead of `db.currentOp()` because the underlying `currentOp` command is deprecated as of MongoDB 6.2. Updated the example to use `db.getSiblingDB('admin').aggregate([{ $currentOp: ... }, { $match: ... }])`.
- The batch migration section said the migration runs "without locking the collection." MongoDB writes still take locks internally, so the wording was too broad. Changed it to "without taking an exclusive collection lock."

## Review Notes
The remaining examples are technically valid as mongosh-style JavaScript snippets that assume an existing `db` handle and appropriate privileges. The `_id` pagination examples avoid `skip`, but they assume `_id` values are comparable and suitable for ordered pagination in the target collection.
