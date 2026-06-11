# Validation Summary: How to Implement MongoDB Index Intersection

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- MongoDB
- MongoDB indexes
- MongoDB query planner
- mongosh `createIndex()`, `find()`, and `explain()`

## Sources Consulted
- MongoDB 6.0 Manual: Index Intersection: https://www.mongodb.com/docs/v6.0/core/index-intersection/
- MongoDB Manual: Explain Results: https://www.mongodb.com/docs/manual/reference/explain-results/
- MongoDB Manual: cursor.explain(): https://www.mongodb.com/docs/manual/reference/method/cursor.explain/
- MongoDB Manual: db.collection.createIndex(): https://www.mongodb.com/docs/manual/reference/method/db.collection.createIndex/
- MongoDB Manual: Compound Indexes: https://www.mongodb.com/docs/manual/core/indexes/index-types/index-compound/

## Issues Found
- The post referred to the index-intersection guidance as "current MongoDB documentation," but the current `/manual/core/index-intersection/` URL redirects to the general indexes page and no longer contains the detailed index-intersection content. Changed the wording to avoid calling that page current, and linked directly to the MongoDB 6.0 index-intersection documentation for the archived background details.
- The post said sort-based index intersection is "disabled in plan selection." MongoDB's documented wording is that sort-based index intersection is "disfavored in plan selection." Updated the sentence to match the official wording.

## Review Notes
The mongosh examples use valid syntax for creating single-field and compound indexes and for calling `explain("executionStats")`. The `AND_SORTED` and `AND_HASH` stages are documented in MongoDB 6.0 index-intersection guidance, but the current explain results page does not list those stages explicitly, so the article appropriately frames them as possible rather than typical explain output.
