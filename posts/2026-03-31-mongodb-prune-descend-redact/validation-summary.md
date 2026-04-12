# Validation Summary: How to Use $$PRUNE and $$DESCEND with $redact in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB aggregation framework (`$redact` stage)
- MongoDB system variables (`$$KEEP`, `$$PRUNE`, `$$DESCEND`)
- MongoDB aggregation expressions (`$cond`, `$not`, `$lte`, `$eq`, `$or`, `$gt`, `$size`, `$setIntersection`, `$isArray`)

## Sources Consulted
- MongoDB official documentation on `$redact`: https://www.mongodb.com/docs/manual/reference/operator/aggregation/redact/
- MongoDB official documentation on aggregation system variables (`$$KEEP`, `$$PRUNE`, `$$DESCEND`): https://www.mongodb.com/docs/manual/reference/operator/aggregation/redact/#system-variables
- MongoDB official documentation on `$cond`: https://www.mongodb.com/docs/manual/reference/operator/aggregation/cond/
- MongoDB official documentation on `$setIntersection`: https://www.mongodb.com/docs/manual/reference/operator/aggregation/setIntersection/

## Issues Found
1. **Incorrect claim about array traversal behavior**: The "How $redact Traverses the Document" section stated "Arrays are not traversed element-by-element - `$redact` recurses into document-type values." This is incorrect. According to MongoDB documentation, when `$redact` encounters an array field with a `$$DESCEND` result, it applies the expression to each document element in the array individually. Fixed the paragraph to accurately describe that `$redact` processes array elements and applies the expression to each sub-document within arrays.

## Review Notes
- The `$not: ["$accessLevel"]` pattern used to check for field absence actually checks for falsiness, not strictly for field absence. If `accessLevel` were `0`, `false`, or `null`, it would also match. In the context of this tutorial where `accessLevel` is a positive integer clearance level, this works correctly, but authors should be aware of this nuance for production use cases.
- All code examples use correct MongoDB aggregation syntax and would function as described.
- The nested `$cond` pattern for `$$KEEP`/`$$DESCEND`/`$$PRUNE` decision trees is idiomatic and correct.
- The `$setIntersection` approach for array membership checking is correct and efficient.
- The advice to place `$match` before `$redact` for index utilization is accurate and a genuine best practice.
