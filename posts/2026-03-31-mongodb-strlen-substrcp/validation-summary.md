# Validation Summary: How to Use $strLenCP and $substrCP in MongoDB Aggregation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Aggregation Framework
- `$strLenCP` operator
- `$substrCP` operator
- `$indexOfCP` operator
- `$split` operator
- `$reduce` operator
- `$cond` operator
- `$concat` operator
- Unicode / UTF-8 encoding

## Sources Consulted
- MongoDB official documentation for `$strLenCP`: https://www.mongodb.com/docs/manual/reference/operator/aggregation/strLenCP/
- MongoDB official documentation for `$substrCP`: https://www.mongodb.com/docs/manual/reference/operator/aggregation/substrCP/
- MongoDB official documentation for `$strLenBytes`: https://www.mongodb.com/docs/manual/reference/operator/aggregation/strLenBytes/
- MongoDB official documentation for `$indexOfCP`: https://www.mongodb.com/docs/manual/reference/operator/aggregation/indexOfCP/
- MongoDB official documentation for `$split`: https://www.mongodb.com/docs/manual/reference/operator/aggregation/split/
- MongoDB official documentation for `$reduce`: https://www.mongodb.com/docs/manual/reference/operator/aggregation/reduce/
- UTF-8 encoding reference for "Café" byte-length verification

## Issues Found
1. **Example 6 output for `_id: 1` was incorrect.** The bio "Software engineer from NY" splits into ["Software", "engineer", "from", "NY"]. Taking the first character of each word with `$substrCP: ["$$this", 0, 1]` yields "S", "e", "f", "N" → concatenated as "SefN". The post incorrectly showed "SefNY", which would imply `$substrCP: ["NY", 0, 1]` returns "NY" (2 characters) instead of "N" (1 character). Fixed to "SefN".

2. **Example 6 output for `_id: 2` was incorrect.** The bio "ML researcher" splits into ["ML", "researcher"]. Taking the first character of each word yields "M", "r" → "Mr". The post incorrectly showed "MR" (uppercase R), but `$substrCP: ["researcher", 0, 1]` returns the lowercase "r" as it appears in the original string. Fixed to "Mr".

## Review Notes
- The technique in Example 4 (domain extraction) uses `$strLenCP: "$email"` as the length parameter for `$substrCP`, which is intentionally larger than the remaining characters after the `@` sign. This works because MongoDB's `$substrCP` returns only the remaining characters when the specified length exceeds the string. This is correct but could be confusing to beginners — a comment in the code already clarifies this.
- Example 2 (filter usernames shorter than 5 characters) would return an empty result set with the given sample data, since all usernames are 6+ characters. The example omits showing output, which is acceptable since it demonstrates the syntax pattern.
- The note about `$split` returning `[""]` for an empty string is relevant to Example 6 (`_id: 3`), where `$substrCP: ["", 0, 1]` correctly returns `""`, making the final result an empty string.
