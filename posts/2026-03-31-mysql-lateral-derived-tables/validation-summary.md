# Validation Summary: How to Use LATERAL Derived Tables in MySQL 8

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0.14+
- SQL (LATERAL derived tables, JOIN, LEFT JOIN, JSON_TABLE)
- MySQL indexing (DESC index support)

## Sources Consulted
- MySQL 8.0 Reference Manual — Lateral Derived Tables: https://dev.mysql.com/doc/refman/8.0/en/lateral-derived-tables.html
- MySQL 8.0 Reference Manual — JSON_TABLE: https://dev.mysql.com/doc/refman/8.0/en/json-table-functions.html
- MySQL 8.0 Reference Manual — CREATE INDEX (descending indexes): https://dev.mysql.com/doc/refman/8.0/en/descending-indexes.html
- MySQL 8.0 Release Notes for 8.0.14: https://dev.mysql.com/doc/relnotes/mysql/8.0/en/news-8-0-14.html

## Issues Found
No technical issues found.

## Review Notes
- The "Computing per-row aggregates" example uses a nested non-LATERAL derived table within a LATERAL body that references the outer table (`c.customer_id`). This works because the LATERAL mechanism binds outer column values before evaluating the body, so the inner derived table receives bound values rather than unresolved column references. This is correct but may confuse readers unfamiliar with how MySQL resolves lateral references at execution time.
- The section "Expanding a JSON or comma-separated column per row" only demonstrates the JSON case; no comma-separated example is provided. This is a content gap, not a technical error.
- JSON_TABLE in MySQL 8.0 has implicit lateral-like behavior (it can reference preceding tables without LATERAL). The example wraps JSON_TABLE in a LATERAL subquery, which is redundant but not incorrect — the LATERAL keyword is needed for the enclosing derived table to reference `e.tags`, so the pattern is valid.
- All examples are compatible with MySQL 8.0.14 and later. The `ON TRUE` join condition is valid MySQL syntax.
