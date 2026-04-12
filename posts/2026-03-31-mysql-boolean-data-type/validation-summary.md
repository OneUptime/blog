# Validation Summary: How to Use BOOLEAN (BOOL) Data Type in MySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL (BOOLEAN/BOOL data type, TINYINT(1), CHECK constraints, indexing)
- SQL (DDL, DML, aggregation patterns)
- Python / SQLAlchemy (ORM mapping example)

## Sources Consulted
- MySQL 8.0 Reference Manual: Data Types — https://dev.mysql.com/doc/refman/8.0/en/integer-types.html
- MySQL 8.0 Reference Manual: Boolean Literals — https://dev.mysql.com/doc/refman/8.0/en/boolean-literals.html
- MySQL 8.0 Reference Manual: CREATE TABLE CHECK Constraints — https://dev.mysql.com/doc/refman/8.0/en/create-table-check-constraints.html
- MySQL 8.0 Reference Manual: Comparison Functions and Operators (IS TRUE, IS FALSE) — https://dev.mysql.com/doc/refman/8.0/en/comparison-operators.html
- MySQL 8.0 Reference Manual: Index Hints (USE INDEX) — https://dev.mysql.com/doc/refman/8.0/en/index-hints.html
- SQLAlchemy Documentation: Column and Data Types — https://docs.sqlalchemy.org/en/20/core/type_basics.html

## Issues Found
1. **Incorrect "covering index" comment**: The SQL comment on the last query in the "Indexing Boolean Columns" section said "Partial-table scan with covering index". The index `(is_public, is_enabled)` does not cover the query `SELECT flag_name` because `flag_name` is not included in the index — a table row lookup is still needed to retrieve `flag_name`. Changed the comment to "Use the composite index to filter efficiently" which accurately describes the behavior.

## Review Notes
- The post notes that `IS TRUE` and `= 1` are "equivalent" comparisons. Strictly speaking, `IS TRUE` matches any non-zero, non-NULL value, while `= 1` only matches the value 1. For typical BOOLEAN usage (where only 0 and 1 are stored), they are equivalent, and the post does recommend CHECK constraints to enforce 0/1 values, so this is acceptable in context.
- CHECK constraints are only enforced starting with MySQL 8.0.16. Prior versions accept the syntax but silently ignore the constraint. The post doesn't specify a MySQL version, which is fine since MySQL 8.0 is the current major release, but readers on older versions should be aware.
- The SQLAlchemy snippet uses `Column(Boolean, ..., default=False)` which sets a Python-side default, not a server-side `DEFAULT`. This is standard SQLAlchemy usage and correct for the example shown.
