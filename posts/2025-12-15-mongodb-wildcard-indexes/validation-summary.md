# Validation Summary: How to Use MongoDB Wildcard Indexes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB wildcard indexes
- MongoDB compound wildcard indexes
- MongoDB wildcardProjection
- MongoDB query planning and explain output
- JavaScript / mongosh examples

## Sources Consulted
- MongoDB Manual: Wildcard Indexes - https://www.mongodb.com/docs/manual/core/indexes/index-types/index-wildcard/
- MongoDB Manual: db.collection.createIndex() wildcard options - https://www.mongodb.com/docs/manual/reference/method/db.collection.createindex/
- MongoDB Manual: Wildcard Index Restrictions - https://www.mongodb.com/docs/manual/core/indexes/index-types/index-wildcard/reference/restrictions/
- MongoDB Manual: Wildcard Indexes on Embedded Objects and Arrays - https://www.mongodb.com/docs/manual/core/indexes/index-types/index-wildcard/reference/embedded-object-behavior/
- MongoDB Manual: Compound Wildcard Indexes - https://www.mongodb.com/docs/manual/core/indexes/index-types/index-wildcard/index-wildcard-compound/

## Issues Found
- The post stated that wildcard indexes do not support positional array queries. MongoDB documents that wildcard indexes do not record array positions, but may still support query paths with 8 or fewer explicit array indices. Updated the limitation and example to distinguish supported explicit array-index paths from unsupported embedded array value paths.
- The post implied that a wildcard index supports multiple equality predicates under the wildcard path in the same way as a targeted compound index. MongoDB can only use the wildcard index term to support one query predicate. Updated the comment to explain that one field is indexed and the other is filtered.
- The post said wildcard indexes cannot be used for sorting. MongoDB can use a wildcard index for sort when the wildcard index is selected for the query predicate, the sort is on the same predicate field, and the field is never an array. Updated the section and examples.
- A performance example used `wildcardProjection` with a path-specific wildcard index key (`{ "attributes.$**": 1 }`), which MongoDB does not allow. Changed the key to `{ "$**": 1 }` so the projection example is valid.
- The final best-practices example said a query combines separate regular and wildcard indexes. MongoDB may choose different plans and index intersection is not guaranteed. Updated the wording to say the query has index support for both known and dynamic fields and should be verified with `explain()`.

## Review Notes
The post is accurate after the fixes. Wildcard indexes are useful for unpredictable field names, but MongoDB's own guidance notes they should not replace workload-based targeted index planning because targeted indexes generally perform better for known query patterns.
