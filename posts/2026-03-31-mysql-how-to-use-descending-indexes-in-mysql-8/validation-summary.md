# Validation Summary: How to Use Descending Indexes in MySQL 8

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0
- Descending Indexes (InnoDB B-tree indexes with DESC key parts)
- SQL DDL (CREATE TABLE, ALTER TABLE, CREATE INDEX)
- EXPLAIN query analysis
- information_schema.statistics

## Sources Consulted
- MySQL 8.0 Reference Manual — Descending Indexes: https://dev.mysql.com/doc/refman/8.0/en/descending-indexes.html
- MySQL 8.0 Reference Manual — CREATE INDEX Statement: https://dev.mysql.com/doc/refman/8.0/en/create-index.html
- MySQL 8.0 Reference Manual — INFORMATION_SCHEMA STATISTICS Table: https://dev.mysql.com/doc/refman/8.0/en/information-schema-statistics-table.html
- MySQL 8.0 Reference Manual — EXPLAIN Output Format: https://dev.mysql.com/doc/refman/8.0/en/explain-output.html
- MySQL Server Blog — MySQL 8.0: Descending Indexes Can Speed Up Your Queries: https://mysqlserverteam.com/mysql-8-0-labs-descending-indexes-in-mysql/

## Issues Found
- **Misleading comment in "Practical Example" section**: The SQL comment said "Get the 5 most recent orders per customer" but the query uses a correlated subquery with `MAX(created_at)` to select only the single most recent order per customer, then applies `LIMIT 5` to the overall result. Fixed the comment to "Get the latest order per customer, limited to 5 results" to accurately describe the query behavior.

## Review Notes
- The claim that backward index scans are "slightly less efficient" is directionally correct. InnoDB page structure uses singly-linked lists for records within a page, making reverse traversal somewhat more expensive. For single-column DESC queries on small result sets, the difference is minimal, but for large scans the native descending index provides a measurable benefit.
- All SQL syntax is valid for MySQL 8.0 and uses current, non-deprecated features.
- The `information_schema.statistics` query correctly identifies `COLLATION` column values of `A` (ascending) and `D` (descending) for MySQL 8.0 descending indexes.
