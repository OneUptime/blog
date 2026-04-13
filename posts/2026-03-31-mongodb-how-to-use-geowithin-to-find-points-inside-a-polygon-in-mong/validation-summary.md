# Validation Summary: How to Use $geoWithin to Find Points Inside a Polygon in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB geospatial queries (`$geoWithin`, `$geoIntersects`)
- GeoJSON (Point, Polygon, MultiPolygon)
- MongoDB `2dsphere` and `2d` indexes
- Legacy geospatial operators (`$box`, `$center`, `$centerSphere`)
- Node.js MongoDB driver

## Sources Consulted
- MongoDB Manual: $geoWithin — https://www.mongodb.com/docs/manual/reference/operator/query/geoWithin/
- MongoDB Manual: $geoIntersects — https://www.mongodb.com/docs/manual/reference/operator/query/geoIntersects/
- MongoDB Manual: GeoJSON Objects — https://www.mongodb.com/docs/manual/reference/geojson/
- MongoDB Manual: $near — https://www.mongodb.com/docs/manual/reference/operator/query/near/
- MongoDB Manual: $centerSphere — https://www.mongodb.com/docs/manual/reference/operator/query/centerSphere/
- MongoDB Manual: 2dsphere Indexes — https://www.mongodb.com/docs/manual/core/2dsphere/
- RFC 7946 (GeoJSON) — https://datatracker.ietf.org/doc/html/rfc7946

## Issues Found
No technical issues found.

## Review Notes
- The geofencing code block mixes mongo shell syntax (`db.deliveryZones.insertOne`, `db.deliveryZones.createIndex`) with Node.js driver syntax (`await db.collection("deliveryZones").findOne`). This is a stylistic inconsistency but not a technical error — both syntaxes are individually correct.
- The `$geoIntersects` usage in the geofencing sections is appropriate: when the polygon is stored in the document and you want to check if it contains a given point, `$geoIntersects` is the correct operator (not `$geoWithin`).
- The ~5km approximation for 0.05 degrees radius with `$center` is reasonable at NYC latitude (~40.7°), where 0.05° latitude ≈ 5.5 km and 0.05° longitude ≈ 4.2 km. The flat geometry caveat is properly noted.
- The Earth radius constant of 6,371 km used for the `$centerSphere` radians conversion is the standard mean radius value.
