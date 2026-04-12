# Validation Summary: How to Optimize Compression for Time Series Collections in MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (time series collections)
- WiredTiger storage engine
- Zstd compression
- MongoDB shell (mongosh)

## Sources Consulted
- MongoDB Manual: Time Series Bucketing — https://www.mongodb.com/docs/manual/core/timeseries/timeseries-bucketing/
- MongoDB Manual: Time Series Granularity — https://www.mongodb.com/docs/manual/core/timeseries/timeseries-granularity/
- MongoDB Manual: Time Series Compression — https://www.mongodb.com/docs/manual/core/timeseries/timeseries-compression/
- MongoDB Manual: Time Series Limitations — https://www.mongodb.com/docs/manual/core/timeseries/timeseries-limitations/
- MongoDB Manual: db.collection.stats() — https://www.mongodb.com/docs/manual/reference/method/db.collection.stats/
- MongoDB Manual: collStats command (deprecated 6.2) — https://www.mongodb.com/docs/manual/reference/command/collstats/
- MongoDB Manual: $collStats aggregation stage — https://www.mongodb.com/docs/manual/reference/operator/aggregation/collstats/
- MongoDB Manual: compact command — https://www.mongodb.com/docs/manual/reference/command/compact/
- MongoDB Manual: WiredTiger Storage Engine — https://www.mongodb.com/docs/manual/core/wiredtiger/

## Issues Found

1. **system.buckets accessed from wrong database**: The code `db.getSiblingDB("local").system.buckets.sensorReadings.stats().compression` was incorrect in two ways: (a) `system.buckets` lives in the same database as the time series collection, not the `local` database, and (b) `.stats()` does not return a `.compression` property. Fixed to `db.system.buckets.sensorReadings.stats()`.

2. **Misleading version qualifier on bucket measurement cap**: The post stated "up to 1,000 measurements (MongoDB 6.3+)" implying the 1,000 cap was introduced in 6.3. In fact, the 1,000-measurement-per-bucket limit has existed since time series collections were introduced in MongoDB 5.0. MongoDB 6.3 introduced `bucketRoundingSeconds`/`bucketMaxSpanSeconds`, not the measurement cap. Removed the "(MongoDB 6.3+)" qualifier.

3. **Incorrect math in MetaField cardinality example**: The example claimed "1 bucket per sensor per hour = 3,600 docs/bucket" for a sensor writing 1 reading/second with `seconds` granularity. Since the bucket cap is 1,000 measurements, 3,600 readings per hour would actually produce ~4 buckets per sensor per hour with ~900 docs each. Fixed the example to reflect the correct bucket count.

4. **Wrong MongoDB version for Zstd default**: The post claimed "Time series collections default to Zstd compression in MongoDB 6.0+." Zstd has been the default block compressor for time series collections since MongoDB 5.0, when time series collections were first introduced. Changed to "since MongoDB 5.0".

5. **Misleading description of compact command behavior**: The post described `compact` as "an offline operation - the collection is locked during compaction on standalone instances." Since MongoDB 4.4+, `compact` is not a full offline operation — it blocks writes on the target collection but permits reads. The description was updated to be more precise.

## Review Notes
- `db.collection.stats()` relies on the `collStats` command which was deprecated in MongoDB 6.2. The mongosh shell helper still functions by internally using `$collStats`, but readers targeting newer MongoDB versions may want to use the `$collStats` aggregation stage directly for future compatibility.
- MongoDB 8.0 introduced `autoCompact` for background, non-blocking compaction, which is a more modern alternative to the manual `compact` approach described in the post.
- The compression ratio benchmarks in the "Storage Size Benchmarks" section are presented as general estimates without specific test conditions. They are reasonable ballpark figures but actual results will vary significantly based on data patterns, bucket fullness, and configuration.
