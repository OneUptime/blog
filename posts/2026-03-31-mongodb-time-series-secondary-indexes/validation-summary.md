# Validation Summary: How to Use Secondary Indexes on Time Series Collections in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (time series collections)
- MongoDB secondary indexes (single field, compound, partial)
- MongoDB Shell (mongosh) commands
- MongoDB aggregation framework (`$indexStats`)

## Sources Consulted
- MongoDB official documentation: Time Series Collections — https://www.mongodb.com/docs/manual/core/timeseries-collections/
- MongoDB official documentation: Secondary Indexes on Time Series Collections — https://www.mongodb.com/docs/manual/core/timeseries/timeseries-secondary-index/
- MongoDB official documentation: Time Series Collection Limitations — https://www.mongodb.com/docs/manual/core/timeseries/timeseries-limitations/
- MongoDB 6.0, 6.3, and 7.0 Release Notes — https://www.mongodb.com/docs/manual/release-notes/

## Issues Found

1. **Ambiguous text/2dsphere index limitation (line 120)**: The original sentence "Text indexes and 2dsphere indexes on measurement fields are not supported in MongoDB 7.0 and earlier" was grammatically ambiguous. It could be read as applying the "on measurement fields" qualifier to both index types, when in fact text indexes are not supported on time series collections at all (on any field), while 2dsphere indexes are specifically unsupported on measurement fields but are supported on metaField subfields starting from MongoDB 6.3. Rewrote as two separate clauses for accuracy.

2. **Misleading "unique-like" claim (line 122)**: The original text stated "You cannot create a unique index on measurement fields (only the auto-created index is unique-like via bucket boundaries)." The parenthetical is misleading — the auto-created clustered index organizes data by meta value and time range, but it does not enforce uniqueness in the way a unique index does. Multiple buckets can share the same meta value. Also, the unique index restriction applies to the entire time series collection, not just measurement fields. Simplified to "You cannot create a unique index on a time series collection."

## Review Notes
- Secondary indexes on measurement fields require MongoDB 6.0+. The post does not specify this version requirement, which could cause confusion for users on MongoDB 5.0. This is not an error in the post but could be a useful addition in a future update.
- All code examples are syntactically correct and use current mongosh APIs.
- The explanation of bucket-level indexing using `control.min` and `control.max` values is accurate and helpful.
- The `$indexStats` and `explain()` usage examples are correct.
- The post's claim about wildcard indexes not being supported on time series collections is accurate for MongoDB 7.0 and earlier. Future MongoDB versions may add this support.
