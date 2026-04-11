# Validation Summary: How to Use WEIGHT_STRING() Function in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL (WEIGHT_STRING() function)
- SQL (collation, sorting, string comparison)
- Unicode Collation Algorithm (UCA) collations: utf8mb4_unicode_ci, utf8mb4_unicode_520_ci, utf8mb4_0900_ai_ci

## Sources Consulted
- MySQL 8.0 Reference Manual: String Functions — WEIGHT_STRING() (https://dev.mysql.com/doc/refman/8.0/en/string-functions.html#function_weight-string)
- MySQL 5.7 Reference Manual: String Functions — WEIGHT_STRING() (https://dev.mysql.com/doc/refman/5.7/en/string-functions.html#function_weight-string)
- MySQL 8.0 Reference Manual: SQL Mode — ONLY_FULL_GROUP_BY (https://dev.mysql.com/doc/refman/8.0/en/sql-mode.html#sqlmode_only_full_group_by)

## Issues Found
1. **GROUP BY query incompatible with ONLY_FULL_GROUP_BY (fixed):** In the "Debug Duplicate Detection" section, the query selected `tag` directly while grouping by `WEIGHT_STRING(tag)`. Since `tag` is not functionally dependent on `WEIGHT_STRING(tag)` from MySQL's perspective, this query would fail under the default `ONLY_FULL_GROUP_BY` SQL mode (enabled by default since MySQL 5.7.5). Fixed by wrapping the column in `ANY_VALUE(tag)`.

## Review Notes
- The syntax notation `WEIGHT_STRING(str [AS {CHAR|BINARY}(N)] [LEVEL levels] [flags])` matches the MySQL 5.7 documentation. In MySQL 8.0, the `LEVEL` clause was silently removed, and `[flags]` remains but is documented as "currently unused." Since the post does not use LEVEL or flags in any example and does not specify a MySQL version, this is acceptable but readers using MySQL 8.0+ should be aware the LEVEL clause is no longer available.
- The claim that `WEIGHT_STRING(123)` returns NULL for numeric input is not explicitly documented in the MySQL reference manual. The docs only state that NULL input yields NULL output. The actual behavior for integer arguments may depend on implicit type conversion. The claim is plausible but unverified against official documentation.
- All SQL code examples use valid MySQL syntax and correctly demonstrate WEIGHT_STRING() behavior.
- The explanations of collation behavior (case-insensitive, accent-insensitive) are accurate for the collations mentioned.
- The post correctly identifies WEIGHT_STRING() as a "debugging function intended for internal use," which matches the official MySQL documentation verbatim.
