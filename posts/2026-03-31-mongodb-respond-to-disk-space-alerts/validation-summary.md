# Validation Summary: How to Respond to MongoDB Disk Space Alerts

## Status
validated

## Post Type
Tutorial / Operations Guide

## Technologies Covered
- MongoDB (WiredTiger storage engine)
- mongosh (MongoDB Shell)
- MongoDB Atlas
- Atlas CLI (`atlas`)

## Sources Consulted
- [MongoDB `deleteMany()` documentation](https://www.mongodb.com/docs/manual/reference/method/db.collection.deleteMany/)
- [MongoDB `compact` command documentation](https://www.mongodb.com/docs/manual/reference/command/compact/)
- [MongoDB `collStats` / `db.collection.stats()` documentation](https://www.mongodb.com/docs/manual/reference/method/db.collection.stats/)
- [MongoDB `listDatabases` command documentation](https://www.mongodb.com/docs/manual/reference/command/listDatabases/)
- [Atlas CLI `atlas alerts settings create` documentation](https://www.mongodb.com/docs/atlas/cli/current/command/atlas-alerts-settings-create/)
- [Atlas CLI `atlas clusters update` documentation](https://www.mongodb.com/docs/atlas/cli/current/command/atlas-clusters-update/)
- [MongoDB Atlas Alert Event Types](https://www.mongodb.com/docs/atlas/reference/atlas-alert-event-types/)
- [MongoDB WiredTiger block-manager statistics](https://www.mongodb.com/docs/manual/reference/command/collStats/#wiredtiger)

## Issues Found

### 1. Bloat ratio calculation was incorrect (Step 2)
**What was wrong:** The formula `1 - (stats.size / stats.storageSize)` compared uncompressed data size (`size`) against allocated storage (`storageSize`). With WiredTiger compression enabled (the default), `size` is typically larger than `storageSize`, producing a negative ratio that would never trigger the 30-40% threshold mentioned.
**What was changed:** Replaced with a formula using WiredTiger block-manager's `file bytes available for reuse` divided by `storageSize`, which directly measures reclaimable space.

### 2. `compact` described as blocking (Step 3)
**What was wrong:** The post stated "`compact` is a blocking operation" and advised taking secondaries out of rotation. Since MongoDB 4.4, `compact` does not block read/write operations. Since MongoDB 6.1, secondaries can continue replicating during compaction.
**What was changed:** Updated to explain the non-blocking behavior in modern MongoDB versions, with a note that older versions still require the rolling approach.

### 3. `deleteMany()` used with unsupported `limit` option (Step 4)
**What was wrong:** `db.events.deleteMany(filter, { limit: 10000 })` passes a `limit` option that `deleteMany()` does not support. The option is silently ignored, causing all matching documents to be deleted at once — defeating the intended batching behavior.
**What was changed:** Replaced with the correct batch-delete pattern: use `find().limit(batchSize).toArray()` to select a batch of `_id` values, then `deleteMany({ _id: { $in: ids } })` to delete only that batch, looping until no documents remain.

### 4. Atlas CLI alerts command used wrong flags and event type (Step 6)
**What was wrong:** The command used `--threshold 80` (non-existent flag; correct flag is `--metricThreshold`) and `--event DISK_AUTO_SCALE_MAX_DISK_SIZE_FAIL` (an event for auto-scaling failures, not for disk usage percentage alerts).
**What was changed:** Updated to use `--event OUTSIDE_METRIC_THRESHOLD` with `--metricName DISK_PARTITION_SPACE_USED_DATA`, `--metricOperator GREATER_THAN`, `--metricThreshold 80`, and `--metricUnits RAW`, which correctly creates a disk usage percentage alert.

## Review Notes
- `db.collection.stats()` is deprecated starting in MongoDB 6.0 in favor of `$collStats` aggregation stage, but still works. The post could mention the newer approach in a future update.
- The `listDatabases` command usage and `atlas clusters update --diskSizeGB` command are correct.
- The `getCollectionNames()` and `getIndexes()` usage is correct.
