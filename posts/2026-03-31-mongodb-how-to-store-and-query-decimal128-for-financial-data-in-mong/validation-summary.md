# Validation Summary: How to Store and Query Decimal128 for Financial Data in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (Decimal128 / NumberDecimal BSON type)
- mongosh (mongo shell)
- Node.js MongoDB official driver (`mongodb` npm package)
- Python PyMongo (`bson.decimal128`)
- MongoDB JSON Schema validation (`$jsonSchema`)
- MongoDB aggregation framework

## Sources Consulted
- MongoDB manual — BSON Types / Decimal128: https://www.mongodb.com/docs/manual/reference/bson-types/#decimal128
- MongoDB manual — `NumberDecimal()`: https://www.mongodb.com/docs/manual/core/shell-types/#numberdecimal
- MongoDB Node.js driver API — `Decimal128.fromString()`: https://mongodb.github.io/node-mongodb-native/
- PyMongo documentation — `bson.decimal128.Decimal128`: https://pymongo.readthedocs.io/en/stable/api/bson/decimal128.html
- MongoDB manual — Schema Validation / `$jsonSchema`: https://www.mongodb.com/docs/manual/core/schema-validation/
- MongoDB manual — `$type` query operator: https://www.mongodb.com/docs/manual/reference/operator/query/type/
- IEEE 754-2008 standard (128-bit decimal floating-point format)

## Issues Found
1. **Misleading "running balance" label (line 109):** The text said "Computing a running balance per account:" but the accompanying aggregation pipeline only groups transactions into an array using `$push` — it does not compute a cumulative running balance. A true running balance would require `$setWindowFields` (MongoDB 5.0+) or client-side computation. Fixed by changing the label to "Collecting all transactions per account:" to accurately describe what the code does.

## Review Notes
- The double-to-Decimal128 conversion section uses `doc.amount.toString()` inside a `forEach` loop. While this works correctly (JavaScript's `Number.prototype.toString()` produces the shortest unique decimal representation), a `bulkWrite` approach would be more performant for large datasets. This is a best-practice consideration, not a correctness issue.
- All code examples are syntactically correct and use current, non-deprecated APIs.
- The `bsonType: "decimal"` value in the JSON Schema validator is the correct BSON type alias for Decimal128.
- The warning about mixing `double` and `Decimal128` types is accurate — equality checks fail because the double `9.99` carries floating-point imprecision (`9.9900000000000002...`) while Decimal128 `"9.99"` is exact.
