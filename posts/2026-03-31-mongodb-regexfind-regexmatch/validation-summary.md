# Validation Summary: How to Use $regexFind and $regexMatch in MongoDB Aggregation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (aggregation framework)
- `$regexMatch` operator
- `$regexFind` operator
- `$regexFindAll` operator
- PCRE regular expressions

## Sources Consulted
- MongoDB official documentation for `$regexMatch`: https://www.mongodb.com/docs/manual/reference/operator/aggregation/regexMatch/
- MongoDB official documentation for `$regexFind`: https://www.mongodb.com/docs/manual/reference/operator/aggregation/regexFind/
- MongoDB official documentation for `$regexFindAll`: https://www.mongodb.com/docs/manual/reference/operator/aggregation/regexFindAll/
- MongoDB official documentation for `$match`: https://www.mongodb.com/docs/manual/reference/operator/aggregation/match/
- MongoDB official documentation for `$arrayElemAt`: https://www.mongodb.com/docs/manual/reference/operator/aggregation/arrayElemAt/

## Issues Found
1. **Example 3 - Incorrect `idx` value**: The output claimed `idx: 19` for the match "port 8080" in the string "ERROR: timeout on port 8080". The substring "port" starts at character index 18, not 19. Fixed to `idx: 18`.

2. **Example 5 - Incorrect `idx` value**: The output claimed `idx: 34` for the match "42" in the string "ERROR: null pointer at line 42". The substring "42" starts at character index 28, not 34. Fixed to `idx: 28`.

3. **Example 2 - Incomplete `$match` output**: The output for the `$match` stage omitted the `email` field from the returned documents. Since `$match` passes through complete documents (unlike `$project`), the output should include all fields. Added the missing `email` field to both result documents.

## Review Notes
- All operator syntax, options, and descriptions are accurate and consistent with MongoDB documentation.
- The `$let` pattern in Example 4 for extracting capture group values is correct — `$arrayElemAt` on null (when `$regexFind` returns null) correctly returns null rather than erroring.
- The regex patterns used are valid PCRE and behave as described.
- These operators were introduced in MongoDB 4.2; the post does not mention a minimum version requirement, which could be noted in a future update.
- Example 6 has no output shown, which is fine as the pattern is straightforward (`$size` wrapping `$regexFindAll`).
