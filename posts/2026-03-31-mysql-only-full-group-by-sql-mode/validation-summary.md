# Validation Summary: How to Handle the ONLY_FULL_GROUP_BY SQL Mode in MySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL (5.7.5+, 8.0+)
- SQL modes (ONLY_FULL_GROUP_BY)
- SQL GROUP BY clause
- Aggregate functions (SUM, MAX, MIN, ANY_VALUE)
- Window functions (ROW_NUMBER)

## Sources Consulted
- MySQL 5.7 Reference Manual: SQL Mode - ONLY_FULL_GROUP_BY (https://dev.mysql.com/doc/refman/5.7/en/sql-mode.html#sqlmode_only_full_group_by)
- MySQL 8.0 Reference Manual: SQL Mode - ONLY_FULL_GROUP_BY (https://dev.mysql.com/doc/refman/8.0/en/sql-mode.html#sqlmode_only_full_group_by)
- MySQL 8.0 Reference Manual: GROUP BY Handling (https://dev.mysql.com/doc/refman/8.0/en/group-by-handling.html)
- MySQL 5.7 Reference Manual: GROUP BY Handling (https://dev.mysql.com/doc/refman/5.7/en/group-by-handling.html)
- MySQL 8.0 Reference Manual: ANY_VALUE() (https://dev.mysql.com/doc/refman/8.0/en/miscellaneous-functions.html#function_any-value)
- MySQL 5.7 Release Notes: Changes in MySQL 5.7.5 (https://dev.mysql.com/doc/relnotes/mysql/5.7/en/news-5-7-5.html)

## Issues Found
1. **Incorrect version for functional dependency detection**: The post attributed functional dependency detection to "MySQL 8.0" in two places (Fix 4 section and Checking Functional Dependencies section). Functional dependency detection via primary keys was actually introduced in MySQL 5.7.5, alongside the ONLY_FULL_GROUP_BY default. Changed both references from "MySQL 8.0" to "MySQL 5.7.5 and later".

## Review Notes
- The window function example (ROW_NUMBER() OVER) requires MySQL 8.0+, as window functions were introduced in MySQL 8.0. The post does not mention this version requirement. This is not an error per se (most modern MySQL installations are 8.0+), but readers on MySQL 5.7 would encounter a syntax error.
- The `MAX(salesperson)` example uses the alias "top_salesperson", which could be slightly misleading since MAX on a VARCHAR returns the alphabetically last value, not the highest-performing salesperson. This is a naming nuance rather than a technical error.
- The REPLACE approach for disabling the SQL mode (`REPLACE(@@SESSION.sql_mode, 'ONLY_FULL_GROUP_BY', '')`) may leave a leading or double comma in the result string, but MySQL normalizes the sql_mode value correctly, so this works in practice.
- The `orders` table in the "Checking Functional Dependencies" section is not defined in the post, but this is acceptable as a conceptual example.
