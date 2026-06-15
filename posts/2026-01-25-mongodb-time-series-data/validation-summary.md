# Validation Summary: How to Store Time Series Data in MongoDB

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- MongoDB time series collections
- MongoDB Query Language
- MongoDB aggregation pipelines
- MongoDB TTL expiration
- mongosh JavaScript examples

## Sources Consulted
- MongoDB Manual: Time Series Collections - https://www.mongodb.com/docs/manual/core/timeseries-collections/
- MongoDB Manual: Create and Query a Time Series Collection - https://www.mongodb.com/docs/manual/core/timeseries/timeseries-procedures/
- MongoDB Manual: Add Secondary Indexes to Time Series Collections - https://www.mongodb.com/docs/manual/core/timeseries/timeseries-secondary-index/
- MongoDB Manual: Best Practices for Time Series Collections - https://www.mongodb.com/docs/manual/core/timeseries/timeseries-best-practices/
- MongoDB Manual: Time Series Collection Limitations - https://www.mongodb.com/docs/manual/core/timeseries/timeseries-limitations/
- MongoDB Manual: collMod command - https://www.mongodb.com/docs/manual/reference/command/collmod/
- MongoDB Manual: $setWindowFields aggregation stage - https://www.mongodb.com/docs/manual/reference/operator/aggregation/setwindowfields/
- MongoDB Manual: $percentile accumulator operator - https://www.mongodb.com/docs/manual/reference/operator/aggregation/percentile/
- MongoDB Manual: MongoDB 7.0 Release Notes - https://www.mongodb.com/docs/manual/release-notes/7.0/

## Issues Found
- The post stated that time series collections automatically create an index on the time field. Current MongoDB documentation says MongoDB 6.3 and later automatically creates a compound index on the `metaField` and `timeField` fields for new time series collections, so the wording was updated.
- The manual cleanup example used `deleteMany()` without a version caveat. MongoDB 7.0 removed most time series delete command limitations, so the section now specifies MongoDB 7.0 and later.
- The application metrics example used `$percentile` without noting that the accumulator is available starting in MongoDB 7.0. An inline comment was added.
- The IoT example stored `firmware` in the time series `metaField`. MongoDB recommends metadata that labels a series and rarely changes, so `firmware` was moved out of the metadata object and kept as a measurement document field.

## Review Notes
The remaining examples use current MongoDB syntax for `db.createCollection()` time series options, TTL via `expireAfterSeconds`, `collMod` TTL changes, time range queries, `$dateTrunc`, `$setWindowFields` time range windows, `$merge` from a time series source into a regular summary collection, and secondary indexes supported by time series collections.
