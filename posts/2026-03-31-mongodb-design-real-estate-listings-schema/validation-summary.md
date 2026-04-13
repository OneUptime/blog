# Validation Summary: How to Design a Real Estate Listings Schema in MongoDB

## Status
validated

## Post Type
Guide

## Technologies Covered
- MongoDB (document schema design, indexes, queries)
- GeoJSON (Point geometry for geospatial data)
- MongoDB 2dsphere indexes
- MongoDB text indexes and $text search
- MongoDB $near geospatial queries

## Sources Consulted
- MongoDB Manual: GeoJSON Objects — https://www.mongodb.com/docs/manual/reference/geojson/
- MongoDB Manual: 2dsphere Indexes — https://www.mongodb.com/docs/manual/core/2dsphere/
- MongoDB Manual: $near Operator — https://www.mongodb.com/docs/manual/reference/operator/query/near/
- MongoDB Manual: Text Indexes — https://www.mongodb.com/docs/manual/core/indexes/index-types/index-text/
- MongoDB Manual: $text Operator — https://www.mongodb.com/docs/manual/reference/operator/query/text/
- MongoDB Manual: $meta (textScore) — https://www.mongodb.com/docs/manual/reference/operator/aggregation/meta/
- MongoDB Manual: createIndex — https://www.mongodb.com/docs/manual/reference/method/db.collection.createIndex/

## Issues Found
No technical issues found.

## Review Notes
- The Inquiry Collection example uses `ObjectId()` inside a JSON code block, which is not valid JSON (it is JavaScript/BSON). This is a universally accepted convention in MongoDB documentation and blog posts, so it does not warrant a fix, but readers copying the JSON directly into a JSON parser would get a syntax error.
- The geospatial query combines `$near` with additional filter predicates (`status`, `priceCents`). MongoDB must use the 2dsphere index for the `$near` portion and will apply the other filters as a post-index scan. For high-volume datasets, a compound geospatial index or additional filtering strategy could improve performance, but this is an optimization concern rather than a correctness issue.
- GeoJSON coordinate order `[longitude, latitude]` is correctly used throughout, matching the GeoJSON specification (RFC 7946). The coordinates correspond to Springfield, IL.
