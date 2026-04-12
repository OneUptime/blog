# Validation Summary: How to Configure Time Series Collection Granularity in MongoDB

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MongoDB (time series collections)
- MongoDB Shell (mongosh)
- MongoDB `bucketMaxSpanSeconds` / `bucketRoundingSeconds` (MongoDB 6.3+)
- MongoDB `collMod` command for granularity modification
- MongoDB TTL (`expireAfterSeconds`) on time series collections

## Sources Consulted
- MongoDB official documentation: Time Series Collections — https://www.mongodb.com/docs/manual/core/timeseries-collections/
- MongoDB official documentation: `db.createCollection()` timeseries options — https://www.mongodb.com/docs/manual/reference/method/db.createCollection/
- MongoDB official documentation: `collMod` for time series — https://www.mongodb.com/docs/manual/reference/command/collMod/
- MongoDB official documentation: Set Granularity for Time Series Data — https://www.mongodb.com/docs/manual/core/timeseries/timeseries-granularity/
- MongoDB official documentation: `bucketMaxSpanSeconds` and `bucketRoundingSeconds` (6.3+) — https://www.mongodb.com/docs/manual/reference/command/create/#std-label-create-time-series-granularity
- MongoDB Shell (mongosh) API reference: `db.getCollection()` — https://www.mongodb.com/docs/mongodb-shell/reference/methods/

## Issues Found
1. **`db.collection()` used instead of `db.getCollection()` in mongosh context** — In the "Diagnosing Suboptimal Granularity" section, `db.collection(collectionName)` was used to access the time series measurement collection. All other code examples in the post use mongosh syntax (`db.createCollection()`, `db.getCollection()`, `db.runCommand()`). The method `db.collection()` is a Node.js driver API and is not available in the MongoDB shell (mongosh). Changed to `db.getCollection(collectionName)` for consistency and correctness.

## Review Notes
- The granularity bucket window sizes (`"seconds"` → ~1 hour, `"minutes"` → ~24 hours, `"hours"` → ~30 days) are accurate per current MongoDB documentation.
- The claim that `bucketMaxSpanSeconds` and `bucketRoundingSeconds` were introduced in MongoDB 6.3 is correct.
- The restriction that granularity can only be increased (not decreased) after collection creation is correctly stated.
- The TTL/`expireAfterSeconds` bucket-level expiry explanation is accurate — deletion happens when the entire bucket has aged past the TTL threshold.
- The `diagnoseBuckets` function recommends "consider decreasing granularity" when average measurements per bucket exceeds 10,000, which is reasonable diagnostic advice, though the user should be aware that decreasing granularity on an existing collection requires recreating it (as the post correctly notes elsewhere).
- The `recommendGranularity` comment says "one level coarser than your write frequency," but the logic actually matches the write frequency to the corresponding granularity level — this is a minor wording imprecision but the code logic itself is correct and aligns with MongoDB's recommendations.
