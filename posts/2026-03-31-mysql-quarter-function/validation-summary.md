# Validation Summary: How to Use QUARTER() Function in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL (QUARTER(), EXTRACT(), MONTH(), YEAR(), NOW(), CURDATE(), CONCAT() functions)
- SQL (GROUP BY, WHERE, CASE expressions, date range queries)

## Sources Consulted
- MySQL 8.0 Reference Manual — Date and Time Functions: https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_quarter
- MySQL 8.0 Reference Manual — EXTRACT(): https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_extract
- MySQL 8.0 Reference Manual — CREATE TABLE: https://dev.mysql.com/doc/refman/8.0/en/create-table.html

## Issues Found

1. **Description incorrectly said "fiscal quarter"** (line 7): The metadata description stated QUARTER() returns the "fiscal quarter," but QUARTER() returns the *calendar* quarter (Q1 = Jan–Mar). The post itself correctly distinguishes calendar vs. fiscal quarters in the "Non-Calendar Fiscal Quarters" section. Fixed "fiscal quarter" → "calendar quarter" in the description.

2. **Incomplete result table for "Adding Quarter Labels"** (lines 136–141): The query `SELECT ... FROM sales ORDER BY sale_date` has no WHERE or LIMIT clause, so it returns all 6 rows from the `sales` table. The result table only showed 3 rows, omitting the Feb 20, Oct 22, and Nov 30 entries. Added the 3 missing rows to match the actual query output.

## Review Notes
- All SQL syntax is correct for MySQL 5.7+ and 8.0+.
- The QUARTER() return values for all example dates are correct.
- The revenue aggregation result table (Quarterly Revenue Report) was verified: Q1 = 3800.00, Q2 = 1800.00, Q3 = 3200.00, Q4 = 4600.00 — all match the INSERT data.
- The index-friendliness advice (prefer explicit date ranges over QUARTER() in WHERE clauses for large tables) is accurate and a valuable practical tip.
- The EXTRACT(QUARTER FROM date) equivalence is correct per the SQL standard and MySQL's implementation.
- The UK fiscal quarter CASE expression correctly maps April–June → Q1 through January–March → Q4.
