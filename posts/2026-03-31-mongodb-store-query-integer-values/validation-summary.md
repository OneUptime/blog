# Validation Summary: How to Store and Query Integer Values in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (BSON types, mongosh, aggregation framework, schema validation)
- Node.js MongoDB driver (`Int32`, `Long` classes)
- JavaScript

## Sources Consulted
- MongoDB BSON Types documentation (https://www.mongodb.com/docs/manual/reference/bson-types/)
- MongoDB mongosh `NumberInt()` and `NumberLong()` documentation (https://www.mongodb.com/docs/manual/reference/method/NumberInt/, https://www.mongodb.com/docs/manual/reference/method/NumberLong/)
- MongoDB Node.js driver documentation for Int32 and Long (https://www.mongodb.com/docs/drivers/node/current/)
- MongoDB `$inc` operator documentation (https://www.mongodb.com/docs/manual/reference/operator/update/inc/)
- MongoDB `$type` operator documentation (https://www.mongodb.com/docs/manual/reference/operator/query/type/)
- MongoDB JSON Schema Validation documentation (https://www.mongodb.com/docs/manual/core/schema-validation/)
- MongoDB comparison and sort order documentation (https://www.mongodb.com/docs/manual/reference/bson-type-comparison-order/)

## Issues Found
1. **Incorrect claim about integer/double type mismatch (line 88)**: The introductory sentence in the "Type Mismatch Bug" section stated "Mixing integer and double types in a collection causes type-sensitive queries to miss documents." This is incorrect — MongoDB compares across all numeric types (int, long, double, Decimal128) seamlessly without type coercion issues. The actual example in the section correctly demonstrates a **string vs. number** mismatch. Fixed the sentence to accurately describe string/number mismatch as the cause.

2. **`parseInt()` produces a BSON double, not an integer (line 108)**: The fix for string-typed fields used `parseInt(doc.price)`, which returns a JavaScript number that MongoDB stores as a BSON double. In a blog post specifically about integer storage, this contradicts the post's own advice. Changed to `NumberInt(doc.price)` which correctly stores the value as a 32-bit BSON integer in mongosh.

## Review Notes
- The `$sum` usage inside `$project` (rather than `$group`) works correctly when summing values from an array field like `$items.quantity` — this is valid since MongoDB 3.2+.
- The `new Long(9876543210n)` constructor call in the Node.js driver example is correct for bson v5+/mongodb driver v6+, which accepts BigInt as a constructor argument.
- The blog correctly notes that JavaScript numbers are stored as BSON doubles by default in the Node.js driver — this is an important and commonly misunderstood point.
