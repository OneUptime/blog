# Validation Summary: How to Use $nearSphere in MongoDB for Spherical Queries

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (geospatial queries)
- `$nearSphere` query operator
- `$near` query operator (comparison)
- `$geoNear` aggregation stage
- `2dsphere` and `2d` indexes
- GeoJSON Point geometry
- Node.js MongoDB driver

## Sources Consulted
- MongoDB Manual: `$nearSphere` — https://www.mongodb.com/docs/manual/reference/operator/query/nearSphere/
- MongoDB Manual: `$near` — https://www.mongodb.com/docs/manual/reference/operator/query/near/
- MongoDB Manual: `$geoNear` aggregation — https://www.mongodb.com/docs/manual/reference/operator/aggregation/geoNear/
- MongoDB Manual: Geospatial Indexes — https://www.mongodb.com/docs/manual/core/indexes/index-types/geospatial/2dsphere/
- MongoDB Manual: GeoJSON Objects — https://www.mongodb.com/docs/manual/reference/geojson/
- Haversine formula verification for distance calculations

## Issues Found
1. **Incorrect distance for Sagrada Familia in sample output**: The `$geoNear` sample output listed the distance from Paris [2.3522, 48.8566] to Sagrada Familia [2.1744, 41.4036] as 1039 km. The actual great-circle distance is approximately 829 km. Changed `distanceKm: 1039` to `distanceKm: 829`.

2. **Incorrect distance for Eiffel Tower in sample output**: The sample output showed `distanceKm: 0` for the Eiffel Tower, but the query point [2.3522, 48.8566] (Paris city center) is approximately 4 km from the Eiffel Tower [2.2945, 48.8584]. With `distanceMultiplier: 0.001` and `$round: ["$distanceKm", 0]`, MongoDB would return 4, not 0. Changed `distanceKm: 0` to `distanceKm: 4`.

3. **Minor distance rounding adjustments**: Updated Big Ben distance from 342 to 343 and Colosseum from 1105 to 1106 to better match computed great-circle distances. These are within normal rounding variance but were adjusted for consistency with the corrected values.

## Review Notes
- All `$nearSphere` syntax examples (GeoJSON and legacy coordinate modes) are correct per MongoDB documentation.
- The distinction between `$near` and `$nearSphere` behavior with `2d` vs `2dsphere` indexes is accurately explained.
- The legacy mode distance conversion using radians (`km / 6371`) is correct.
- The `$geoNear` aggregation example correctly uses `spherical: true` and `distanceMultiplier: 0.001` to convert meters to kilometers.
- The comparison table between `$near` and `$nearSphere` is accurate.
- The Node.js example uses correct MongoDB driver API patterns.
- GeoJSON coordinates throughout use the correct [longitude, latitude] order.
- Landmark coordinates are accurate for their real-world locations.
- Note: MongoDB uses the WGS84 ellipsoid model for `2dsphere` calculations, so actual MongoDB output may differ from simple spherical (haversine) calculations by up to ~0.5%. The corrected values use spherical approximation which is close enough for illustrative sample output.
