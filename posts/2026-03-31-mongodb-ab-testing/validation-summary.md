# Validation Summary: How to Implement A/B Testing with MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB
- Mongoose ODM (Node.js)
- MongoDB Aggregation Framework

## Sources Consulted
- Mongoose Schema documentation: https://mongoosejs.com/docs/guide.html
- Mongoose Schema Types (Mixed): https://mongoosejs.com/docs/schematypes.html#mixed
- Mongoose compound indexes: https://mongoosejs.com/docs/guide.html#indexes
- MongoDB `findOneAndUpdate` with upsert: https://www.mongodb.com/docs/manual/reference/method/db.collection.findOneAndUpdate/
- MongoDB `$setOnInsert` operator: https://www.mongodb.com/docs/manual/reference/operator/update/setOnInsert/
- MongoDB Aggregation `$group` stage: https://www.mongodb.com/docs/manual/reference/operator/aggregation/group/
- MDN `Math.imul`: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/imul
- MDN operator precedence (bitwise OR vs addition): https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Operator_precedence

## Issues Found
No technical issues found.

## Review Notes
- The `simpleHash` function uses the same hash value for both audience gating (`hash % 100`) and variant bucketing (`hash % totalWeight`). This introduces correlation between the two decisions. For production systems handling many concurrent experiments, using separate salts or independent hash functions for audience gating vs. variant assignment would improve statistical independence. However, this is a design trade-off rather than a technical error, and is acceptable for the tutorial context.
- The `getOrAssignVariant` function has a benign race condition: two concurrent requests for the same user could both reach `findOneAndUpdate`. This is safely handled by the `$setOnInsert` + `upsert: true` pattern combined with the unique compound index, and the deterministic hash guarantees both requests compute the same variant.
- The `value` field in `ConversionEvent` is optional (no `required: true`), which is correct since not all event types (e.g., clicks) carry a monetary value. The `$sum: '$value'` aggregation correctly treats missing/null values as 0.
