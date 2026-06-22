# Validation Summary: How to Use PostgreSQL CTEs and Window Functions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- PostgreSQL
- SQL
- Common Table Expressions (CTEs)
- Recursive CTEs
- Window functions
- Window frame specifications
- PostgreSQL indexing for ordered queries

## Sources Consulted
- PostgreSQL documentation: WITH Queries (Common Table Expressions): https://www.postgresql.org/docs/current/queries-with.html
- PostgreSQL documentation: SELECT / WITH materialization rules: https://www.postgresql.org/docs/current/sql-select.html
- PostgreSQL documentation: Window Functions: https://www.postgresql.org/docs/current/functions-window.html
- PostgreSQL documentation: Window Function Tutorial: https://www.postgresql.org/docs/current/tutorial-window.html
- PostgreSQL documentation: Value Expressions / Window frame clauses: https://www.postgresql.org/docs/current/sql-expressions.html
- PostgreSQL documentation: Date/Time Functions and Operators: https://www.postgresql.org/docs/current/functions-datetime.html
- PostgreSQL documentation: B-Tree Indexes: https://www.postgresql.org/docs/current/btree.html

## Issues Found
No technical issues found.

## Review Notes
The examples are syntactically consistent with PostgreSQL 12+ features, including `MATERIALIZED` and `NOT MATERIALIZED` CTE controls. The `LAST_VALUE` and `NTH_VALUE` examples correctly specify an unbounded frame, which avoids PostgreSQL's default frame behavior that is often surprising for those functions. Some analytical examples assume common schema constraints, such as one attendance row per date for the gaps-and-islands pattern and deterministic ordering when salaries tie; these are reasonable tutorial assumptions but could be clarified in a future editorial pass.
