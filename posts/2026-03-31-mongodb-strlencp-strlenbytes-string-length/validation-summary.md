# Validation Summary: How to Use $strLenCP and $strLenBytes for String Length in MongoDB Aggregation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB aggregation framework
- `$strLenCP` aggregation operator
- `$strLenBytes` aggregation operator
- `$expr` with `$match` for expression-based filtering
- UTF-8 encoding

## Sources Consulted
- MongoDB Manual — $strLenCP: https://www.mongodb.com/docs/manual/reference/operator/aggregation/strLenCP/
- MongoDB Manual — $strLenBytes: https://www.mongodb.com/docs/manual/reference/operator/aggregation/strLenBytes/
- Unicode Standard — UTF-8 encoding rules and code point vs grapheme cluster distinction

## Issues Found
1. **Emoji code point claim was overly broad.** The original text stated that for "multibyte characters (like accented letters, CJK characters, or emoji), this counts each character as one code point regardless of byte size." This is incorrect for composite emoji sequences (flag emoji, skin-tone modified emoji, ZWJ family emoji), which consist of multiple code points. Fixed by clarifying that simple emoji are one code point but composite emoji sequences return counts greater than one.

2. **Summary overstated $strLenCP as counting "characters as users perceive them."** `$strLenCP` counts Unicode code points, not grapheme clusters. For most text this aligns with perceived characters, but for composite emoji it does not. Fixed by stating it counts "Unicode code points, which aligns with user-perceived character count for most international text."

## Review Notes
- All code examples use correct syntax and would run as shown.
- The `$expr` usage inside `$match` is correctly demonstrated.
- The UTF-8 byte size claims (1 byte for ASCII, 2-4 bytes for non-ASCII) are accurate.
- The "café" examples are correct: `$strLenCP` returns 4 and `$strLenBytes` returns 5.
- Both operators are current and non-deprecated as of MongoDB 8.2.
- Note: both operators will error (not return null) if the argument resolves to null or a missing field. The post does not discuss null handling, which is acceptable for a tutorial focused on basic usage.
