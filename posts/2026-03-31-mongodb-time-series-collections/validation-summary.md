# Validation Summary: How to Use Time Series Collections in MongoDB 5.0+

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB 5.0+ Time Series Collections
- MongoDB Aggregation Framework (`$group`, `$dateTrunc`, `$setWindowFields`, `$merge`)
- MongoDB TTL (expireAfterSeconds)
- MongoDB Shell (mongosh)

## Sources Consulted
- MongoDB Manual: Time Series Collections — https://www.mongodb.com/docs/manual/core/timeseries-collections/
- MongoDB Manual: `db.createCollection()` — https://www.mongodb.com/docs/manual/reference/method/db.createCollection/
- MongoDB Manual: `$setWindowFields` — https://www.mongodb.com/docs/manual/reference/operator/aggregation/setWindowFields/
- MongoDB Manual: `$dateTrunc` — https://www.mongodb.com/docs/manual/reference/operator/aggregation/dateTrunc/
- MongoDB Manual: Time Series Collection Limitations — https://www.mongodb.com/docs/manual/core/timeseries/timeseries-limitations/
- MongoDB Manual: `collMod` — https://www.mongodb.com/docs/manual/reference/command/collMod/

## Issues Found

### 1. Outdated delete restriction in Limitations section
- **What was wrong:** The post stated "Documents cannot be deleted individually (delete by time range using the TTL mechanism or a ranged delete)." This was only true for MongoDB 5.0. Starting in MongoDB 5.1, delete operations on time series collections are supported.
- **What was changed:** Updated to note that this restriction applies to MongoDB 5.0 and that deletes are supported starting in MongoDB 5.1.

### 2. Outdated update restriction in Limitations section
- **What was wrong:** The post stated "Documents cannot be updated after insertion." This was only true for MongoDB 5.0. Starting in MongoDB 5.1, limited updates to measurement fields are supported.
- **What was changed:** Combined with the delete restriction into a single bullet clarifying the version-specific behavior.

### 3. Inaccurate capped collection and change stream limitation
- **What was wrong:** The post stated "Capped collections and change streams on time series collections have limited support." This conflates two separate restrictions and is imprecise. Time series collections cannot be capped collections at all (not "limited support"), and change streams on time series collections are fully supported starting in MongoDB 6.0.
- **What was changed:** Split into two separate bullets with accurate information: time series collections cannot be capped collections; change streams are supported starting in MongoDB 6.0.

## Review Notes
- The `db.collection.stats()` method is deprecated starting in MongoDB 6.2 in favor of the `$collStats` aggregation stage. It still works but readers on newer versions should be aware of the deprecation.
- MongoDB 6.3+ introduced `bucketMaxSpanSeconds` and `bucketRoundingSeconds` as more precise alternatives to the `granularity` parameter. The `granularity` option ("seconds", "minutes", "hours") remains valid but the newer parameters offer finer control.
- All code examples (`createCollection`, `insertOne`, `insertMany`, `find`, `aggregate` with `$group`/`$dateTrunc`/`$setWindowFields`/`$merge`, `createIndex`, `collMod`) are syntactically correct and use current APIs.
- The `$setWindowFields` rolling window syntax with `range: [-300, 0], unit: "second"` is correct.
- The TTL math is correct: 2592000 = 30 days, 86400 * 90 = 90 days, 86400 * 365 = 365 days.
- The claim that the `timeField` and `metaField` are automatically indexed is essentially correct — MongoDB creates internal indexes on the underlying bucket collection for these fields. The post correctly still recommends creating explicit compound indexes for sub-fields of the metaField.
