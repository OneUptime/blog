# Validation Summary: How to Use $mod and $abs in MongoDB Aggregation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB aggregation framework
- `$mod` aggregation operator
- `$abs` aggregation operator
- `$project`, `$match`, `$sort`, `$cond`, `$eq`, `$expr`, `$subtract` aggregation stages/operators

## Sources Consulted
- MongoDB official documentation for `$mod`: https://www.mongodb.com/docs/manual/reference/operator/aggregation/mod/
- MongoDB official documentation for `$abs`: https://www.mongodb.com/docs/manual/reference/operator/aggregation/abs/
- MongoDB official documentation for `$subtract`: https://www.mongodb.com/docs/manual/reference/operator/aggregation/subtract/

## Issues Found
No technical issues found.

## Review Notes
- The post does not mention that `$mod` preserves the sign of the dividend for negative numbers (e.g., `-13 mod 9 = -4`). This is not an error since no negative dividend is used with `$mod` in the examples, but could be a useful addition in the future.
- Starting in MongoDB 7.2, the output data type of `$mod` is the larger of the two input types — a behavioral change from earlier versions. The post does not mention version-specific behavior, which is fine for a general tutorial.
- Example 7 does not include expected output, which is consistent with it being a brief "combining both" demonstration rather than a full worked example.
