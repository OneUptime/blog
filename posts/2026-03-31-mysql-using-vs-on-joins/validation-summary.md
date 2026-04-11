# Validation Summary: How to Choose Between USING and ON in MySQL Joins

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL (JOIN syntax, USING clause, ON clause)
- SQL (SQL-92 standard)

## Sources Consulted
- MySQL 8.0 Reference Manual — JOIN Clause: https://dev.mysql.com/doc/refman/8.0/en/join.html
- MySQL 8.0 Release Notes for 8.0.16 (USING column qualification change): https://dev.mysql.com/doc/relnotes/mysql/8.0/en/news-8-0-16.html
- SQL-92 Standard (ISO/IEC 9075:1992) for USING clause origin

## Issues Found
1. **Incorrect "strict mode" reference (line 109)**: The original comment stated that qualifying a USING column with a table name "can cause errors in strict mode." This is technically wrong — the restriction has nothing to do with MySQL's strict SQL mode (`STRICT_TRANS_TABLES` / `STRICT_ALL_TABLES`). Starting with MySQL 8.0.16, MySQL follows the SQL standard and treats the coalesced USING column as not belonging to either table, so qualifying it with a table alias raises an error regardless of SQL mode. Fixed the comment to say "Error in MySQL 8.0.16+: table qualifier on a USING column is not allowed."

## Review Notes
- The claim that USING was introduced in SQL-92 is correct.
- The observation that moving a LEFT JOIN ON condition to WHERE effectively converts it to INNER JOIN behavior is accurate and a valuable callout.
- The "Self-join support: No" for USING in the comparison table is a practical simplification. Technically, USING could work in a self-join if the join happens to be on a same-named column, but self-joins almost always involve different column names (e.g., `manager_id = employee_id`), making USING inapplicable in practice.
- All SQL code examples are syntactically correct and demonstrate the described behavior accurately.
