# Validation Summary: How to Migrate from Regular Collections to Time Series in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Time Series Collections
- MongoDB Aggregation Framework (`$merge`, `$out`, `$collStats`)
- MongoDB `createCollection` with `timeseries` options
- MongoDB `renameCollection`
- MongoDB Node.js Driver (batched inserts)

## Sources Consulted
- MongoDB Time Series Collection Limitations: https://www.mongodb.com/docs/manual/core/timeseries/timeseries-limitations/
- MongoDB `$merge` Aggregation Stage: https://www.mongodb.com/docs/manual/reference/operator/aggregation/merge/
- MongoDB `renameCollection` Command: https://www.mongodb.com/docs/manual/reference/command/renamecollection/
- MongoDB `db.collection.renameCollection()`: https://www.mongodb.com/docs/manual/reference/method/db.collection.renamecollection/
- MongoDB Migrate Data into a Time Series Collection: https://www.mongodb.com/docs/manual/core/timeseries/timeseries-migrate-data-into-timeseries-collection/
- MongoDB `db.createCollection()`: https://www.mongodb.com/docs/manual/reference/method/db.createcollection/
- MongoDB Set Granularity for Time Series Data: https://www.mongodb.com/docs/manual/core/timeseries/timeseries-granularity/
- MongoDB TTL for Time Series Collections: https://www.mongodb.com/docs/manual/core/timeseries/timeseries-automatic-removal/
- MongoDB `$collStats` Aggregation Stage: https://www.mongodb.com/docs/manual/reference/operator/aggregation/collstats/
- MongoDB `db.collection.stats()` (deprecated): https://www.mongodb.com/docs/manual/reference/method/db.collection.stats/

## Issues Found

### Issue 1 (Critical): `$merge` cannot write to time series collections
- **What was wrong:** Step 3 used `$merge` to write transformed documents into the time series collection `metrics_ts`. MongoDB explicitly prohibits using `$merge` to output to a time series collection — this would fail at runtime.
- **What was changed:** Removed the `$merge` aggregation pipeline example entirely. Made the batched `insertMany` approach the primary (and only) migration method, which is the correct approach recommended by MongoDB documentation.
- **Why:** The `$merge` limitation is documented in the MongoDB time series collection limitations page. The batched `insertMany` approach works correctly across all MongoDB versions that support time series collections (5.0+).

### Issue 2 (Critical): `renameCollection` cannot be used on time series collections
- **What was wrong:** Step 6 used `db.metrics_ts.renameCollection("metrics")` to rename the time series collection. MongoDB does not support `renameCollection` on time series collections — this would fail at runtime.
- **What was changed:** Replaced the time series rename with a note that time series collections cannot be renamed, and suggested creating a view (`db.createView`) as an alias, or updating the application to use the new collection name directly.
- **Why:** This is a documented limitation of time series collections since MongoDB 5.0. The view approach provides a transparent alias so existing application queries against the original collection name continue to work.

### Issue 3 (Minor): `db.collection.stats()` is deprecated
- **What was wrong:** The Storage Comparison section used `db.collection.stats().storageSize`, which has been deprecated since MongoDB 6.2.
- **What was changed:** Replaced with `db.collection.aggregate([{ $collStats: { storageStats: {} } }])`, which is the recommended replacement.
- **Why:** While `stats()` still works, using the recommended `$collStats` aggregation stage is the current best practice and future-proof.

## Review Notes
- The `granularity: "seconds"` option is valid but is also the default value. Starting in MongoDB 6.3, the `bucketMaxSpanSeconds` and `bucketRoundingSeconds` parameters are available as alternatives for finer-grained control over bucketing behavior.
- The `expireAfterSeconds: 7776000` calculation (90 days) is correct.
- The claim that time series collections can reduce storage by 50-90% and achieve 5-10x compression ratios is reasonable and aligns with MongoDB's documentation on columnar compression for time series data.
- The batched insert migration approach with cursor-based pagination using `_id` is a solid pattern for large collections.
- Starting in MongoDB 7.0.3, `$out` (not `$merge`) can write to an existing time series collection, which could be mentioned as an alternative for newer deployments.
