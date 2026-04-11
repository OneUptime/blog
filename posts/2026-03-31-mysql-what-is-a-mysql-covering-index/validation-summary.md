# Validation Summary: What Is a MySQL Covering Index

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL (InnoDB storage engine)
- SQL (CREATE INDEX, EXPLAIN, SELECT)
- MySQL covering indexes and secondary index internals

## Sources Consulted
- MySQL 8.0 Reference Manual: Clustered and Secondary Indexes (https://dev.mysql.com/doc/refman/8.0/en/innodb-index-types.html)
- MySQL 8.0 Reference Manual: EXPLAIN Output Format, "Using index" Extra value (https://dev.mysql.com/doc/refman/8.0/en/explain-output.html)
- MySQL 8.0 Reference Manual: InnoDB Index Statistics (mysql.innodb_index_stats table) (https://dev.mysql.com/doc/refman/8.0/en/innodb-persistent-stats.html)
- MySQL 8.0 Reference Manual: CREATE INDEX syntax (https://dev.mysql.com/doc/refman/8.0/en/create-index.html)

## Issues Found
No technical issues found.

## Review Notes
- The post lists `SELECT`, `WHERE`, `JOIN ON`, and `ORDER BY` as clauses whose columns must be in a covering index. This is correct but does not explicitly mention `GROUP BY` or `HAVING` clauses, which also require their columns to be present in the index for it to be covering. This is a minor omission in an illustrative list, not an error, since the core principle (all referenced columns must be in the index) is stated correctly.
- All SQL examples use valid syntax including the `\G` vertical output modifier for the MySQL client.
- The `mysql.innodb_index_stats` query correctly uses `stat_name = 'size'` (page count) multiplied by `@@innodb_page_size` to compute index size in megabytes.
- The post correctly distinguishes "Using index" (covering index) from other EXPLAIN Extra values, though it does not mention "Using index condition" (Index Condition Pushdown), which is a different optimization that readers sometimes confuse with covering indexes.
