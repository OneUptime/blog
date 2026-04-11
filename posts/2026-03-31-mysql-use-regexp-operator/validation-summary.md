# Validation Summary: How to Use the REGEXP Operator in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0
- REGEXP / RLIKE operator
- REGEXP_LIKE() function
- ICU regular expression syntax
- SQL pattern matching (LIKE vs REGEXP)

## Sources Consulted
- MySQL 8.0 Reference Manual: Regular Expressions — https://dev.mysql.com/doc/refman/8.0/en/regexp.html
- MySQL 8.0 Reference Manual: REGEXP_LIKE() — https://dev.mysql.com/doc/refman/8.0/en/regexp.html#function_regexp-like
- MySQL 8.0 Reference Manual: BINARY operator deprecation — https://dev.mysql.com/doc/refman/8.0/en/cast-functions.html#operator_binary
- MySQL 8.0 Reference Manual: String Comparison Functions — https://dev.mysql.com/doc/refman/8.0/en/string-comparison-functions.html
- MySQL 8.0 Reference Manual: LIKE operator and index usage — https://dev.mysql.com/doc/refman/8.0/en/index-btree-hash.html

## Issues Found

1. **Deprecated `BINARY` cast for case-sensitive REGEXP matching**: The post recommended using `BINARY username REGEXP '^Admin'` for case-sensitive matching. The `BINARY` cast operator is deprecated as of MySQL 8.0.28 and can cause issues with the ICU-based regex engine used in MySQL 8.0. Changed to use `REGEXP_LIKE(username, '^Admin', 'c')` which is the recommended MySQL 8.0 approach using the `'c'` (case-sensitive) match type parameter.

2. **Incorrect claim about LIKE and indexes for suffix matches**: The post stated "For simple prefix or suffix matches, `LIKE` is faster because it can use indexes." This is incorrect for suffix matches — `LIKE '%suffix'` cannot use indexes and performs a full scan, just like REGEXP. Only `LIKE 'prefix%'` can leverage B-tree indexes. Corrected the statement to specify that only prefix matches with LIKE benefit from index usage.

## Review Notes
- The double-backslash escaping in SQL string literals (e.g., `'@gmail\\.com$'` and `'^\\+1'`) is correct — MySQL string parsing reduces `\\` to `\`, which then acts as the regex escape character.
- The post correctly notes that MySQL 8.0 uses ICU regular expression syntax, which is an important distinction from MySQL 5.x which used the Henry Spencer library with more limited regex support.
- The REGEXP vs LIKE comparison table is a useful reference. The performance row is accurate — REGEXP cannot use indexes.
- The case sensitivity explanation correctly notes that default behavior depends on column collation (non-binary string columns default to case-insensitive with the default `utf8mb4_0900_ai_ci` collation).
