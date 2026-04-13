# Validation Summary: How to Build a Webhook Delivery Queue with MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (schema validation, `findOneAndUpdate`, aggregation pipeline)
- Node.js (MongoDB Node.js driver)
- Webhook delivery patterns (retry logic, exponential backoff, dead letter queue)

## Sources Consulted
- MongoDB `$jsonSchema` validation documentation: https://www.mongodb.com/docs/manual/reference/operator/query/jsonSchema/
- MongoDB `bsonType` reference (including the `"number"` alias): https://www.mongodb.com/docs/manual/reference/bson-types/
- MongoDB `findOneAndUpdate` documentation: https://www.mongodb.com/docs/manual/reference/method/db.collection.findOneAndUpdate/
- MongoDB `$out` aggregation stage documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/out/
- MongoDB `$merge` aggregation stage documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/merge/
- MongoDB partial indexes documentation: https://www.mongodb.com/docs/manual/core/index-partial/

## Issues Found

1. **Schema enum missing `"processing"` status**: The `$jsonSchema` validator defined `status` with `enum: ["pending", "delivered", "failed"]`, but the claiming code in the "Claiming and Delivering Events" section sets `status: "processing"`. MongoDB would reject this update because `"processing"` was not in the allowed enum values. Fixed by adding `"processing"` to the enum list.

2. **`bsonType: "int"` incompatible with JavaScript numbers**: The schema used `bsonType: "int"` for `attempts` and `maxAttempts`, but plain JavaScript numbers (e.g., `0`, `5`) in both `mongosh` and the Node.js driver are stored as BSON doubles, not BSON int32. The `insertOne` example would fail schema validation. Fixed by changing `bsonType: "int"` to `bsonType: "number"`, which is a MongoDB alias that matches int, long, double, and decimal.

3. **`$out` replaced with `$merge` for Dead Letter Queue**: The `$out` aggregation stage replaces the entire target collection each time it runs, which means previously stored dead letter entries would be lost on subsequent runs. Changed to `$merge` with `whenMatched: "replace"` and `whenNotMatched: "insert"`, which appends new entries and updates existing ones without destroying the collection. Also changed "Move" to "Copy" in the description since the aggregation does not remove documents from the source collection.

## Review Notes
- The `$merge` stage requires MongoDB 4.2+. This is not a concern for modern deployments but could be noted for readers on very old versions.
- The dead letter aggregation copies failed events but does not remove them from `webhook_events`. A follow-up `deleteMany({ status: "failed" })` would be needed to truly "move" them. This is a design choice the author may want to address in a future revision.
- The backoff logic uses `attempts` before the `$inc` operation, meaning `maxAttempts: 5` actually allows 6 total delivery attempts (1 initial + 5 retries). This is a common pattern but the naming could be clearer (e.g., `maxRetries`). Not changed as it is a design choice, not a technical error.
