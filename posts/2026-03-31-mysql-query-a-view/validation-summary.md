# Validation Summary: How to Query a View in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (views, SELECT, WHERE, JOIN, EXPLAIN, MERGE/TEMPTABLE algorithms)
- SQL (DDL with CREATE VIEW, DML with SELECT)

## Sources Consulted
- MySQL 8.0 Reference Manual — CREATE VIEW Statement: https://dev.mysql.com/doc/refman/8.0/en/create-view.html
- MySQL 8.0 Reference Manual — View Algorithms: https://dev.mysql.com/doc/refman/8.0/en/view-algorithms.html
- MySQL 8.0 Reference Manual — SHOW TABLES Statement: https://dev.mysql.com/doc/refman/8.0/en/show-tables.html
- MySQL 8.0 Reference Manual — EXPLAIN Output Format: https://dev.mysql.com/doc/refman/8.0/en/explain-output.html

## Issues Found

1. **Incorrect TEMPTABLE trigger condition** (line 83): The post stated that "subqueries in `FROM`" force the TEMPTABLE algorithm. The MySQL documentation specifies that MERGE cannot be used when there is a "subquery in the select list", not in the FROM clause. Changed "subqueries in `FROM`" to "subqueries in the select list".

2. **Incorrect claim about filtering on aggregated columns** (line 105): The post stated "you cannot add a `WHERE` clause that filters on `revenue` directly because MySQL must materialize the aggregation first." This is incorrect — you can filter on `revenue` in the outer query; MySQL materializes the view first and then applies the WHERE filter to the result. The performance nuance is that the filter cannot be pushed down into the base table scan, not that it cannot be used at all. Rewrote the note to accurately describe the TEMPTABLE behavior.

## Review Notes
- All SQL syntax examples are correct and would execute without errors.
- The HAVING clause using a column alias (`order_count`) is valid in MySQL, though not portable to all SQL dialects.
- The EXPLAIN example correctly uses the `\G` vertical output modifier.
- The SHOW FULL TABLES syntax for listing views is correct.
