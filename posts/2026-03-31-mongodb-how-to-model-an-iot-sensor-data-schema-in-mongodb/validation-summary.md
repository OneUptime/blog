# Validation Summary: How to Model an IoT Sensor Data Schema in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (general document model, indexes, aggregation framework)
- MongoDB Bucket Pattern (manual time-series optimization)
- MongoDB Native Time Series Collections (5.0+)
- MongoDB TTL Indexes
- GeoJSON (for device location coordinates)

## Sources Consulted
- MongoDB documentation on Time Series Collections: https://www.mongodb.com/docs/manual/core/timeseries-collections/
- MongoDB documentation on the Bucket Pattern: https://www.mongodb.com/blog/post/building-with-patterns-the-bucket-pattern
- MongoDB documentation on `$min` and `$max` update operators: https://www.mongodb.com/docs/manual/reference/operator/update/min/ and https://www.mongodb.com/docs/manual/reference/operator/update/max/
- MongoDB documentation on `findOneAndUpdate` with upsert: https://www.mongodb.com/docs/manual/reference/method/db.collection.findOneAndUpdate/
- MongoDB documentation on TTL Indexes: https://www.mongodb.com/docs/manual/core/index-ttl/
- MongoDB documentation on `$arrayElemAt`: https://www.mongodb.com/docs/manual/reference/operator/aggregation/arrayElemAt/
- GeoJSON specification for Point coordinates (longitude, latitude order): https://www.mongodb.com/docs/manual/reference/geojson/

## Issues Found
- **Removed `avg` field from bucket schema example**: The `temperature` and `humidity` sub-documents in the bucket schema included an `avg` field (`avg: 22.8` and `avg: 51.3`), but the `insertReading` function never sets or updates this field. It only maintains `sum`, `min`, and `max` via `$inc`, `$min`, and `$max` operators. The aggregation query later correctly computes the average dynamically as `$divide: ["$temperature.sum", "$sampleCount"]`. Including `avg` in the schema was misleading since documents created by the tutorial code would not contain it. Removed to keep the schema consistent with the insert code.

## Review Notes
- The `ObjectId` values used in schema examples (`"d001"`, `"b001"`, `"a001"`) are not valid 24-character hex strings and would throw errors in mongosh. However, they are clearly used as illustrative placeholders in non-executable schema illustrations, which is common practice in tutorials.
- The `$set: { deviceId, bucketStart }` in the `insertReading` function is technically redundant since these fields are already in the query filter and would be included in an upserted document automatically. Not harmful, but worth noting.
- The `bucketEnd` field in the schema example shows the end of the hour window (`09:00:00Z`), but the code sets it to `now` (the timestamp of the latest reading). This is a minor inconsistency but the code's approach (tracking last reading time) is a valid and useful design choice.
- The post correctly recommends native time series collections for MongoDB 5.0+ new projects while also covering the bucket pattern for older versions or more customized needs.
