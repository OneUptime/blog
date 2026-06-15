# Validation Summary: How to Choose Between Index Types in MongoDB

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- MongoDB indexes
- mongosh `db.collection.createIndex()`
- Single field indexes
- Compound indexes and ESR ordering
- Multikey indexes
- Text indexes and text search
- Geospatial indexes
- Hashed indexes and hashed sharding
- Wildcard indexes
- TTL, partial, and sparse index properties

## Sources Consulted
- MongoDB Manual: Index Types - https://www.mongodb.com/docs/manual/core/indexes/index-types/
- MongoDB Manual: Single Field Indexes - https://www.mongodb.com/docs/manual/core/indexes/index-types/index-single/
- MongoDB Manual: Compound Indexes - https://www.mongodb.com/docs/manual/core/indexes/index-types/index-compound/
- MongoDB Manual: The ESR Guideline - https://www.mongodb.com/docs/manual/tutorial/equality-sort-range-guideline/
- MongoDB Manual: Multikey Indexes - https://www.mongodb.com/docs/manual/core/indexes/index-types/index-multikey/
- MongoDB Manual: Text Indexes and `$text` - https://www.mongodb.com/docs/manual/core/indexes/index-types/index-text/ and https://www.mongodb.com/docs/manual/reference/operator/query/text/
- MongoDB Atlas Search: Search Overview and autocomplete use case - https://www.mongodb.com/docs/atlas/atlas-search/
- MongoDB Manual: Geospatial queries and operators - https://www.mongodb.com/docs/manual/geospatial-queries/, https://www.mongodb.com/docs/manual/reference/operator/query/nearsphere/, and https://www.mongodb.com/docs/manual/reference/operator/query/geowithin/
- MongoDB Manual: Hashed Indexes and Hashed Sharding - https://www.mongodb.com/docs/manual/core/indexes/index-types/index-hashed/ and https://www.mongodb.com/docs/manual/core/hashed-sharding/
- MongoDB Manual: Wildcard Indexes - https://www.mongodb.com/docs/manual/core/indexes/index-types/index-wildcard/
- MongoDB Manual: TTL Indexes - https://www.mongodb.com/docs/manual/core/index-ttl/
- MongoDB Manual: Partial Indexes - https://www.mongodb.com/docs/manual/core/index-partial/
- MongoDB Manual: Sparse Indexes - https://www.mongodb.com/docs/manual/core/index-sparse/
- MongoDB Manual: Analyze index usage with `$indexStats` - https://www.mongodb.com/docs/manual/data-modeling/schema-design-process/create-indexes/

## Issues Found
- The text index section recommended wildcard indexes for autocomplete. MongoDB wildcard indexes support arbitrary or unknown fields; MongoDB Search autocomplete is the documented search-as-you-type feature. Changed the recommendation to use MongoDB Search autocomplete.
- The sparse index sort example implied that an unhinted sort would exclude documents missing the indexed field. MongoDB does not use a sparse index for queries or sorts if doing so would produce incomplete results unless the sparse index is explicitly hinted. Updated the wording and comment to reflect that behavior.

## Review Notes
The examples are broadly accurate for current MongoDB documentation. The post intentionally stays high level and does not cover every index limitation, such as text index restrictions, hashed index array limitations, or TTL timing behavior. Those omissions are acceptable for a selection guide but could be expanded in a future deeper reference.
