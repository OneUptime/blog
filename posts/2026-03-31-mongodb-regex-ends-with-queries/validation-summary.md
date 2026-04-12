# Validation Summary: How to Use Regex for Ends-With Queries in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (shell queries, aggregation framework)
- Regular expressions (PCRE-style as used by MongoDB)
- MongoDB indexing (B-tree indexes)

## Sources Consulted
- MongoDB documentation on `$regex` operator: https://www.mongodb.com/docs/manual/reference/operator/query/regex/
- MongoDB documentation on `$regexMatch` aggregation operator: https://www.mongodb.com/docs/manual/reference/operator/aggregation/regexMatch/
- MongoDB documentation on `$substrCP`: https://www.mongodb.com/docs/manual/reference/operator/aggregation/substrCP/
- MongoDB documentation on `$substr` (deprecated): https://www.mongodb.com/docs/manual/reference/operator/aggregation/substr/
- MongoDB documentation on `$strLenCP`: https://www.mongodb.com/docs/manual/reference/operator/aggregation/strLenCP/
- MongoDB documentation on index use with regular expressions: https://www.mongodb.com/docs/manual/reference/operator/query/regex/#index-use

## Issues Found
- **`$substr` should be `$substrCP`**: The non-regex aggregation example used `$substr` (a deprecated alias for `$substrBytes`, which operates on byte positions) together with `$strLenCP` (which returns length in Unicode code points). This mismatch would produce incorrect results for filenames containing multi-byte UTF-8 characters. Changed `$substr` to `$substrCP` so both operators work consistently with code point positions.

## Review Notes
- The post correctly notes that ends-with regex queries cannot leverage standard B-tree indexes. In practice, MongoDB may show an IXSCAN (full index scan) rather than a COLLSCAN if an index exists on the field, but the performance impact is similar since no prefix-based optimization is possible.
- The reversed-string optimization technique is a well-known and valid approach.
- All regex patterns use correct syntax and escaping conventions for both literal regex (`/.../`) and string-based `$regex` operator contexts.
