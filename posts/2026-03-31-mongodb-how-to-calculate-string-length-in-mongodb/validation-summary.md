# Validation Summary: How to Calculate String Length in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB aggregation framework
- `$strLenCP` operator
- `$strLenBytes` operator
- `$ifNull`, `$expr`, `$addFields`, `$project`, `$match`, `$sort` aggregation stages/operators

## Sources Consulted
- MongoDB official documentation: `$strLenCP` — https://www.mongodb.com/docs/manual/reference/operator/aggregation/strLenCP/
- MongoDB official documentation: `$strLenBytes` — https://www.mongodb.com/docs/manual/reference/operator/aggregation/strLenBytes/
- MongoDB official documentation: `$ifNull` — https://www.mongodb.com/docs/manual/reference/operator/aggregation/ifNull/
- MongoDB official documentation: `$expr` — https://www.mongodb.com/docs/manual/reference/operator/query/expr/
- UTF-8 encoding specification (hiragana characters use 3 bytes per code point in UTF-8)

## Issues Found
- **Incorrect example string in $strLenCP vs $strLenBytes section**: The post said `For a Japanese string like "Hello" (5 characters, 15 bytes in UTF-8)` but "Hello" is ASCII and would be 5 bytes, not 15. Replaced "Hello" with "こんにちは" (the actual Japanese word for hello in hiragana), which is correctly 5 code points and 15 bytes in UTF-8 (3 bytes per hiragana character).

## Review Notes
- All aggregation pipeline syntax is correct and uses current, non-deprecated MongoDB operators.
- The use of `$ifNull` to guard against null values before passing to `$strLenCP` is a good practice, since `$strLenCP` throws an error on null input.
- The phone number validation example correctly uses `$addFields` to compute the length in one stage and then references it in a subsequent `$match` stage.
