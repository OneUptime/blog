# Validation Summary: How to Use LENGTH() and CHAR_LENGTH() Functions in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL (string functions: LENGTH, CHAR_LENGTH, CHARACTER_LENGTH, OCTET_LENGTH)
- SQL
- UTF-8 / utf8mb4 character encoding

## Sources Consulted
- MySQL 8.0 Reference Manual — String Functions and Operators: https://dev.mysql.com/doc/refman/8.0/en/string-functions.html#function_length
- MySQL 8.0 Reference Manual — CHAR_LENGTH: https://dev.mysql.com/doc/refman/8.0/en/string-functions.html#function_char-length
- MySQL 8.0 Reference Manual — OCTET_LENGTH: https://dev.mysql.com/doc/refman/8.0/en/string-functions.html#function_octet-length
- UTF-8 encoding specification (RFC 3629) for byte-length verification of CJK and emoji characters

## Issues Found
1. **Missing emoji in code example (line 39-40)**: The emoji character (😊) was stripped from the string `'Hello 😊'` in the emoji example, leaving just `'Hello '` (6 bytes). The comment `-- 10, 7` was correct for the intended string with the emoji (5 bytes for "Hello" + 1 byte for space + 4 bytes for 😊 = 10 bytes; 7 characters). Fixed by restoring the 😊 emoji.

2. **Incorrect table values for smiley row (line 69)**: The results table showed `chars=10, bytes=10` for the bio `'Hi there!'`, but this string is 9 characters and 9 bytes (H-i-space-t-h-e-r-e-! = 9). Fixed the table to show `9 | 9`.

## Review Notes
- All core technical claims are accurate: LENGTH() returns bytes, CHAR_LENGTH() returns characters, CHARACTER_LENGTH() is a valid alias, OCTET_LENGTH() is a synonym for LENGTH(), and all return NULL for NULL input.
- The byte counts for Japanese hiragana characters (3 bytes each in UTF-8) and the emoji (4 bytes in UTF-8) are correct.
- The claim that CHAR_LENGTH on binary columns returns bytes is correct per MySQL documentation.
- SQL syntax across all examples is valid MySQL.
- The advice to prefer CHAR_LENGTH for user-facing validation and LENGTH for storage estimation is sound.
