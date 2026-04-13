# Validation Summary: How to Use $geoNear to Find Documents by Proximity in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB aggregation framework
- `$geoNear` aggregation stage
- GeoJSON (Point type)
- `2dsphere` and `2d` geospatial indexes
- MongoDB Shell (mongosh)

## Sources Consulted
- MongoDB `$geoNear` aggregation stage documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/geoNear/
- MongoDB 4.2 release notes (removal of `limit`/`num` options): https://www.mongodb.com/docs/manual/release-notes/4.2/
- MongoDB geospatial indexes documentation: https://www.mongodb.com/docs/manual/core/indexes/index-types/index-geospatial/
- GeoJSON specification (RFC 7946): https://datatracker.ietf.org/doc/html/rfc7946

## Issues Found

### 1. Removed `limit` option used inside `$geoNear` (two locations)

**What was wrong:** The post used the `limit` option directly inside the `$geoNear` stage specification. This option was removed in MongoDB 4.2 (released August 2019). All currently supported MongoDB versions (5.0+) do not accept this option and will error.

**What was changed:**
- In the syntax reference section, removed the `limit: 100` line from the `$geoNear` field listing.
- In the "Limiting Results" section, replaced the `limit: 5` field inside `$geoNear` with a `$limit: 5` pipeline stage after `$geoNear`, which is the correct current approach. Updated the section description to mention `$limit` stage.

**Why:** The `limit` and `num` options were removed from `$geoNear` in MongoDB 4.2. The official documentation directs users to use a separate `$limit` stage in the pipeline instead.

## Review Notes
- Starting in MongoDB 5.1, the `spherical` option is automatically set to `true` when using a `2dsphere` index, so it no longer needs to be explicitly specified. The post consistently uses `spherical: true`, which still works and is not an error, but readers should know it is optional on modern versions.
- The `distanceMultiplier` note in the delivery drivers example correctly applies the multiplier to the `distanceField` output, but readers should be aware that `maxDistance` is always specified in meters (for `2dsphere`) regardless of the multiplier setting.
