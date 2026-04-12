# Validation Summary: How to Query Documents Where an Array Contains All Values in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (query operators: `$all`, `$and`, `$elemMatch`, `$size`)
- MongoDB Shell (JavaScript syntax)
- Multikey Indexes

## Sources Consulted
- [$all operator — MongoDB Manual](https://www.mongodb.com/docs/manual/reference/operator/query/all/)
- [$size operator — MongoDB Manual](https://www.mongodb.com/docs/manual/reference/operator/query/size/)
- [$elemMatch operator — MongoDB Manual](https://www.mongodb.com/docs/manual/reference/operator/query/elemMatch/)
- [Multikey Indexes — MongoDB Manual](https://www.mongodb.com/docs/manual/core/indexes/index-types/index-multikey/)
- [Multikey Index Bounds — MongoDB Manual](https://www.mongodb.com/docs/manual/core/indexes/index-types/index-multikey/multikey-index-bounds/)

## Issues Found
No technical issues found.

## Review Notes
- The description of multikey index behavior with `$all` ("MongoDB uses the index to satisfy the first condition in $all and then filters for additional values") is a simplification of the actual query planner behavior. The full story involves multikey index bound intersection, which is more nuanced with compound indexes and `$elemMatch`. However, for a single-field multikey index with `$all`, the description is a reasonable approximation and appropriate for the blog's audience.
- The `$all` + `$size` combination pattern for exact array matching (any order) is a well-known idiom and works correctly, though the official docs don't explicitly showcase this combination on a single page.
