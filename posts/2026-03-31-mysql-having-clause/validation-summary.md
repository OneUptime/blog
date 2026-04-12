# Validation Summary: How to Use HAVING Clause in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL
- SQL (HAVING clause, GROUP BY, aggregate functions)

## Sources Consulted
- MySQL 8.0 Reference Manual — SELECT Statement: https://dev.mysql.com/doc/refman/8.0/en/select.html
- MySQL 8.0 Reference Manual — GROUP BY Modifiers: https://dev.mysql.com/doc/refman/8.0/en/group-by-modifiers.html
- MySQL 8.0 Reference Manual — Aggregate Functions: https://dev.mysql.com/doc/refman/8.0/en/aggregate-functions.html
- Manual verification of all query outputs against the provided sample data (12 rows)

## Issues Found

### 1. Incorrect output in "HAVING with COUNT DISTINCT" section
**What was wrong:** The expected output only listed user_id 1 and 4 as having ordered from at least 2 different categories. However, tracing through the sample data with `WHERE status = 'completed'`, users 2 (Electronics, Clothing) and 3 (Books, Electronics) also have 2 distinct categories each.

**What was changed:** Added user_id 2 and 3 to the expected output table, so all four qualifying users (1, 2, 3, 4) are shown.

### 2. Incorrect output in "Monthly Revenue" section
**What was wrong:** The expected output showed only two months (2024-02 at 524.98 and 2024-03 at 552.96) and had three calculation errors:
- January 2024 was missing entirely. Completed orders sum to 299.99 + 39.99 + 149.99 = 489.97, which exceeds the 400 threshold.
- February 2024 was shown as 524.98 but the correct sum of completed orders (59.99 + 24.99 + 499.99) is 584.97.
- March 2024 was shown as 552.96 but the correct sum of completed orders (89.99 + 49.99 + 399.99 + 12.99 + 89.99) is 642.95.
- The bottom border of the ASCII table was also misaligned (`+--------+------------------+` instead of `+---------+-----------------+`).

**What was changed:** Corrected all three monthly revenue values and added the missing January 2024 row. Fixed the table border alignment.

## Review Notes
- The SQL logical execution order shown in the Mermaid flowchart (FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY) is correct.
- The claim that MySQL allows referencing SELECT aliases in HAVING is correct — this is a MySQL extension to the SQL standard.
- The claim that HAVING can be used without GROUP BY (treating the entire table as one group) is correct per MySQL documentation.
- All SQL syntax throughout the post is valid MySQL.
- The "HAVING with Multiple Conditions" section has no expected output shown, which is fine as it serves as a syntax example.
