# Validation Summary: How to Trim Whitespace from All Rows in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (8.0+ for REGEXP_REPLACE features)
- SQL string functions: TRIM, LTRIM, RTRIM, REPLACE, REGEXP_REPLACE
- MySQL triggers (BEFORE INSERT)

## Sources Consulted
- MySQL 8.0 Reference Manual: String Functions and Operators (https://dev.mysql.com/doc/refman/8.0/en/string-functions.html#function_trim)
- MySQL 8.0 Reference Manual: REGEXP_REPLACE (https://dev.mysql.com/doc/refman/8.0/en/regexp.html#function_regexp-replace)
- MySQL 8.0 Reference Manual: String Literals and Escape Sequences (https://dev.mysql.com/doc/refman/8.0/en/string-literals.html)
- MySQL 8.0 Reference Manual: CHAR Function (https://dev.mysql.com/doc/refman/8.0/en/string-functions.html#function_char)
- MySQL 8.0 Reference Manual: CREATE TRIGGER (https://dev.mysql.com/doc/refman/8.0/en/create-trigger.html)

## Issues Found
- **`'\u00a0'` in Non-Breaking Spaces section**: MySQL does not support `\uXXXX` Unicode escape sequences in string literals. The expression `REPLACE(name, '\u00a0', ' ')` would not match non-breaking space characters; MySQL interprets the unrecognized `\u` escape as the literal character `u`, so the string becomes `'u00a0'` (5 literal characters). Fixed by replacing `'\u00a0'` with `CHAR(160)`, which correctly produces the non-breaking space character and is consistent with the WHERE clause that already used `CHAR(160)`.

## Review Notes
- MySQL's `TRIM()` function only removes space characters (0x20) by default, not all whitespace (tabs, newlines, etc.). The post uses the word "whitespace" loosely when describing TRIM, but this is acceptable because tabs and newlines are addressed in a dedicated later section.
- The `REGEXP_REPLACE(name, '\\s+', ' ')` pattern in the "Removing Internal Extra Spaces" section uses `\s` which matches all whitespace types (tabs, newlines, etc.), not just spaces. This is broader than the section title "Internal Extra Spaces" suggests but is generally desirable behavior for data cleaning.
- The summary mentions both `BEFORE INSERT` and `BEFORE UPDATE` triggers, but only a `BEFORE INSERT` trigger is demonstrated in the code example. A reader would need to create a separate `BEFORE UPDATE` trigger as well.
- `CHAR(160)` returns a binary string by default. For columns using utf8mb4, `CHAR(160 USING utf8mb4)` would be more explicit and robust, though implicit conversion typically handles this correctly.
