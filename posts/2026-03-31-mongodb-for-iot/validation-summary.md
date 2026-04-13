# Validation Summary: How to Use MongoDB for IoT Data Storage and Querying

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB 5.0+ time-series collections
- MongoDB bucket pattern
- MongoDB aggregation framework (`$dateTrunc`, `$group`, `$match`, `$sort`)
- MongoDB geospatial queries (`2dsphere` index, `$near`, GeoJSON)
- MongoDB update operators (`$push`, `$inc`, `$min`, `$max`, `$setOnInsert`)
- Node.js MongoDB driver (for downsampling function)
- JavaScript / mongosh

## Sources Consulted
- MongoDB Time-Series Collections documentation: https://www.mongodb.com/docs/manual/core/timeseries-collections/
- MongoDB `db.createCollection()` documentation: https://www.mongodb.com/docs/manual/reference/method/db.createCollection/
- MongoDB `$dateTrunc` aggregation operator: https://www.mongodb.com/docs/manual/reference/operator/aggregation/dateTrunc/
- MongoDB Geospatial Queries (`$near`, `2dsphere`): https://www.mongodb.com/docs/manual/reference/operator/query/near/
- MongoDB Bucket Pattern (blog/best practices): https://www.mongodb.com/blog/post/building-with-patterns-the-bucket-pattern
- MongoDB `$setOnInsert` operator: https://www.mongodb.com/docs/manual/reference/operator/update/setOnInsert/

## Issues Found
1. **Geospatial index field mismatch (line 261):** The `2dsphere` index was created on `"location.coordinates"`, but the GeoJSON Point data is stored in `"location.geoPoint"` (line 268) and the `$near` query targets `"location.geoPoint"` (line 278). MongoDB's `$near` operator requires a geospatial index on the field being queried. This mismatch would cause the query to fail with an error. **Fix:** Changed the index field from `"location.coordinates"` to `"location.geoPoint"` to match the stored GeoJSON data and the query field.

## Review Notes
- The `granularity` parameter for time-series collections has been expanded in MongoDB 6.3+ to also accept custom bucket sizes via `bucketMaxSpanSeconds` and `bucketRoundingSeconds`. The post correctly documents the MongoDB 5.0 options ("seconds", "minutes", "hours") but readers on newer versions may want to explore the newer granularity options.
- The device registry stores coordinates as `{ lat, lon }` (line 130) which is a plain object, not GeoJSON. The post correctly shows a separate update to add a proper GeoJSON `geoPoint` field for geospatial queries, but readers should be aware that the original `coordinates` field in the device registry is not usable for geospatial queries.
- The fleet summary aggregation uses `$sort` before `$group` to get the latest reading per device via `$first`. This is a valid and well-known pattern, though on very large datasets readers may want to consider using `$setWindowFields` (MongoDB 5.0+) as an alternative approach.
