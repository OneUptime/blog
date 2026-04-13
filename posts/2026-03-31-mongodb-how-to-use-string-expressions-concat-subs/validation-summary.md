# Validation Summary: How to Use String Expressions in MongoDB Aggregation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB aggregation framework
- MongoDB string operators: `$concat`, `$substr`, `$substrCP`, `$toUpper`, `$toLower`, `$replaceOne`, `$replaceAll`

## Sources Consulted
- MongoDB `$substrCP` documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/substrCP/
- MongoDB `$substr` (`$substrBytes`) documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/substrBytes/
- MongoDB `$concat` documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/concat/
- MongoDB `$toUpper` documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/toUpper/
- MongoDB `$toLower` documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/toLower/
- MongoDB `$replaceAll` documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/replaceAll/

## Issues Found
1. **`$substrCP` used with negative count (-1) on line 58**: The `$substrCP` operator does not accept negative values for the count (length) parameter. A negative count causes an error. The old `$substr` (alias for `$substrBytes`) does accept `-1` to mean "rest of string." Changed `$substrCP` to `$substr` for the `suffix` field extraction where `-1` was used as the length.

2. **`$substrCP` used with negative count (-1) on line 118**: Same issue in the "Combining String Operators" section. The expression `{ $substrCP: ["$firstName", 1, -1] }` would error because `$substrCP` rejects negative counts. Changed to `$substr` which supports `-1` to extract the remainder of the string.

## Review Notes
- `$substr` is technically deprecated in favor of `$substrBytes`, but both are valid and `$substr` is more concise for blog examples. The post could mention this alias relationship in the future.
- `$replaceOne` and `$replaceAll` were introduced in MongoDB 4.4. The post does not specify a version requirement, which is fine for a general tutorial but worth noting.
- All other code examples (`$concat`, `$toUpper`, `$toLower`, `$replaceAll`, `$group` with string operators) are syntactically correct and use current APIs.
