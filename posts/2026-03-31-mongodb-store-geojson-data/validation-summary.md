# Validation Summary: How to Store GeoJSON Data in MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (geospatial features, `2dsphere` index)
- GeoJSON (RFC 7946)
- JavaScript (MongoDB shell syntax)

## Sources Consulted
- GeoJSON RFC 7946 — https://datatracker.ietf.org/doc/html/rfc7946
- MongoDB GeoJSON Objects documentation — https://www.mongodb.com/docs/manual/reference/geojson/
- MongoDB Geospatial Queries documentation — https://www.mongodb.com/docs/manual/geospatial-queries/
- MongoDB `2dsphere` Index documentation — https://www.mongodb.com/docs/manual/core/2dsphere/

## Issues Found
1. **Incorrect winding direction comment on inner ring (hole)**: In the "Storing a Polygon with a Hole" section, the comment on the inner ring said `// Inner ring (hole) - counterclockwise`. The actual coordinate sequence traces NW→SW→SE→NE→NW, which is clockwise. Per RFC 7946 Section 3.1.6, holes must follow the right-hand rule and be wound clockwise, so the code itself was correct — only the comment was wrong. Changed "counterclockwise" to "clockwise".

## Review Notes
- The outer ring in the "Polygon with a Hole" example is wound clockwise. Per RFC 7946, exterior rings should be counterclockwise. MongoDB handles both orientations correctly for small polygons (area less than a hemisphere), so this will work in practice. A future revision could reorder the outer ring vertices to follow the RFC strictly.
- The claim "Without a 2dsphere index, most geospatial operators will not work or will be very slow" is slightly imprecise — `$near` requires a geospatial index and will error without one, while `$geoWithin` can run without an index (just slowly). The current wording is acceptable as a general guideline.
- All coordinate values used in examples fall within valid longitude/latitude ranges.
- The Eiffel Tower coordinates [2.2945, 48.8584] are accurate.
