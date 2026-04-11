# Validation Summary: How to Use JOIN with WHERE vs ON in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL
- SQL (JOIN, LEFT JOIN, INNER JOIN, WHERE, ON clauses)

## Sources Consulted
- MySQL 8.0 Reference Manual — JOIN Clause: https://dev.mysql.com/doc/refman/8.0/en/join.html
- MySQL 8.0 Reference Manual — Working with NULL Values: https://dev.mysql.com/doc/refman/8.0/en/working-with-null.html
- SQL Standard logical query processing order (FROM → JOIN/ON → WHERE → GROUP BY → HAVING → SELECT → ORDER BY)

## Issues Found

### 1. Incorrect LEFT JOIN with ON filter result table (major)
**What was wrong:** The result table for the LEFT JOIN with `ON o.status = 'shipped'` query showed 4 rows, including an extra row for Alice with NULL values. The explanation claimed Alice appears twice — once for the matched shipped order and once with NULLs because the pending order didn't match the ON condition. This is incorrect. A LEFT JOIN only produces a NULL-padded row for a left-table row when that row has **zero** matches in the right table. Since Alice has one match (order 101, shipped), she does not get an additional NULL row. The correct result is 3 rows: Alice/101/shipped, Bob/103/shipped, Carol/NULL/NULL.

**What was changed:** Corrected the result table from 4 rows to 3 rows (removed the erroneous Alice/NULL/NULL row) and rewrote the explanation to accurately describe LEFT JOIN NULL-padding behavior.

### 2. Incorrect code fence language tag (minor)
**What was wrong:** The SQL logical order of operations was in a code block tagged as `dockerfile`.

**What was changed:** Changed the code fence language from `dockerfile` to `text`.

## Review Notes
- The explanation that `NULL = 'shipped'` evaluates as `FALSE` (line 81) is a common simplification. Technically, it evaluates to `NULL`/`UNKNOWN`, which is treated as not-TRUE in a WHERE clause and thus the row is discarded. The end result is the same, and this simplification is standard in educational material, so it was left as-is.
- All SQL syntax is valid MySQL. CREATE TABLE, INSERT, and SELECT statements are syntactically correct.
- The anti-join pattern section is correct and demonstrates an important practical pattern.
- The practical example with departments/employees is sound and correctly illustrates the concept.
- The summary accurately captures the key distinction between ON and WHERE for outer joins.
