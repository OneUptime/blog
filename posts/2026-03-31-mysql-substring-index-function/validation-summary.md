# Validation Summary: How to Use SUBSTRING_INDEX() Function in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL (SUBSTRING_INDEX() string function)
- SQL

## Sources Consulted
- MySQL 8.0 Reference Manual — String Functions and Operators: SUBSTRING_INDEX() (https://dev.mysql.com/doc/refman/8.0/en/string-functions.html#function_substring-index)

## Issues Found
1. **Incorrect count in "Extracting Directory from Path" example**: The query used `SUBSTRING_INDEX(file_path, '/', 3)` and claimed that for the path `/var/www/html/index.php` the result would be `/var/www/html`. This is incorrect — since the path starts with `/`, the first delimiter is at position 0, making the 3rd delimiter the one between `www` and `html`. With count=3, the actual result is `/var/www`. Fixed by changing the count from 3 to 4, which correctly returns `/var/www/html`.

## Review Notes
- All other code examples (basic usage, IP octet extraction, email domain extraction, filename extraction, CSV/tag parsing, count exceeding occurrences, NULL handling, subdomain extraction) are technically correct.
- The nested SUBSTRING_INDEX pattern for extracting middle segments (e.g., IP octets) is a well-known idiomatic MySQL pattern and is demonstrated correctly.
- The post covers MySQL's SUBSTRING_INDEX() comprehensively and the function has been stable across MySQL versions with no deprecation concerns.
