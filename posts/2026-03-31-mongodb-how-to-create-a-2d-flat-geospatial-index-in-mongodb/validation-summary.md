# Validation Summary: How to Create a 2d Flat Geospatial Index in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (2d geospatial index)
- MongoDB Shell (mongosh) query syntax
- MongoDB geospatial query operators ($near, $geoWithin, $box, $center, $centerSphere, $polygon)

## Sources Consulted
- MongoDB 2d Index documentation: https://www.mongodb.com/docs/manual/core/2d/
- MongoDB $geoWithin operator: https://www.mongodb.com/docs/manual/reference/operator/query/geoWithin/
- MongoDB $near operator: https://www.mongodb.com/docs/manual/reference/operator/query/near/
- MongoDB $center operator: https://www.mongodb.com/docs/manual/reference/operator/query/center/
- MongoDB $centerSphere operator: https://www.mongodb.com/docs/manual/reference/operator/query/centerSphere/
- MongoDB $box operator: https://www.mongodb.com/docs/manual/reference/operator/query/box/
- MongoDB $polygon operator: https://www.mongodb.com/docs/manual/reference/operator/query/polygon/
- MongoDB Compound 2d Index documentation: https://www.mongodb.com/docs/manual/core/2d/#compound-2d-indexes

## Issues Found
No technical issues found.

## Review Notes
- The `$centerSphere` example in the "$geoWithin - Find Points Inside a Shape" section is technically correct (it does work with 2d indexes), but could be slightly confusing in the context of a flat-plane tutorial since `$centerSphere` uses spherical (great circle) distance calculation rather than flat Euclidean distance. The post does show `$center` immediately after as the flat-distance alternative, which helps clarify the distinction.
- The 2d vs 2dsphere comparison table lists "GeoJSON objects" as the data format for 2dsphere indexes. This is a simplification — 2dsphere indexes can also index legacy coordinate pairs — but it is an acceptable simplification for a comparison table since GeoJSON is the recommended format for 2dsphere.
- The compound 2d index constraint (2d field must come first) is correctly documented and still applies in current MongoDB versions.
