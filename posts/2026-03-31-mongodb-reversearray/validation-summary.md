# Validation Summary: How to Use $reverseArray in MongoDB Aggregation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB aggregation framework
- `$reverseArray` aggregation expression
- `$slice` aggregation expression
- `$sortArray` aggregation expression (MongoDB 5.2+)
- `$push` accumulator in `$group` stage
- `$cond` and `$isArray` expressions

## Sources Consulted
- MongoDB official docs: `$reverseArray` — https://www.mongodb.com/docs/manual/reference/operator/aggregation/reverseArray/
- MongoDB official docs: `$slice` — https://www.mongodb.com/docs/manual/reference/operator/aggregation/slice/
- MongoDB official docs: `$sortArray` — https://www.mongodb.com/docs/manual/reference/operator/aggregation/sortArray/

## Issues Found
1. **Example 4 — Inline array literal passed without `$literal`**: The original code used `{ $reverseArray: [1, 2, 3, 4, 5] }`. According to the MongoDB documentation, passing a bare array literal to an expression operator causes parsing ambiguity — MongoDB interprets it as an argument list rather than an array value. The fix is to wrap the array in `$literal`: `{ $reverseArray: { $literal: [1, 2, 3, 4, 5] } }`. Updated the code accordingly.

## Review Notes
- Example 6 uses `$sortArray`, which requires MongoDB 5.2 or later. The post does not mention this version requirement. This is not incorrect but could be helpful context for readers on older versions.
- The "Use Cases" section mentions "Inverting sort order after `$sortArray` when descending sort is not directly available." In practice, `$sortArray` does support descending sort directly via `sortBy: { field: -1 }`, so this specific use case is somewhat contrived. However, the phrasing is conditional and not technically wrong.
- Example 3 relies on `$sort` before `$group` to preserve insertion order in `$push`. This is a well-known and widely used pattern, though MongoDB documentation does not strictly guarantee order preservation through `$group` in all deployment topologies (e.g., sharded clusters).
