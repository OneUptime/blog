# Validation Summary: How to Write Recursive Queries with CTEs in PostgreSQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- PostgreSQL
- SQL
- Recursive Common Table Expressions
- Hierarchical data queries
- Graph traversal queries
- PostgreSQL query planning with EXPLAIN

## Sources Consulted
- PostgreSQL documentation: WITH Queries / Recursive Queries - https://www.postgresql.org/docs/current/queries-with.html
- PostgreSQL documentation: Array Functions and Operators - https://www.postgresql.org/docs/current/functions-array.html
- PostgreSQL documentation: String Functions and Operators - https://www.postgresql.org/docs/current/functions-string.html
- PostgreSQL documentation: EXPLAIN - https://www.postgresql.org/docs/current/sql-explain.html
- PostgreSQL documentation: CREATE INDEX - https://www.postgresql.org/docs/current/sql-createindex.html
- PostgreSQL documentation: Numeric Types / serial - https://www.postgresql.org/docs/current/datatype-numeric.html

## Issues Found
- The graph traversal example used `ORDER BY total_weight` but the displayed output placed the 13-cost path before a 12-cost path. Changed the query to `ORDER BY total_weight, path` for deterministic ordering and corrected the result order.
- The bill of materials total-cost example commented that `WHERE unit_cost > 0` counts only leaf parts. That predicate actually counts costed parts; it only corresponds to leaves in the sample data. Updated the comment to "Only count costed parts."

## Review Notes
The SQL examples align with PostgreSQL's documented recursive CTE evaluation model, array path ordering/cycle detection patterns, `repeat` string function usage, `CREATE INDEX` syntax, and `EXPLAIN (ANALYZE, BUFFERS)` syntax. PostgreSQL's current documentation also supports `SEARCH` and `CYCLE` clauses for recursive queries, but the post's manual depth/path examples remain valid and current. Local execution was not performed because `psql` is not installed in the review environment.
