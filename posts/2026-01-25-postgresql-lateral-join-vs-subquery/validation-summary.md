# Validation Summary: How to Use LATERAL JOIN vs Subquery in PostgreSQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- PostgreSQL
- SQL
- LATERAL joins
- Correlated subqueries
- Window functions
- Set-returning functions
- JSONB functions
- Indexing for query performance

## Sources Consulted
- PostgreSQL Documentation: Table Expressions, including joined tables, table functions, and LATERAL subqueries: https://www.postgresql.org/docs/current/queries-table-expressions.html
- PostgreSQL Documentation: SELECT syntax and FROM clause behavior: https://www.postgresql.org/docs/current/sql-select.html
- PostgreSQL Documentation: Window Functions: https://www.postgresql.org/docs/current/functions-window.html
- PostgreSQL Documentation: JSON Functions and Operators, including `jsonb_array_elements`: https://www.postgresql.org/docs/current/functions-json.html
- PostgreSQL Documentation: Set Returning Functions, including `generate_series`: https://www.postgresql.org/docs/current/functions-srf.html

## Issues Found
- The running-total examples referenced an `amount` column on `orders`, but the post's earlier sample `orders` table defines `total_amount`. Updated both the LATERAL and window-function running-total examples to use `total_amount` so the examples match the provided schema.

## Review Notes
- PostgreSQL documents that `LATERAL` subqueries in `FROM` can reference preceding `FROM` items, and that table functions can reference preceding items even when the `LATERAL` keyword is omitted.
- PostgreSQL's documentation uses `LEFT JOIN LATERAL ... ON true` for preserving source rows when a lateral item returns no rows, matching the post's guidance.
- The performance guidance is directionally correct: the LATERAL item is evaluated for each relevant left-side row or row set, and a supporting index such as `(department_id, salary DESC)` is appropriate for the top-N-per-group example.
