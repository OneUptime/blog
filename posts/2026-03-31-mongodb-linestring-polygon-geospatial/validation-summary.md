# Validation Summary: How to Store and Query LineString and Polygon Types in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (geospatial features, 2dsphere indexes)
- GeoJSON (LineString, Polygon, Point types)
- MongoDB Shell (mongosh) query syntax
- MongoDB Aggregation Framework ($geoNear stage)

## Sources Consulted
- MongoDB Manual: GeoJSON Objects — https://www.mongodb.com/docs/manual/reference/geojson/
- MongoDB Manual: $geoWithin — https://www.mongodb.com/docs/manual/reference/operator/query/geoWithin/
- MongoDB Manual: $geoIntersects — https://www.mongodb.com/docs/manual/reference/operator/query/geoIntersects/
- MongoDB Manual: $near — https://www.mongodb.com/docs/manual/reference/operator/query/near/
- MongoDB Manual: $geoNear Aggregation — https://www.mongodb.com/docs/manual/reference/operator/aggregation/geoNear/
- MongoDB Manual: 2dsphere Indexes — https://www.mongodb.com/docs/manual/core/2dsphere/
- RFC 7946: The GeoJSON Format — https://datatracker.ietf.org/doc/html/rfc7946

## Issues Found
- **Polygon winding order inconsistency**: The "Key Rules" section correctly states that outer rings must use counterclockwise winding (per RFC 7946 Section 3.1.6 and MongoDB documentation). However, both polygon examples (the Financial District boundary and the searchArea variable) used clockwise winding order. Fixed both polygons to use counterclockwise vertex ordering, making the examples consistent with the stated rules. MongoDB accepts both winding orders for small polygons (less than a hemisphere), so the original code would have worked, but the inconsistency between the examples and the documented rules was misleading.

## Review Notes
- The `spherical: true` option in the `$geoNear` aggregation stage is correct but redundant when using a GeoJSON Point for the `near` parameter in MongoDB 4.0+. Including it is not an error and improves clarity for readers using older versions.
- The section title "Aggregation with Polygon and Distance" is slightly misleading since the example uses a Point query with `$geoNear`, not a Polygon. However, the code and description are technically correct.
- All MongoDB query operators (`$geoWithin`, `$geoIntersects`, `$near`, `$geoNear`) are used correctly with proper syntax and semantics.
- The GeoJSON coordinate order (longitude, latitude) is correctly used throughout all examples.
- The polygon closure validation functions are correct JavaScript.
