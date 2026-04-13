# Validation Summary: How to Use $all to Match Documents with All Array Values in MongoDB

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MongoDB (`$all` query operator)
- MongoDB `$elemMatch` operator
- MongoDB multikey indexes
- Node.js MongoDB driver

## Sources Consulted
- MongoDB official documentation on `$all` operator: https://www.mongodb.com/docs/manual/reference/operator/query/all/
- MongoDB official documentation on `$elemMatch`: https://www.mongodb.com/docs/manual/reference/operator/query/elemMatch/
- MongoDB official documentation on multikey indexes: https://www.mongodb.com/docs/manual/core/index-multikey/

## Issues Found
1. **Incorrect claim about `$all: []` behavior**: The "Common Mistakes" section stated that passing an empty array `$all: []` "matches all documents (vacuously true)." This is incorrect. In MongoDB, `{ field: { $all: [] } }` actually matches **no documents** — it returns an empty result set. Fixed the bullet point to accurately state that `$all: []` matches no documents.

## Review Notes
- The explanation of `$all` vs `$in` is accurate and clearly presented.
- The `$all` with `$elemMatch` example correctly demonstrates matching array elements against compound conditions.
- The claim that `$all: ["value"]` is equivalent to a simple equality match is correct per MongoDB documentation.
- The index support section accurately describes how MongoDB uses multikey indexes with `$all` queries.
- All code examples use correct syntax for both the `mongosh` shell and the Node.js MongoDB driver.
