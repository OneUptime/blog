# Validation Summary: How to Choose Between Collection Types in MongoDB

## Status
validated

## Post Type
Guide

## Technologies Covered
- MongoDB (collection types: regular, capped, time series, clustered)
- MongoDB Shell / `db.createCollection()` API

## Sources Consulted
- MongoDB documentation on `db.createCollection()`: https://www.mongodb.com/docs/manual/reference/method/db.createCollection/
- MongoDB documentation on Capped Collections: https://www.mongodb.com/docs/manual/core/capped-collections/
- MongoDB documentation on Time Series Collections: https://www.mongodb.com/docs/manual/core/timeseries-collections/
- MongoDB documentation on Clustered Collections: https://www.mongodb.com/docs/manual/core/clustered-collections/

## Issues Found
No technical issues found.

## Review Notes
- The "10x storage savings" claim for time series collections is a rough figure consistent with MongoDB marketing materials. Actual savings vary significantly depending on data shape and cardinality.
- The "compressed, columnar format" description for time series is accurate for MongoDB 7.0+, which introduced columnar compression. Earlier versions used a bucket-based storage format that was not columnar.
- Clustered collections were introduced in MongoDB 5.3. The post does not mention version requirements, which could be noted in a future update.
- The capped collection guidance correctly implies that individual document deletion is not supported and updates must not change document size, though it phrases this as a "when to choose" criterion rather than a hard restriction.
