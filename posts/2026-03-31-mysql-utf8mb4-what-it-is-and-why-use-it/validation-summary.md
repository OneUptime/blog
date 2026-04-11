# Validation Summary: What Is utf8mb4 in MySQL and Why Should You Use It

## Status
validated

## Post Type
Guide

## Technologies Covered
- MySQL (5.5.3+, 8.0)
- utf8mb4 character set and collation
- InnoDB storage engine
- Python mysql-connector-python library

## Sources Consulted
- MySQL 8.0 Reference Manual: Character Sets and Collations — https://dev.mysql.com/doc/refman/8.0/en/charset.html
- MySQL 8.0 Reference Manual: The utf8mb4 Character Set — https://dev.mysql.com/doc/refman/8.0/en/charset-unicode-utf8mb4.html
- MySQL 8.0 Reference Manual: SET NAMES Statement — https://dev.mysql.com/doc/refman/8.0/en/set-names.html
- MySQL 8.0 Reference Manual: SET CHARACTER SET Statement — https://dev.mysql.com/doc/refman/8.0/en/set-character-set.html
- MySQL 8.0 Reference Manual: innodb_large_prefix (removed variable) — https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html
- MySQL 8.0 Reference Manual: InnoDB Limits — https://dev.mysql.com/doc/refman/8.0/en/innodb-limits.html

## Issues Found

1. **`SET NAMES` and `SET CHARACTER SET` described as equivalent**: The post stated `SET CHARACTER SET utf8mb4` is equivalent to `SET NAMES utf8mb4`. This is incorrect. `SET NAMES` sets `character_set_client`, `character_set_connection`, and `character_set_results` all to the specified charset. `SET CHARACTER SET` sets `character_set_client` and `character_set_results` to the specified charset but sets `character_set_connection` to the character set of the current database. Removed the `SET CHARACTER SET` line and the "or equivalently" comment to avoid misleading readers.

2. **`innodb_large_prefix` described as "the default in MySQL 8.0"**: The post said the 3072-byte index key limit applies "with `innodb_large_prefix` enabled, which is the default in MySQL 8.0." In MySQL 8.0, the `innodb_large_prefix` variable was removed entirely — it is not a configurable setting with a default value. The 3072-byte limit is always in effect. Updated the text to clarify that the variable was removed and the larger limit is always active.

## Review Notes
- The post correctly identifies MySQL 5.5.3 as the version where utf8mb4 was introduced.
- The collation `utf8mb4_0900_ai_ci` is correctly used throughout as the default collation for utf8mb4 in MySQL 8.0.
- The index size math (255 * 4 = 1020 bytes) is correct.
- The error message and hex bytes shown for the emoji example (\xF0\x9F\x98\x80 = U+1F600) are accurate.
- The migration advice regarding ALGORITHM=COPY and online schema change tools (pt-online-schema-change, gh-ost) is sound.
