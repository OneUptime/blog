# Validation Summary: How to Add Secondary Indexes to Time Series Collections in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (time series collections, secondary indexes)
- mongosh (MongoDB Shell)
- MongoDB profiler

## Sources Consulted
- MongoDB Manual: Time Series Secondary Indexes — https://www.mongodb.com/docs/manual/core/timeseries/timeseries-secondary-index/
- MongoDB Manual: Time Series Collections — https://www.mongodb.com/docs/manual/core/timeseries-collections/
- MongoDB Manual: Time Series Limitations — https://www.mongodb.com/docs/manual/core/timeseries/timeseries-limitations/
- MongoDB Manual: Clustered Collections — https://www.mongodb.com/docs/manual/core/clustered-collections/

## Issues Found

1. **Incorrect "clustered index" terminology**: The post described the automatic time-field index as a "clustered index on the timeField." MongoDB documentation refers to this as an internal index on the timeField; the term "clustered index" applies to clustered collections, which is a different concept. Changed to "internal index on the timeField."

2. **Mermaid diagram inconsistency**: The diagram showed `{ 'sensor.id': 1, ts: 1 }` as the auto-created compound index, but the rest of the post consistently uses `metadata.sensorId`. Updated the diagram to use `{ metadata.sensorId: 1, ts: 1 }` for consistency. Also removed "(clustered)" label.

3. **Inaccurate `getIndexes()` output**: The example output showed `{ key: { _id: 1 }, name: "_id_", clustered: true }` which is not how time series collections report their indexes via `getIndexes()`. The internal time-field index is not exposed as a visible `_id_` clustered index. Removed this misleading entry from the example output.

4. **Explain section used Node.js driver syntax instead of mongosh**: The section used `await db.collection("sensor_readings").find(...).explain(...)` which is Node.js driver syntax. All other examples in the post use mongosh syntax (`db.sensor_readings`). Changed to `db.sensor_readings.find(...).explain(...)` for consistency.

5. **Wildcard indexes incorrectly listed as unsupported**: The limitations section stated `$**` wildcard indexes are not supported. Wildcard indexes on time series collections have been supported since MongoDB 6.3. Updated the limitation to note version-gated support and added a working example in the code block.

6. **Limitations section used "clustered index" term**: The bullet about dropping indexes said "you cannot drop the clustered index." Changed to "you cannot drop the internal time index."

## Review Notes
- The hashed index limitation claim is likely correct but is not explicitly confirmed in current MongoDB documentation (hashed indexes are simply not mentioned in the time series index docs). Kept as-is since it's a reasonable claim.
- The partial index example is correct for MongoDB 6.0+. The post doesn't specify a minimum MongoDB version; readers on MongoDB 5.x may not have full secondary index support on measurement fields (added in 6.0).
- The `db.setProfilingLevel` and `db.system.profile` usage in the Performance Recommendations section is correct mongosh syntax.
