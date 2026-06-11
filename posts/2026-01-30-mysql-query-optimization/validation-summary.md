# Validation Summary: How to Build MySQL Query Optimization Strategies

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- MySQL
- SQL
- MySQL Performance Schema
- MySQL sys schema
- InnoDB
- Query execution plans and EXPLAIN
- Indexing and query optimization

## Sources Consulted
- MySQL 8.4 Reference Manual: The Slow Query Log: https://dev.mysql.com/doc/refman/8.4/en/slow-query-log.html
- MySQL 8.4 Reference Manual: EXPLAIN Statement: https://dev.mysql.com/doc/refman/8.4/en/explain.html
- MySQL 8.4 Reference Manual: Statement Summary Tables: https://dev.mysql.com/doc/refman/8.4/en/performance-schema-statement-summary-tables.html
- MySQL 8.4 Reference Manual: Multiple-Column Indexes: https://dev.mysql.com/doc/refman/8.4/en/multiple-column-indexes.html
- MySQL 8.4 Reference Manual: Row Constructor Expression Optimization: https://dev.mysql.com/doc/refman/8.4/en/row-constructor-optimization.html
- MySQL 8.4 Reference Manual: Table I/O and Lock Wait Summary Tables: https://dev.mysql.com/doc/refman/8.4/en/performance-schema-table-wait-summary-tables.html
- MySQL 8.4 Reference Manual: The schema_unused_indexes View: https://dev.mysql.com/doc/refman/8.4/en/sys-schema-unused-indexes.html
- MySQL 8.4 Reference Manual: Type Conversion in Expression Evaluation: https://dev.mysql.com/doc/refman/8.4/en/type-conversion.html
- MySQL 8.4 Reference Manual: Buffer Pool: https://dev.mysql.com/doc/refman/8.4/en/innodb-buffer-pool.html
- MySQL 8.4 Reference Manual: InnoDB Persistent Statistics: https://dev.mysql.com/doc/refman/8.4/en/innodb-persistent-stats.html

## Issues Found
- The custom unused-index query joined `information_schema.STATISTICS` directly to `performance_schema.table_io_waits_summary_by_index_usage`, which is easy to misinterpret because the Performance Schema table also uses `INDEX_NAME = NULL` for table I/O that used no index and for inserts. Replaced it with the official `sys.schema_unused_indexes` view, which MySQL documents for indexes with no recorded usage events.
- The functions-on-indexed-columns section said functions prevent index usage without qualification. Updated the wording to specify a normal index on the raw column, since MySQL can use matching generated-column or expression-based indexing strategies in newer versions.
- The implicit type conversion example claimed that comparing an INT column to a numeric string may prevent index use. MySQL documents the index issue for an indexed string column compared to a number, so the example was reversed to use a VARCHAR `customer_id` compared to a numeric literal.

## Review Notes
- The guidance is generally accurate for modern MySQL 8.x. The unused-index view is only meaningful after the server has processed a representative workload, which is now noted in the SQL example.
