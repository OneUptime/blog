# Validation Summary: How to Use $min to Update a Field Only If the New Value Is Lower

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB
- MongoDB Update Operators ($min, $max, $set)
- MongoDB Aggregation Pipeline Updates
- mongosh (MongoDB Shell)

## Sources Consulted
- MongoDB $min update operator documentation: https://www.mongodb.com/docs/manual/reference/operator/update/min/
- MongoDB $max update operator documentation: https://www.mongodb.com/docs/manual/reference/operator/update/max/
- MongoDB BSON comparison order: https://www.mongodb.com/docs/manual/reference/bson-type-comparison-order/
- MongoDB update with aggregation pipeline: https://www.mongodb.com/docs/manual/tutorial/update-documents-with-aggregation-pipeline/

## Issues Found
1. **Incorrect use of field reference in update operator (line 119)**: The example `{ $max: { price: "$cost" } }` used the `"$cost"` string as if it were a field reference. However, standard update operators like `$max` treat `"$cost"` as a literal string, not a reference to the `cost` field. Field references with the `$` prefix only work inside aggregation pipeline updates. Fixed by converting to an aggregation pipeline update: `[{ $set: { price: { $max: ["$price", "$cost"] } } }]`, which correctly references both the `price` and `cost` fields to ensure `price >= cost`.

## Review Notes
- All other code examples are syntactically correct and accurately demonstrate the behavior of the `$min` operator.
- The explanation of BSON comparison order usage is correct but could benefit from a link to MongoDB's BSON comparison order documentation in a future update.
- The `$min` behavior when a field does not exist is correctly described (acts like `$set`).
- The date comparison example is correct; MongoDB compares Date objects using BSON date comparison.
