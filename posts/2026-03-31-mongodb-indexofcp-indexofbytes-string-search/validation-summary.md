# Validation Summary: How to Use $indexOfCP and $indexOfBytes in MongoDB Aggregation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Aggregation Framework
- `$indexOfCP` aggregation operator
- `$indexOfBytes` aggregation operator
- `$substrCP`, `$strLenCP`, `$cond`, `$add`, `$gt` aggregation operators

## Sources Consulted
- MongoDB official documentation for `$indexOfCP`: https://www.mongodb.com/docs/manual/reference/operator/aggregation/indexOfCP/
- MongoDB official documentation for `$indexOfBytes`: https://www.mongodb.com/docs/manual/reference/operator/aggregation/indexOfBytes/
- MongoDB official documentation for `$substrCP`: https://www.mongodb.com/docs/manual/reference/operator/aggregation/substrCP/

## Issues Found
No technical issues found.

## Review Notes
- The post correctly notes that `$indexOfCP` returns `-1` when the substring is not found. Worth noting that both operators return `null` (not `-1`) when the string expression itself is null, but the post's simplification is acceptable for its scope.
- The substring extraction example uses `$strLenCP` as the count argument to `$substrCP`. This works because MongoDB truncates to end-of-string when the count exceeds the remaining characters. This is a common and valid pattern.
- All code examples use current, non-deprecated syntax compatible with MongoDB 5.x and 6.x.
