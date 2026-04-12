# Validation Summary: How to Use ASCII() and CHAR() Functions in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL (string functions: ASCII(), CHAR(), ORD())
- SQL
- Character encoding (ASCII, UTF-8, utf8mb4)

## Sources Consulted
- MySQL 8.0 Reference Manual — String Functions and Operators: https://dev.mysql.com/doc/refman/8.0/en/string-functions.html#function_ascii
- MySQL 8.0 Reference Manual — CHAR() function: https://dev.mysql.com/doc/refman/8.0/en/string-functions.html#function_char
- MySQL 8.0 Reference Manual — ORD() function: https://dev.mysql.com/doc/refman/8.0/en/string-functions.html#function_ord
- ASCII table reference (standard 7-bit ASCII, 0-127)

## Issues Found

### Issue 1: Misleading comment in "Validating Input Characters" section
- **What was wrong:** The SQL comment stated "Check if a column contains only printable ASCII characters (32-126)" but the query only calls `ASCII(value)`, which evaluates only the first character of the string, not all characters.
- **What was changed:** Updated the comment to "Check if the first character of a column value is a printable ASCII character (32-126)" to accurately describe what the query does.
- **Why:** `ASCII()` by definition only evaluates the leftmost character. The original comment would mislead readers into thinking the query validates the entire string content.

### Issue 2: Incorrect description and values in "ASCII() vs ORD()" section
- **What was wrong:** The post claimed that `ORD()` "returns the Unicode code point for multi-byte characters." This is incorrect. MySQL's `ORD()` returns a numeric value computed from the constituent bytes of a multi-byte character using the formula: `(1st byte) + (2nd byte × 256) + (3rd byte × 256²) + ...`. The example also used `'e'` (plain e) instead of `'é'` (e-acute) and gave incorrect return values: it claimed `ORD('é')` returns 233 and `ASCII('é')` returns 195. In reality, for 'é' in UTF-8 (encoded as bytes 0xC3 0xA9): `ASCII('é')` returns 195 (correct) but `ORD('é')` returns 43459 (195 + 169×256), not 233. The value 233 is the Unicode code point of é, not the ORD() return value.
- **What was changed:** Rewrote the section description to accurately explain ORD()'s byte-based computation formula. Fixed the SQL examples to use the actual 'é' character with correct return values (195 for ASCII, 43459 for ORD).
- **Why:** The original description fundamentally misrepresented how ORD() works, and the example values were mathematically incorrect for UTF-8 encoded strings.

## Review Notes
- The `CHAR()` with `USING utf8mb4` examples (e.g., `CHAR(0x00e9 USING utf8mb4)` and `CHAR(9786 USING utf8mb4)`) demonstrate multi-byte character generation. The exact behavior of CHAR() with USING for values > 255 can vary by MySQL version and configuration. Readers should test these examples against their specific MySQL version.
- The "Generating Alphabetical Sequences" example uses UNION without ORDER BY. While MySQL typically returns rows in the order listed, this is not guaranteed by the SQL standard. In practice it works as shown, but adding ORDER BY would make it more robust.
- The "Validating Input Characters" query only checks the first character. Readers who need to validate that an entire string contains only printable ASCII would need a different approach (e.g., using a regular expression with REGEXP).
- All ASCII code values in the reference table and basic examples are correct.
- The CHAR() basic examples (single and multi-argument forms, NULL handling) are all correct.
- The case conversion arithmetic examples are correct (uppercase and lowercase letters differ by 32 in ASCII).
