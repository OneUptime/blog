# Validation Summary: How to Drop an Index in MySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL (InnoDB storage engine)
- SQL DDL (DROP INDEX, ALTER TABLE)
- MySQL information_schema
- MySQL performance_schema
- Online DDL (ALGORITHM=INPLACE, LOCK=NONE)

## Sources Consulted
- MySQL 8.0 Reference Manual: DROP INDEX Statement — https://dev.mysql.com/doc/refman/8.0/en/drop-index.html
- MySQL 8.0 Reference Manual: ALTER TABLE Statement — https://dev.mysql.com/doc/refman/8.0/en/alter-table.html
- MySQL 8.0 Reference Manual: Online DDL Operations — https://dev.mysql.com/doc/refman/8.0/en/innodb-online-ddl-operations.html
- MySQL 8.0 Reference Manual: information_schema STATISTICS Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-statistics-table.html
- MySQL 8.0 Reference Manual: table_io_waits_summary_by_index_usage Table — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-table-io-waits-summary-by-index-usage-table.html
- MySQL 8.0 Reference Manual: Invisible Indexes — https://dev.mysql.com/doc/refman/8.0/en/invisible-indexes.html

## Issues Found
No technical issues found.

## Review Notes
- The summary mentions "consider making the index invisible first as a safer intermediate step" (a valid MySQL 8.0+ feature via `ALTER TABLE t ALTER INDEX idx INVISIBLE`), but this technique is not explained anywhere in the body of the post. A future revision could add a short section demonstrating invisible indexes as a safety step before dropping.
- The claim "Combining drops and additions in one statement reduces the number of table rebuilds" is broadly true for mixed DDL operations, though for secondary index operations specifically with `ALGORITHM=INPLACE`, dropping is a metadata-only operation and adding builds the index without a full table copy. The statement is not wrong but could be more precise.
- The `COUNT_READ` and `COUNT_FETCH` check for index usage is practical and sound. A more comprehensive check could also verify `COUNT_WRITE` is zero, but for the purpose of deciding whether an index is useful for query optimization, read metrics are what matter most.
