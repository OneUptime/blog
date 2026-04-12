# Validation Summary: How to Store and Query Decimal128 Values in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (mongosh, BSON types)
- Decimal128 (IEEE 754-2008 decimal128 format)
- Node.js MongoDB driver (`mongodb` npm package)
- Python PyMongo driver (`bson.decimal128`)
- MongoDB Aggregation Framework

## Sources Consulted
- MongoDB Manual — BSON Types / Decimal128: https://www.mongodb.com/docs/manual/reference/bson-types/#decimal128
- MongoDB Manual — `NumberDecimal()` shell helper: https://www.mongodb.com/docs/manual/core/shell-types/#numberdecimal
- MongoDB Manual — Aggregation arithmetic operators (`$add`, `$subtract`, `$multiply`, `$divide`): https://www.mongodb.com/docs/manual/reference/operator/aggregation/
- Node.js MongoDB Driver — Decimal128 API: https://mongodb.github.io/node-mongodb-native/
- PyMongo — `bson.decimal128.Decimal128`: https://pymongo.readthedocs.io/en/stable/api/bson/decimal128.html
- IEEE 754-2008 standard (decimal128 format specification)

## Issues Found
No technical issues found.

## Review Notes
- The claim that Decimal128 provides arithmetic "without rounding errors" is slightly simplified — Decimal128 can still round values exceeding 34 significant digits. However, in the financial context discussed in this post, the statement is accurate and appropriate.
- The summary mentions `Decimal128.fromString()` as the driver method, which is specific to the Node.js driver. In Python, the constructor accepts a string directly (`Decimal128("49.99")`). This is not incorrect but could be more precise.
- The aggregation example assumes `$price` is already stored as Decimal128. If `$price` were a double, mixing it with a Decimal128 literal (`NumberDecimal("0.08")`) would promote the result to Decimal128, which is correct MongoDB behavior but worth noting for readers.
