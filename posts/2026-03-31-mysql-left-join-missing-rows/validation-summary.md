# Validation Summary: How to Use LEFT JOIN to Find Missing Rows in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL
- SQL (LEFT JOIN, NOT IN, NOT EXISTS, EXPLAIN)

## Sources Consulted
- MySQL 8.0 Reference Manual — JOIN Clause: https://dev.mysql.com/doc/refman/8.0/en/join.html
- MySQL 8.0 Reference Manual — Working with NULL Values: https://dev.mysql.com/doc/refman/8.0/en/working-with-null.html
- MySQL 8.0 Reference Manual — Subqueries with NOT IN: https://dev.mysql.com/doc/refman/8.0/en/any-in-some-subqueries.html
- MySQL 8.0 Reference Manual — EXISTS and NOT EXISTS Subqueries: https://dev.mysql.com/doc/refman/8.0/en/exists-and-not-exists-subqueries.html
- MySQL 8.0 Reference Manual — EXPLAIN Output Format: https://dev.mysql.com/doc/refman/8.0/en/explain-output.html

## Issues Found
No technical issues found.

## Review Notes
- The multiple LEFT JOINs example (checking orders and email_preferences simultaneously) can produce duplicate rows when a customer has multiple orders but no email preferences. This is not a technical error but a practical caveat users should be aware of. Adding a DISTINCT or restructuring with subqueries would address it, but the post's intent is to demonstrate the pattern rather than provide production-ready queries.
- The NOT IN NULL trap explanation is accurate and valuable — this is a common source of bugs in production SQL.
- The EXPLAIN guidance correctly identifies `ref`/`eq_ref` as index-using join types and NULL in the `key` column as indicating a missing index.
