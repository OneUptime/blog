# Validation Summary: How to Store and Query Hierarchical Data in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (aggregation framework, `$graphLookup`, multikey indexes, `$regex`)
- JavaScript (MongoDB shell / Node.js driver)
- Schema design patterns for hierarchical/tree data

## Sources Consulted
- MongoDB official documentation on `$graphLookup`: https://www.mongodb.com/docs/manual/reference/operator/aggregation/graphLookup/
- MongoDB official documentation on Model Tree Structures: https://www.mongodb.com/docs/manual/applications/data-models-tree-structures/
- MongoDB official documentation on Multikey Indexes: https://www.mongodb.com/docs/manual/core/index-multikey/
- MongoDB official documentation on `$split` and `$size` aggregation operators: https://www.mongodb.com/docs/manual/reference/operator/aggregation/split/ and https://www.mongodb.com/docs/manual/reference/operator/aggregation/size/

## Issues Found
1. **Introduction incorrectly referenced "nested set model"**: The introduction listed the three patterns as "parent reference, array of ancestors (materialized path), and the nested set model," but the post never covers the nested set model (which uses left/right boundary values). The third pattern actually covered is the path string approach. Fixed the introduction to say "path string approach" instead of "nested set model."

2. **Dead variable `oldAncestorPath` in `moveNode` function**: The variable `const oldAncestorPath = [...node.ancestors, nodeId]` was computed but never referenced anywhere in the function. Removed the unused variable to avoid confusing readers.

## Review Notes
- The `moveNode` function is declared `async` but does not use `await` on any database calls. This works in the MongoDB shell (mongosh) where operations are synchronous, but would need `await` on each `findOne`, `updateOne`, and `find().forEach()` call if used with the Node.js MongoDB driver. Since the rest of the post mostly uses shell-style syntax, this is acceptable but slightly inconsistent with the `async` declaration.
- The depth calculation comment says "counting dots" but `$size` of `$split` actually counts path segments (dots + 1). The code is correct and produces a reasonable depth value (root = 1), but the comment is slightly imprecise.
- The `moveNode` function iterates a cursor while updating matching documents, which could theoretically cause issues in production. For a tutorial this is fine, but production code should snapshot IDs first or use bulk operations.
