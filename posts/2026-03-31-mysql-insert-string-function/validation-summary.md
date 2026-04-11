# Validation Summary: How to Use INSERT() Function in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL (string functions)
- SQL

## Sources Consulted
- MySQL 8.0 Reference Manual — String Functions: INSERT() https://dev.mysql.com/doc/refman/8.0/en/string-functions.html#function_insert

## Issues Found

1. **Incorrect behavior for `pos <= 0` (Syntax section)**: The post claimed "If `pos <= 0`, the result is `newstr`." This is wrong. Per the MySQL docs, if `pos` is not within the length of the string (including `pos < 1`), the original string is returned unchanged. The official docs include the example `INSERT('Quadratic', -1, 4, 'What')` → `'Quadratic'`. Fixed the description to state the correct behavior with the condition `pos < 1 or pos > CHAR_LENGTH(str)`.

2. **Incorrect edge case results for `pos = 0` and `pos = -1`**: The post showed `INSERT('Hello', 0, 3, 'Hi')` → `'Hi'` and `INSERT('Hello', -1, 3, 'Hi')` → `'Hi'`. Both are wrong — MySQL returns `'Hello'` (original string unchanged). Fixed both results and the comment from "newstr only" to "str unchanged".

3. **Garbled basic usage examples for `len = 0`**: The post contained stream-of-consciousness wrong results for `INSERT('ABCDEFGH', 3, 0, 'XY')`, showing `'ABXYCCDEFGH'` and `'ABXYCDECDEFGH'`, both incorrect. The correct result is `'ABXYCDEFGH'`. Also removed a confusing "Let me clarify" paragraph with an intermediate wrong value (`'ABXYC DE'`). Consolidated into a single clean example.

4. **Misleading edge case comment for pos beyond end**: The comment said "str unchanged, newstr appended at end" but the result correctly showed just `'Hello'` (no appending). Fixed the comment to simply say "str unchanged".

5. **"byte position" vs "character position" in Summary**: The summary said "exact byte position" but INSERT() operates on character positions and is documented as multibyte safe. Changed to "exact character position".

## Review Notes
- The email masking example references a `users` table that is not defined in the post. This is acceptable for a demonstration snippet but readers would need to create their own table.
- All other examples (credit card masking, phone formatting, serial number overwriting, log field replacement, REPLACE/SUBSTRING comparison) are correct.
