# Validation Summary: How to Use Window Functions in PostgreSQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- PostgreSQL
- SQL
- Window functions
- Window frame clauses

## Sources Consulted
- PostgreSQL Documentation: Window Functions Tutorial - https://www.postgresql.org/docs/current/tutorial-window.html
- PostgreSQL Documentation: Window Functions - https://www.postgresql.org/docs/current/functions-window.html
- PostgreSQL Documentation: Value Expressions / Window Function Calls - https://www.postgresql.org/docs/current/sql-expressions.html
- PostgreSQL 11 Release Notes - https://www.postgresql.org/docs/11/release-11.html

## Issues Found
- The "Common frame clauses" comment said `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` is the default with `ORDER BY`. PostgreSQL's default frame is `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`, so the comment was corrected.
- The `NTILE(100)` example was labeled as a percentile calculation and aliased as `percentile`. `NTILE` divides rows into buckets and does not calculate exact percentiles, so the comment and alias were changed to `Percentile-style buckets` and `percentile_bucket`.

## Review Notes
The remaining examples align with PostgreSQL's documented window function syntax and behavior. `GROUPS` framing is correctly identified as PostgreSQL 11+. Local execution was not performed because `psql` is not installed in this environment.
