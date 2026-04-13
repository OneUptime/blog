# Validation Summary: How to Create a Wildcard Index for Dynamic Schemas in MongoDB

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MongoDB (4.2+ for wildcard indexes, 7.0+ for compound wildcard indexes)
- MongoDB Shell (mongosh) commands
- MongoDB indexing system

## Sources Consulted
- MongoDB official documentation on Wildcard Indexes: https://www.mongodb.com/docs/manual/core/index-wildcard/
- MongoDB official documentation on `createIndex()`: https://www.mongodb.com/docs/manual/reference/method/db.collection.createIndex/
- MongoDB official documentation on `wildcardProjection`: https://www.mongodb.com/docs/manual/reference/method/db.collection.createIndex/#std-label-createIndex-method-wildcard-option
- MongoDB official documentation on Compound Wildcard Indexes (7.0): https://www.mongodb.com/docs/manual/core/index-compound-wildcard/
- MongoDB official documentation on Wildcard Index Restrictions: https://www.mongodb.com/docs/manual/reference/index-wildcard-restrictions/

## Issues Found
No technical issues found.

## Review Notes
- All code examples use correct syntax and would work as described in MongoDB 4.2+ (or 7.0+ for compound wildcard indexes).
- The `wildcardProjection` examples correctly show both inclusion and exclusion patterns, and correctly note these are mutually exclusive modes.
- The limitations list is accurate and comprehensive for the scope of the post.
- `db.products.stats().indexSizes` is a valid way to check index sizes, though `db.collection.aggregate([{$collStats: {storageStats: {}}}])` is the newer recommended approach. The `stats()` helper remains functional and widely used, so this is not an error.
- The post could mention in the future that wildcard indexes do not index the `_id` field by default (it has its own default index), but this omission does not constitute a technical error.
