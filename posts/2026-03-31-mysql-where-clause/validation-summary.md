# Validation Summary: How to Use WHERE Clause in MySQL Queries

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (SQL syntax, DML statements)
- SQL WHERE clause with comparison, logical, BETWEEN, IN, LIKE, IS NULL, EXISTS, and REGEXP operators

## Sources Consulted
- MySQL 8.0 Reference Manual: SELECT Statement — https://dev.mysql.com/doc/refman/8.0/en/select.html
- MySQL 8.0 Reference Manual: WHERE Clause Optimization — https://dev.mysql.com/doc/refman/8.0/en/where-optimization.html
- MySQL 8.0 Reference Manual: Comparison Functions and Operators — https://dev.mysql.com/doc/refman/8.0/en/comparison-operators.html
- MySQL 8.0 Reference Manual: Logical Operators — https://dev.mysql.com/doc/refman/8.0/en/logical-operators.html
- MySQL 8.0 Reference Manual: String Comparison Functions (LIKE, REGEXP) — https://dev.mysql.com/doc/refman/8.0/en/string-comparison-functions.html
- MySQL 8.0 Reference Manual: Operator Precedence — https://dev.mysql.com/doc/refman/8.0/en/operator-precedence.html
- MySQL 8.0 Reference Manual: Working with NULL Values — https://dev.mysql.com/doc/refman/8.0/en/working-with-null.html

## Issues Found

1. **IN query result had wrong sort order.** The query uses `ORDER BY category, name`, so within the "Books" category, "MySQL Cookbook" (M) should appear before "SQL Handbook" (S) alphabetically. The original result showed them in reverse order. Fixed by swapping the two rows.

2. **Calculated expressions result was completely wrong.** The query filters `WHERE price * stock > 1000`. Recalculating for all products:
   - Widget: 9.99 x 100 = 999.00 (does NOT satisfy > 1000)
   - Gadget: 29.99 x 50 = 1,499.50 (satisfies > 1000)
   - Notepad: 2.99 x 200 = 598.00 (does NOT satisfy > 1000)
   - USB Hub: 19.99 x 75 = 1,499.25 (satisfies > 1000)

   The original result incorrectly included Notepad (598.00) and Widget (999.00), and was missing USB Hub (1,499.25). Fixed the result table to show only Gadget and USB Hub, ordered by inventory_value DESC.

## Review Notes
- The EXISTS example references an `order_items` table that is not defined in the sample data. This is fine as it demonstrates the pattern, but readers won't be able to run it directly against the sample schema. This is a minor usability note, not a technical error.
- The REGEXP examples are syntactically correct. The `'^[AEIOUaeiou]'` pattern would only match "USB Hub" from the sample data (starts with 'U'), and `'[0-9]'` would return an empty set since no product names contain digits. Both queries are valid demonstrations of the syntax.
- The best practice about using BETWEEN instead of `YEAR(created_at) = 2024` is correct for standard DATETIME columns. For DATETIME(6) columns with fractional seconds, the upper bound `'2024-12-31 23:59:59'` could miss sub-second values; using `'2025-01-01'` with `<` would be more robust, but for the scope of this tutorial the advice is appropriate.
- All SQL syntax is valid for MySQL 5.7+ and 8.0+.
