# Validation Summary: How to Build a Versioned API with MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (shell commands and aggregation pipeline)
- Node.js MongoDB driver (`mongodb` package)
- Express.js (REST API routing)
- JavaScript (transformation functions)

## Sources Consulted
- MongoDB documentation on `$set` (aggregation alias for `$addFields`): https://www.mongodb.com/docs/manual/reference/operator/aggregation/set/
- MongoDB documentation on `$merge`: https://www.mongodb.com/docs/manual/reference/operator/aggregation/merge/
- MongoDB documentation on `$unset` (aggregation): https://www.mongodb.com/docs/manual/reference/operator/aggregation/unset/
- MongoDB documentation on `$round`: https://www.mongodb.com/docs/manual/reference/operator/aggregation/round/
- MongoDB documentation on `$multiply`: https://www.mongodb.com/docs/manual/reference/operator/aggregation/multiply/
- MongoDB Node.js driver documentation on `ObjectId`: https://www.mongodb.com/docs/drivers/node/current/
- Express.js routing documentation: https://expressjs.com/en/guide/routing.html

## Issues Found
1. **Prose/code mismatch in Bulk Migration section**: The introductory text said "use `updateMany` with a filter on `schemaVersion` to batch-update old documents" but the code actually uses an aggregation pipeline with `$merge`. Changed the prose to accurately describe the aggregation pipeline approach shown in the code.

2. **Missing rounding in bulk migration pipeline**: The `$set` stage used `$multiply: ["$price", 100]` without rounding, which can produce floating-point results (e.g., 29.99 * 100 = 2999.0000000000004). This contradicts the stated goal of storing integer cents and is inconsistent with the lazy migration code that uses `Math.round(doc.price * 100)`. Wrapped the `$multiply` with `$round: [..., 0]` to ensure clean integer values.

## Review Notes
- The lazy migration pattern (`replaceOne` after read) does not use optimistic concurrency control (e.g., checking a version field in the filter). In high-concurrency environments, two concurrent reads of the same v1 document could race. This is technically correct for the scope of the tutorial but worth noting for production use.
- The `ObjectId` constructor usage (`new ObjectId(req.params.id)`) is correct for the MongoDB Node.js driver. In production, input validation should be added to handle invalid ID formats gracefully.
- The `$unset` stage in the aggregation pipeline correctly uses the string form (`"price"`) which is valid MongoDB syntax.
