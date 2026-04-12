# Validation Summary: How to Fix ERROR 1071 Specified Key Was Too Long in MySQL

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- MySQL (5.5, 5.6, 5.7, 8.0)
- InnoDB storage engine
- MySQL character sets (latin1, utf8/utf8mb3, utf8mb4)
- MySQL index types (prefix indexes, unique indexes, generated columns)

## Sources Consulted
- MySQL 8.0 Reference Manual: InnoDB Limits — https://dev.mysql.com/doc/refman/8.0/en/innodb-limits.html
- MySQL 8.0 Reference Manual: innodb_large_prefix — https://dev.mysql.com/doc/refman/5.7/en/innodb-parameters.html#sysvar_innodb_large_prefix
- MySQL 8.0 Reference Manual: CREATE INDEX — https://dev.mysql.com/doc/refman/8.0/en/create-index.html
- MySQL 8.0 Reference Manual: SHA2() function — https://dev.mysql.com/doc/refman/8.0/en/encryption-functions.html#function_sha2
- MySQL 8.0 Reference Manual: Character Sets — https://dev.mysql.com/doc/refman/8.0/en/charset-unicode-sets.html
- MySQL 8.0 Reference Manual: innodb_file_format removal — https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html

## Issues Found
- **Fix 1 prefix index example used `token(255)`**: The second example in Fix 1 used `token(255)` as a prefix length. In the context of `utf8mb4` (which the article primarily discusses), 255 x 4 = 1020 bytes, which still exceeds the 767-byte limit and would trigger the same ERROR 1071. Changed to `token(191)` (191 x 4 = 764 bytes) to be consistent with the first example and safe under the 767-byte limit. Also added a clarifying comment about the byte calculation.

## Review Notes
- In MySQL 8.0.28+, the `utf8` character set name is deprecated in favor of `utf8mb3`. The Fix 5 example using `CHARACTER SET utf8` still works but will produce a deprecation warning on MySQL 8.0.28+. This is not a current error but worth noting for future updates.
- The post correctly notes that prefix unique indexes only enforce uniqueness on the prefix, not the full column value (implied by "Prefix indexes reduce selectivity"). Users should be aware this means two different full values sharing the same 191-character prefix would conflict.
- The `innodb_large_prefix` variable defaults to ON starting in MySQL 5.7.7, and the default `ROW_FORMAT` is DYNAMIC starting in MySQL 5.7.9, so MySQL 5.7.9+ effectively has the 3072-byte limit by default for new tables without any configuration changes. The post's Fix 2 is still relevant for 5.6 and early 5.7 versions.
- All SQL syntax, configuration directives, and technical explanations are otherwise accurate and well-presented.
