# Validation Summary: How to Create MongoDB Bucket Patterns

## Status
validated

## Post Type
Technical tutorial / implementation guide

## Technologies Covered
- MongoDB bucket pattern
- MongoDB time series data modeling
- MongoDB Node.js driver
- MongoDB update operators and upserts
- MongoDB aggregation pipeline
- MongoDB indexes and TTL indexes
- JavaScript

## Sources Consulted
- MongoDB Manual: Group Data with the Bucket Pattern: https://www.mongodb.com/docs/manual/data-modeling/design-patterns/group-data/bucket-pattern/
- MongoDB Node.js Driver: Update Documents: https://www.mongodb.com/docs/drivers/node/current/crud/update/
- MongoDB Manual: db.collection.updateOne(): https://www.mongodb.com/docs/manual/reference/method/db.collection.updateOne/
- MongoDB Manual: $setOnInsert update operator: https://www.mongodb.com/docs/manual/reference/operator/update/setOnInsert/
- MongoDB Manual: $min update operator: https://www.mongodb.com/docs/manual/reference/operator/update/min/
- MongoDB Manual: $max update operator: https://www.mongodb.com/docs/manual/reference/operator/update/max/
- MongoDB Manual: Create Indexes: https://www.mongodb.com/docs/manual/core/indexes/create-index/
- MongoDB Manual: TTL Indexes: https://www.mongodb.com/docs/manual/core/index-ttl/
- MongoDB Manual: Documents and BSON document size limit: https://www.mongodb.com/docs/manual/core/document/
- MongoDB Manual: Time Series Collections: https://www.mongodb.com/docs/manual/core/timeseries-collections/
- MongoDB Manual: $unwind aggregation stage: https://www.mongodb.com/docs/manual/reference/operator/aggregation/unwind/

## Issues Found
- The time-based bucket example showed `aggregates.avg_temp` as a stored pre-computed aggregate, but the insert function only maintained `count` and `aggregates.sum_temp`. Added an `updateTemperatureAverage` helper and called it after the upsert so the stored average is actually maintained.
- The count-based bucket schema comment said each bucket holds exactly 100 requests. A partially filled current bucket holds fewer than 100 requests, so the comment now says "up to 100 requests."
- The count-based insert filter selected buckets only by `is_full: false`. Added `count: { $lt: BUCKET_SIZE }` so the write filter also enforces the configured bucket capacity before pushing a new request.
- The hybrid bucket update document had two `$max` keys in the same JavaScript object. JavaScript object literals cannot preserve both duplicate keys, so the first `$max` for `bucket_end` would be overwritten by the second. Combined both updated fields into a single `$max` object.
- The complete IoT implementation updated `stats.avg` only when an existing bucket was updated, leaving a newly upserted bucket without an average. Changed it to update the average after every insert.

## Review Notes
MongoDB's native time series collections are available and are usually the first option to consider for new time series workloads. The manual bucket pattern remains technically valid when an application needs explicit document shapes, custom bucket closing rules, or custom pre-computed aggregates.
