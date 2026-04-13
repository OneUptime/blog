# Validation Summary: How to Use $stdDevPop and $stdDevSamp as Window Functions in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (5.0+ aggregation framework)
- `$setWindowFields` aggregation stage
- `$stdDevPop` and `$stdDevSamp` window operators
- `$avg`, `$addFields`, `$cond`, `$abs`, `$subtract`, `$divide` aggregation operators

## Sources Consulted
- MongoDB official documentation: `$setWindowFields` stage (https://www.mongodb.com/docs/manual/reference/operator/aggregation/setWindowFields/)
- MongoDB official documentation: `$stdDevPop` window operator (https://www.mongodb.com/docs/manual/reference/operator/aggregation/stdDevPop/)
- MongoDB official documentation: `$stdDevSamp` window operator (https://www.mongodb.com/docs/manual/reference/operator/aggregation/stdDevSamp/)
- MongoDB official documentation: Window function documents window syntax (https://www.mongodb.com/docs/manual/reference/operator/aggregation/setWindowFields/#documents-window)

## Issues Found
No technical issues found.

## Review Notes
- The example output values in Example 2 are rounded to 1 decimal place (e.g., rollingStdDevPop for hour 4 is shown as 10.8 when the precise value is ~10.87). This is acceptable for illustrative purposes and the actual MongoDB output would show full precision.
- The post correctly distinguishes when to use `$stdDevPop` vs `$stdDevSamp`, which is a common source of confusion.
- All five code examples use correct `$setWindowFields` syntax with valid window specifications (unbounded, document-based, and expanding windows).
- The z-score anomaly detection example (Example 3) properly handles the edge case of zero standard deviation with a `$cond` guard.
- Examples 4 and 5 reference different collections (`stockPrices`, `products`) without setup data, but this is fine as they serve as pattern demonstrations rather than runnable tutorials.
