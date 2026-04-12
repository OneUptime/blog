# Validation Summary: What Is the Difference Between a Sparse Index and a Partial Index in MongoDB

## Status
validated

## Post Type
Reference / Comparison Guide

## Technologies Covered
- MongoDB (sparse indexes, partial indexes, query planner)
- MongoDB Shell (JavaScript API: `createIndex`, `find`)

## Sources Consulted
- MongoDB Manual: Sparse Indexes — https://www.mongodb.com/docs/manual/core/index-sparse/
- MongoDB Manual: Partial Indexes — https://www.mongodb.com/docs/manual/core/index-partial/
- MongoDB Manual: createIndex — https://www.mongodb.com/docs/manual/reference/method/db.collection.createIndex/

## Issues Found

1. **Overview incorrectly stated sparse indexes exclude null values.** The Overview said sparse indexes exclude documents where the field is "missing or null." Per MongoDB documentation, a sparse index only excludes documents where the indexed field does not exist — documents where the field exists with a null value *are* included in the sparse index. (The Sparse Indexes section of the same post correctly described this behavior, creating an internal contradiction.) Fixed the Overview to say "does not exist" instead of "missing or null."

2. **Comparison table had the same null error.** The "Exclusion criteria" row for sparse indexes said "Field missing/null." Changed to "Field missing" to match MongoDB's actual behavior.

3. **"When to Use Sparse Indexes" repeated the null error.** Changed "Simple exclusion of null/missing values" to "Simple exclusion of missing values."

4. **partialFilterExpression described as accepting "any valid query filter."** This is inaccurate. MongoDB's `partialFilterExpression` only supports a specific subset of query operators: `$eq`, `$exists`, `$gt`, `$gte`, `$lt`, `$lte`, `$type`, and top-level `$and`. MongoDB 5.0 added `$in` and `$or` support. Operators like `$regex`, `$near`, `$elemMatch`, etc. are not supported. Fixed the description to list the supported operators. Also updated the comparison table from "Yes (any valid query)" to "Yes (supported operators)."

## Review Notes
- The blog uses `$in` in a `partialFilterExpression` example, which requires MongoDB 5.0+. The comparison table lists partial indexes as "3.2+" (when they were introduced). The corrected text now notes that `$in` was added in 5.0, which provides sufficient context.
- The equivalence claim between a sparse index and a partial index with `{ $exists: true }` is approximately correct but not perfectly identical in all edge cases (e.g., behavior with compound indexes). This is a reasonable simplification for a blog post.
- The code examples are syntactically correct and use current MongoDB Shell API (`db.collection.createIndex`).
