# Validation Summary: How to Use $split and $indexOfCP in MongoDB Aggregation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Aggregation Framework
- `$split` operator
- `$indexOfCP` operator
- `$substrCP` operator
- `$strLenCP` operator
- `$arrayElemAt` operator
- `$unwind` stage
- `$group` stage

## Sources Consulted
- MongoDB official documentation for `$split`: https://www.mongodb.com/docs/manual/reference/operator/aggregation/split/
- MongoDB official documentation for `$indexOfCP`: https://www.mongodb.com/docs/manual/reference/operator/aggregation/indexOfCP/
- MongoDB official documentation for `$substrCP`: https://www.mongodb.com/docs/manual/reference/operator/aggregation/substrCP/
- MongoDB official documentation for `$strLenCP`: https://www.mongodb.com/docs/manual/reference/operator/aggregation/strLenCP/
- MongoDB official documentation for `$arrayElemAt`: https://www.mongodb.com/docs/manual/reference/operator/aggregation/arrayElemAt/

## Issues Found
No technical issues found.

## Review Notes
- Example 5 uses `$strLenCP` (full string length) as the count argument to `$substrCP` when extracting the domain. Since the start index is non-zero, this requests more characters than remain in the string. This works correctly because MongoDB's `$substrCP` truncates to the end of the string when the count exceeds available characters. This is a common and valid pattern, not an error.
- Example 7's output order among tags with equal counts is non-deterministic in practice, but the shown output is a valid possibility. Not an error, just worth noting.
- The `$indexOfCP` vs `$indexOfBytes` section is brief but accurate. Readers working with multi-byte characters (e.g., emoji, CJK) should prefer `$indexOfCP` for character-correct positions.
