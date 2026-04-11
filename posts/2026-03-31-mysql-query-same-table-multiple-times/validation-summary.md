# Validation Summary: How to Query the Same Table Multiple Times Efficiently in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (8.0+ for CTE examples)
- SQL (self-joins, conditional aggregation, CTEs, derived tables)

## Sources Consulted
- MySQL 8.0 Reference Manual: WITH (Common Table Expressions) — https://dev.mysql.com/doc/refman/8.0/en/with.html
- MySQL 8.0 Reference Manual: JOIN Clause — https://dev.mysql.com/doc/refman/8.0/en/join.html
- MySQL 8.0 Reference Manual: DATE_SUB() — https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_date-sub
- MySQL 8.0 Reference Manual: MONTH() — https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_month

## Issues Found

1. **Misleading CTE materialization claim (line 56)**: The text stated CTEs "materialize a query result once." MySQL does not always materialize CTEs — the optimizer may merge/inline them into the outer query, especially when the CTE is referenced only once. Changed to "let you define a named result set once and reference it multiple times."

2. **Incorrect claim about multiple CTE references (line 78)**: The text said "the result is used multiple times in the outer query," but the `order_stats` CTE is only joined once in the outer query. Accessing multiple columns from the same alias is not the same as referencing the CTE multiple times. Changed to "The CTE defines the aggregation once, keeping the outer query clean and readable."

3. **January bug in previous month calculation (line 94)**: `MONTH(CURDATE()) - 1` evaluates to 0 in January (since `MONTH()` returns 1 for January, and `1 - 1 = 0`), which matches no valid month. Fixed to `MONTH(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))`, which correctly rolls back to December (month 12) when the current month is January.

## Review Notes
- The multiple CTEs example (and the inline derived tables example) filter by month only, not by year, so they would match the same month across all years. This is acceptable for a simplified tutorial example but could be noted in a future revision.
- The summary correctly notes that "MySQL may not always materialize them" regarding CTEs, which is an important caveat.
- All SQL syntax is valid MySQL 8.0+ syntax.
