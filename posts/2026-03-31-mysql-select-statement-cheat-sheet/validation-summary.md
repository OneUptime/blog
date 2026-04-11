# Validation Summary: MySQL SELECT Statement Cheat Sheet

## Status
validated

## Post Type
Reference / Cheat Sheet

## Technologies Covered
- MySQL (SELECT statement and related clauses)
- SQL (standard query syntax)

## Sources Consulted
- MySQL 8.0 Reference Manual: SELECT Statement — https://dev.mysql.com/doc/refman/8.0/en/select.html
- MySQL 8.0 Reference Manual: LIMIT Clause — https://dev.mysql.com/doc/refman/8.0/en/select.html#id4651990
- MySQL 8.0 Reference Manual: SQL_CALC_FOUND_ROWS deprecation — https://dev.mysql.com/doc/refman/8.0/en/information-functions.html#function_found-rows
- MySQL 8.0 Reference Manual: CASE Expression — https://dev.mysql.com/doc/refman/8.0/en/case.html
- MySQL 8.0 Reference Manual: Aggregate Functions — https://dev.mysql.com/doc/refman/8.0/en/aggregate-functions.html

## Issues Found
No technical issues found.

## Review Notes
- `SQL_CALC_FOUND_ROWS` was deprecated in MySQL 8.0.17 and removed in MySQL 9.0. The post correctly labels this as a "Legacy Pattern" and recommends `COUNT(*)` subqueries instead, which is accurate guidance.
- All SQL examples use correct MySQL syntax and would execute as expected against appropriately structured tables.
- The Common Clauses Reference lists `OFFSET` as a separate clause; in MySQL it is technically part of the `LIMIT` clause syntax (`LIMIT n OFFSET m`), but this is an acceptable simplification for a cheat sheet format.
