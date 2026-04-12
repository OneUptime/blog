# Validation Summary: How to Use $geoNear to Find Documents by Proximity in MongoDB Aggregation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (Aggregation Framework)
- `$geoNear` aggregation pipeline stage
- GeoJSON / 2dsphere indexes
- Geospatial queries

## Sources Consulted
- MongoDB official documentation: `$geoNear` aggregation stage — https://www.mongodb.com/docs/manual/reference/operator/aggregation/geoNear/
- MongoDB official documentation: 2dsphere indexes — https://www.mongodb.com/docs/manual/core/2dsphere/
- MongoDB official documentation: GeoJSON objects — https://www.mongodb.com/docs/manual/reference/geojson/
- MongoDB 4.2 release notes (removal of `limit`/`num` options from `$geoNear`) — https://www.mongodb.com/docs/manual/release-notes/4.2/

## Issues Found

1. **`limit` option removed from `$geoNear` since MongoDB 4.2**: The basic syntax template included `limit: <number>` as a parameter of `$geoNear`. The `limit` (and `num`) options were removed from `$geoNear` starting in MongoDB 4.2 (released August 2019). Users should use a `$limit` pipeline stage after `$geoNear` instead. Removed `limit` from the syntax template.

2. **`limit` listed in key parameters reference table**: The parameters table listed `limit` as a valid `$geoNear` option. Removed it and added `minDistance` instead, since the post has a section demonstrating `minDistance` but it was missing from the table.

## Review Notes
- The `spherical` parameter is listed as "Recommended" in the table. For `2dsphere` indexes (used throughout the post), `spherical` must be `true`. In MongoDB 5.1+, it defaults to `true` when using GeoJSON points with a `2dsphere` index. The "Recommended" label is acceptable since all code examples correctly set `spherical: true`.
- All GeoJSON coordinate pairs correctly use `[longitude, latitude]` order.
- All coordinate values are plausible for the locations described (Central Park, Midtown Manhattan, San Francisco, Paris).
- The `distanceMultiplier` values are correct: `0.001` for meters-to-kilometers and `0.000621371` for meters-to-miles.
- The post correctly notes that `$geoNear` must be the first stage in the pipeline.
- The chaining example correctly uses `$limit` as a separate pipeline stage (not the removed `limit` option), which is the proper modern approach.
