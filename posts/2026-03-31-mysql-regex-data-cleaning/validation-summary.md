# Validation Summary: How to Use Regular Expressions for Data Cleaning in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0+
- MySQL Regular Expression functions (REGEXP, REGEXP_REPLACE, REGEXP_SUBSTR, REGEXP_INSTR)
- ICU regular expression engine
- MySQL CHECK constraints (8.0.16+)

## Sources Consulted
- MySQL 8.0 Reference Manual: Regular Expression Function and Operator Descriptions (https://dev.mysql.com/doc/refman/8.0/en/regexp.html)
- MySQL 8.0 Reference Manual: REGEXP_REPLACE (https://dev.mysql.com/doc/refman/8.0/en/regexp.html#function_regexp-replace)
- MySQL 8.0 Reference Manual: REGEXP_SUBSTR (https://dev.mysql.com/doc/refman/8.0/en/regexp.html#function_regexp-substr)
- MySQL 8.0 Reference Manual: CREATE TABLE CHECK constraints (https://dev.mysql.com/doc/refman/8.0/en/create-table-check-constraints.html)
- ICU Regular Expressions documentation (https://unicode-org.github.io/icu/userguide/strings/regexp.html)

## Issues Found

### 1. Invalid REGEXP_SUBSTR call with 6 arguments (Critical)
- **What was wrong:** The "Extract domain from email" example used `REGEXP_SUBSTR(email, '@(.+)$', 1, 1, NULL, 1)` with 6 arguments. MySQL's `REGEXP_SUBSTR` only accepts 5 parameters: `REGEXP_SUBSTR(expr, pat [, pos [, occurrence [, match_type]]])`. The 6th `subexpr`/`group_num` parameter for capture group extraction is an Oracle-specific feature that does not exist in any MySQL version.
- **What was changed:** Replaced with `REGEXP_SUBSTR(email, '[^@]+$')`, which matches one or more non-`@` characters at the end of the string, effectively extracting the domain without needing capture groups.
- **Why:** The original query would throw an error in MySQL due to incorrect number of arguments.

### 2. Phone reformatting applied SUBSTRING to unstripped phone value (Bug)
- **What was wrong:** The phone reformatting query used `SUBSTRING(phone, 1, 3)`, `SUBSTRING(phone, 4, 3)`, and `SUBSTRING(phone, 7, 4)` on the raw `phone` column. However, the `WHERE` clause used `LENGTH(REGEXP_REPLACE(phone, '[^0-9]', '')) = 10`, implying the phone may still contain non-digit characters (e.g., dashes, spaces). Applying `SUBSTRING` to an unstripped value like `123-456-7890` would yield incorrect substrings (`123`, `-45`, `6-78`) instead of the intended digit groups.
- **What was changed:** Wrapped each `SUBSTRING` call around `REGEXP_REPLACE(phone, '[^0-9]', '')` so the digit extraction operates on the cleaned value, making the query self-contained and correct regardless of the input format.
- **Why:** Without this fix, the query would produce malformed phone numbers for any input containing non-digit characters.

## Review Notes
- The use of REGEXP inside CHECK constraints is plausible and follows MySQL's documented rules (deterministic built-in functions are allowed), but is not explicitly demonstrated in official MySQL documentation examples. Users should test this in their specific MySQL version.
- The HTML tag stripping regex `<[^>]+>` is a common simplified approach that works for basic cases but will not handle all edge cases (e.g., `>` characters inside attribute values). This is acceptable for a blog tutorial but worth noting for production use.
- All regex escape sequences (double backslashes like `\\s+`, hex escapes like `\\x00-\\x1F`) are correct for MySQL's string literal parsing combined with ICU regex engine interpretation.
