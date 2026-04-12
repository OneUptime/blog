# Validation Summary: How to Handle TTL for Time Series Data in MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (time series collections)
- TTL (Time-To-Live) indexes and automatic document expiration
- `collMod` command for modifying collection options
- `ttlMonitorSleepSecs` server parameter

## Sources Consulted
- MongoDB Manual — Time Series Automatic Removal: https://www.mongodb.com/docs/manual/core/timeseries/timeseries-automatic-removal/
- MongoDB Manual — `collMod` Command Reference: https://www.mongodb.com/docs/manual/reference/command/collMod/
- MongoDB Manual — `db.createCollection()`: https://www.mongodb.com/docs/manual/reference/method/db.createCollection/
- MongoDB source code (`src/mongo/db/ttl/ttl.idl`) for `ttlMonitorSleepSecs` parameter definition

## Issues Found

1. **Critical: `expireAfterSeconds: 0` does not disable TTL (line 55)**
   - **What was wrong:** The post stated "Set `expireAfterSeconds` to `0` to disable automatic expiration without dropping the collection." This is dangerously incorrect — setting `expireAfterSeconds` to `0` causes documents to expire immediately (0 seconds after their timestamp), which could result in data loss.
   - **What was changed:** Replaced the incorrect claim with the correct method: setting `expireAfterSeconds` to the string `"off"`. Merged this guidance into the existing "Disabling TTL Temporarily" section that already demonstrated the `"off"` syntax, and added an explicit warning not to use `0`.
   - **Why:** MongoDB documentation states that `"off"` is the only way to disable automatic removal on time series collections. A numeric value of `0` is treated as a 0-second expiration window, not as "disabled."

2. **Misleading: `getIndexes()` suggested for verifying time series TTL (lines 40-41)**
   - **What was wrong:** The post suggested using `db.sensorReadings.getIndexes()` to check the TTL configuration. For time series collections, TTL is a collection-level option, not a traditional TTL index. The official documentation recommends using `listCollections` (or its shell wrapper `db.getCollectionInfos()`) to inspect `expireAfterSeconds`.
   - **What was changed:** Removed the `getIndexes()` suggestion, keeping only the correct `db.getCollectionInfos()` approach that was already shown.
   - **Why:** Pointing readers to `getIndexes()` for time series TTL is misleading since the TTL is not represented as a user-visible index on the collection.

## Review Notes
- The `ttlMonitorSleepSecs` parameter is marked as "used for testing" in MongoDB's internal source code. While technically correct and functional, it is not officially recommended for production tuning. The blog presents it as a general-purpose configuration option. This is not strictly wrong but readers should be aware of this nuance.
- The "Choosing the Right Retention Window" table with granularity-to-retention suggestions is opinionated advice, not from MongoDB's official docs. This is fine as presented (labeled "Suggested"), but readers should know these are the author's recommendations, not MongoDB guidelines.
