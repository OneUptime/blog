# Validation Summary: How to Add and Drop Indexes with ALTER TABLE in MySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL (InnoDB storage engine)
- SQL DDL (ALTER TABLE, CREATE TABLE)
- MySQL indexing (B-tree, FULLTEXT, prefix, composite, unique indexes)
- MySQL performance_schema
- MySQL information_schema

## Sources Consulted
- MySQL 8.0 Reference Manual: ALTER TABLE — https://dev.mysql.com/doc/refman/8.0/en/alter-table.html
- MySQL 8.0 Reference Manual: CREATE INDEX — https://dev.mysql.com/doc/refman/8.0/en/create-index.html
- MySQL 8.0 Reference Manual: SHOW INDEX — https://dev.mysql.com/doc/refman/8.0/en/show-index.html
- MySQL 8.0 Reference Manual: Full-Text Search Functions — https://dev.mysql.com/doc/refman/8.0/en/fulltext-search.html
- MySQL 8.0 Reference Manual: Online DDL Operations — https://dev.mysql.com/doc/refman/8.0/en/innodb-online-ddl-operations.html
- MySQL 8.0 Reference Manual: The INFORMATION_SCHEMA STATISTICS Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-statistics-table.html
- MySQL 8.0 Reference Manual: The table_io_waits_summary_by_index_usage Table — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-table-io-waits-summary-by-index-usage-table.html
- MySQL 8.0 Reference Manual: The events_statements_summary_by_digest Table — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-statement-summary-tables.html

## Issues Found
No technical issues found.

## Review Notes
- The SHOW INDEX output is a simplified subset of the actual MySQL output (which includes additional columns like Collation, Cardinality, Sub_part, Packed, Null, Comment, etc.). This is acceptable for illustration purposes.
- The best practice "put the most selective column first in a composite index" is a widely taught simplification. In practice, the optimal column order also depends on query patterns (equality vs. range conditions) and the leftmost prefix rule, but the advice is not incorrect as a general guideline.
- The ALGORITHM=INPLACE and LOCK=NONE options are available starting from MySQL 5.6 for most index operations. The post does not specify a minimum version, but this is a reasonable omission since MySQL 5.6+ is standard at this point.
- DROP PRIMARY KEY has additional constraints not mentioned (e.g., if the primary key column is AUTO_INCREMENT, you must first remove AUTO_INCREMENT or add another index). This is a minor omission that doesn't affect correctness of the syntax shown.
