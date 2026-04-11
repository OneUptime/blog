# Validation Summary: How to Use SUBSTRING() Function in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (SUBSTRING / SUBSTR / MID string functions)
- SQL (SELECT, WHERE, UPDATE statements)

## Sources Consulted
- MySQL 8.0 Reference Manual - String Functions and Operators: https://dev.mysql.com/doc/refman/8.0/en/string-functions.html#function_substring
- MySQL 8.0 Reference Manual - LOCATE() function: https://dev.mysql.com/doc/refman/8.0/en/string-functions.html#function_locate
- MySQL 8.0 Reference Manual - MID() function: https://dev.mysql.com/doc/refman/8.0/en/string-functions.html#function_mid

## Issues Found

### 1. Incorrect SUBSTRING position in table column example
- **What was wrong:** The query `SUBSTRING(order_code, 5)` was described as extracting `00123` from the string `US-00123`. Position 5 of `US-00123` is the second `0`, so the actual result would be `0123` (4 characters), not `00123` (5 characters).
- **What was changed:** Changed `SUBSTRING(order_code, 5)` to `SUBSTRING(order_code, 4)` so that extraction starts at position 4 (the first `0` after the hyphen), correctly returning `00123`.

### 2. Incorrect negative position in SUBSTRING example
- **What was wrong:** `SUBSTRING('user_profile_image.png', -7, 3)` was stated to return `ima`. The string `user_profile_image.png` has length 22. Position -7 maps to position 16 (the `a` in `image`), so the actual result is `age`, not `ima`.
- **What was changed:** Changed `-7` to `-9`. Position -9 maps to position 14 (the `i` in `image`), so `SUBSTRING('user_profile_image.png', -9, 3)` correctly returns `ima`.

## Review Notes
- The note about `SUBSTRING()` in a WHERE clause preventing index usage on the column is correct and a valuable callout for readers.
- The file extension extraction example using `LOCATE()` works for filenames with a single dot. For filenames with multiple dots (e.g., `archive.tar.gz`), it would return `tar.gz`, which may or may not be the desired behavior depending on use case. This is not an error but could be noted in a future revision.
- `MID()` is listed as deprecated in MySQL 8.0 documentation (it is a synonym retained for compatibility). It still works, but `SUBSTRING()` or `SUBSTR()` are preferred. This is not incorrect in the post as written, since it correctly calls them "aliases."
