# Validation Summary: How to Use $expr to Compare Two Fields in the Same Document

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB `$expr` operator
- MongoDB query operators (`$gt`, `$lt`, `$eq`, `$lte`)
- MongoDB aggregation expressions (`$multiply`, `$subtract`, `$and`)
- MongoDB aggregation pipeline (`$match`, `$project`)
- MongoDB `$where` operator (comparison)

## Sources Consulted
- MongoDB official documentation: `$expr` operator (https://www.mongodb.com/docs/manual/reference/operator/query/expr/)
- MongoDB official documentation: Aggregation expression operators (https://www.mongodb.com/docs/manual/reference/operator/aggregation/)
- MongoDB official documentation: `$where` operator (https://www.mongodb.com/docs/manual/reference/operator/query/where/)
- MongoDB official documentation: BSON comparison order (https://www.mongodb.com/docs/manual/reference/bson-type-comparison-order/)
- MongoDB official documentation: Index usage with `$expr` (https://www.mongodb.com/docs/manual/reference/operator/query/expr/#index-usage)

## Issues Found
- **Overdue Orders description mismatch (line 104)**: The description stated "Find orders where `shippedAt` is null or `shippedAt` is after `expectedDelivery`" but the query `{ $expr: { $gt: ["$shippedAt", "$expectedDelivery"] } }` does not handle the null case. In MongoDB's BSON comparison order, `null` is less than dates, so `$gt: [null, <date>]` evaluates to `false`. Fixed by removing the "null or" claim from the description to match the actual query behavior.

## Review Notes
- The post states `$expr` index support starts in MongoDB 5.0+. In reality, `$expr` gained some index support for equality comparisons as early as MongoDB 3.6, with expanded range comparison index support added in 5.0. The claim is directionally correct but slightly simplified.
- The `$where` operator is described as a "deprecated pattern" in the comparison table. While `$where` is not officially deprecated in MongoDB, it is strongly discouraged in favor of `$expr`. The characterization is reasonable for practical guidance.
- The claim that `$expr` "must evaluate to a boolean" is a simplification. MongoDB uses truthiness/falsiness of the result, but since all examples use comparison operators that return booleans, this is effectively correct for the scope of the post.
- String comparison with `$lt` (firstName vs lastName) uses MongoDB's byte-by-byte comparison, not true linguistic alphabetical ordering. The "alphabetically" comment is approximately correct for ASCII same-case strings but not precise for mixed-case or Unicode strings.
