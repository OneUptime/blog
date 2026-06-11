# Validation Summary: How to Implement Bridge Tables

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dimensional modeling
- Bridge tables
- Many-to-many relationships
- MySQL 8.0+ SQL
- Stored procedures
- Window functions
- Common table expressions
- Range partitioning

## Sources Consulted
- MySQL 8.4 Reference Manual: FOREIGN KEY Constraints - https://dev.mysql.com/doc/refman/8.4/en/create-table-foreign-keys.html
- MySQL 8.4 Reference Manual: CREATE PROCEDURE and CREATE FUNCTION Statements - https://dev.mysql.com/doc/refman/8.4/en/create-procedure.html
- MySQL 8.4 Reference Manual: GROUP_CONCAT aggregate function - https://dev.mysql.com/doc/refman/8.4/en/aggregate-functions.html
- MySQL 8.4 Reference Manual: Window Function Descriptions, including LAG - https://dev.mysql.com/doc/refman/8.4/en/window-function-descriptions.html
- MySQL 8.0 Reference Manual: WITH Common Table Expressions - https://dev.mysql.com/doc/refman/8.0/en/with.html
- MySQL 8.4 Reference Manual: RANGE Partitioning - https://dev.mysql.com/doc/refman/8.4/en/partitioning-range.html
- MySQL 8.4 FAQ: Views and materialized views - https://dev.mysql.com/doc/refman/8.4/en/faqs-views.html
- Kimball Group: Multivalued Dimensions and Bridge Tables - https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/multivalued-dimension-bridge-table/

## Issues Found
- The original SQL mixed MySQL and PostgreSQL syntax. I made the tutorial explicitly target MySQL 8.0+ and replaced PostgreSQL-only `DATE_TRUNC` usage with MySQL `DATE_FORMAT`.
- The fact table attempted to declare a foreign key to `bridge_promotion(promotion_group_key)`, but that column is not unique in the bridge table. I moved `promotion_group_lookup` creation before the bridge table and changed both the bridge and fact tables to reference `promotion_group_lookup(promotion_group_key)`.
- The stored procedure did not handle the no-row path from `SELECT ... INTO` explicitly and could divide by zero for invalid promotion IDs. I added a `NOT FOUND` handler, initialized the output group key before lookup, and added a `SIGNAL` for empty/invalid promotion groups.
- The custom weight update examples used correlated self-referencing subqueries that are not reliable MySQL update patterns. I rewrote them as `UPDATE ... JOIN` statements over derived aggregate tables.
- MySQL does not support native materialized views. I replaced the materialized view example with a pre-aggregated table pattern using `CREATE TABLE ... AS SELECT` and a truncate/insert refresh strategy.
- The range partition catchall used `VALUES LESS THAN (MAXVALUE)`. I changed it to MySQL's documented `VALUES LESS THAN MAXVALUE` form.

## Review Notes
The corrected core MySQL snippets were executed successfully against a local `mysql:8` Docker container, including table creation, foreign keys, the stored procedure, sample inserts, weighted updates, the month-based window query, employee skill weighting, and the partitioned table example. The broader dimensional modeling explanation and weight-factor guidance are technically sound, but production systems should document the business meaning of attribution weights because equal, discount-based, and exposure-based metrics answer different analytical questions.
