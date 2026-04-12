# Validation Summary: How to Use User-Defined Variables (@var) in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (user-defined variables, SET, SELECT, PREPARE/EXECUTE, window functions)
- SQL

## Sources Consulted
- MySQL 8.0 Reference Manual — Section 11.4 "User-Defined Variables" (https://dev.mysql.com/doc/refman/8.0/en/user-defined-variables.html)
- MySQL 8.0 Reference Manual — Section 15.5 "Prepared Statements" (https://dev.mysql.com/doc/refman/8.0/en/sql-prepared-statements.html)
- MySQL 8.0.13 Release Notes — deprecation of user variable assignment in non-SET statements (https://dev.mysql.com/doc/relnotes/mysql/8.0/en/news-8-0-13.html)
- MySQL 8.0 Reference Manual — Section 14.20 "Window Functions" (https://dev.mysql.com/doc/refman/8.0/en/window-functions.html)

## Issues Found

1. **Misleading ORDER BY pitfall (Common Pitfalls section)**: The original text stated "Do not rely on user-defined variables in SELECT to maintain order-dependent state without an explicit ORDER BY" — implying that adding ORDER BY makes evaluation order reliable. Per MySQL docs, the evaluation order of user variable expressions in SELECT is *never* guaranteed, even with ORDER BY. Fixed the wording to clarify that ORDER BY does not guarantee variable evaluation order.

2. **Missing deprecation notice for `:=` in SELECT**: The post extensively demonstrates `@var := expr` in SELECT statements (row numbering, running totals, etc.) without mentioning that this syntax was deprecated in MySQL 8.0.13 (released October 2018). Added a deprecation note to the Common Pitfalls section.

3. **No mention of window function alternatives**: Since the `:=` patterns shown are deprecated, added a brief example showing `ROW_NUMBER() OVER()` as the preferred MySQL 8.0+ alternative for the row numbering use case.

## Review Notes
- The row numbering pattern (`@row_num := @row_num + 1` with ORDER BY in the same SELECT) and the running totals pattern are classic MySQL idioms that work in practice for simple single-table scans, but are officially undocumented behavior per MySQL's guarantees. The post's examples in the "Incrementing a Counter" and "Generating Running Totals" sections rely on ORDER BY determining evaluation order, which is not guaranteed. These examples were left intact since they represent widely-used legacy patterns, but the Common Pitfalls section now correctly warns about this limitation and points to window functions as the preferred approach.
- All other code examples (SET assignment, SELECT ... INTO, PREPARE/EXECUTE, variable scope) are correct and current.
- The supported types list ("integer, decimal, float, string, binary, NULL") is a reasonable simplification of the official list ("integer, decimal, floating-point, binary or nonbinary string, or NULL value").
