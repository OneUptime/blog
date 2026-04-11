# Validation Summary: MySQL CHAR vs VARCHAR: Performance and Storage Differences

## Status
validated

## Post Type
Reference / Guide

## Technologies Covered
- MySQL (CHAR and VARCHAR data types)
- InnoDB storage engine
- Character sets (utf8mb4, latin1)
- MySQL collations (PAD SPACE vs NO PAD)

## Sources Consulted
- MySQL 8.0 Reference Manual — CHAR and VARCHAR Types: https://dev.mysql.com/doc/refman/8.0/en/char.html
- MySQL 8.0 Reference Manual — InnoDB Limits: https://dev.mysql.com/doc/refman/8.0/en/innodb-limits.html
- MySQL 8.0 Reference Manual — String Comparison Functions: https://dev.mysql.com/doc/refman/8.0/en/string-comparison-functions.html
- MySQL 8.0 Collation migration notes: https://dev.mysql.com/blog-archive/mysql-8-0-collations-migrating-from-older-collations/

## Issues Found

### 1. VARCHAR length prefix threshold described in characters instead of bytes
- **What was wrong:** The post stated the length prefix is "1 byte if the column max is 255 characters, 2 bytes otherwise." The MySQL documentation specifies the threshold is based on the maximum possible **byte** length, not the character count. This distinction is critical for multi-byte character sets like utf8mb4, where VARCHAR(100) has a max byte length of 400 (100 × 4), requiring a 2-byte prefix even though 100 < 255.
- **What was changed:** Reworded to "1 byte if values require no more than 255 bytes, 2 bytes if values may require more than 255 bytes" — matching the official MySQL documentation phrasing.

### 2. Trailing space comparison example was incorrect and misleading
- **What was wrong:** The post showed `SELECT 'AB   ' = 'AB';` returning 1 and attributed it to "CHAR padding behavior." This is incorrect on two counts: (a) the comparison uses string literals, not CHAR column values, so it does not demonstrate CHAR behavior; (b) the result is collation-dependent — with MySQL 8.0's default collation `utf8mb4_0900_ai_ci` (a NO PAD collation), this returns 0, not 1.
- **What was changed:** Replaced the misleading string literal comparison with an actual CHAR column example that correctly demonstrates trailing space stripping on retrieval. Added a note clarifying that trailing space handling in comparisons depends on the collation (PAD SPACE vs NO PAD), not the data type.

## Review Notes
- The storage comparison table and VARCHAR(100) byte calculations implicitly assume a single-byte character set. This is acceptable since the post addresses multi-byte character set impact in a dedicated later section, but readers using utf8mb4 (the MySQL 8.0 default) should be aware that VARCHAR(100) would use a 2-byte prefix, not 1.
- The claim that InnoDB has a 3072-byte index key limit is correct for the default 16KB page size with DYNAMIC/COMPRESSED row formats. Older COMPACT/REDUNDANT row formats have a 767-byte limit.
- The statement that CHAR(10) uses 10 bytes is correct for single-byte character sets. With utf8mb4, CHAR(10) reserves up to 40 bytes, as correctly noted in the character set section.
