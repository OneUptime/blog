# Validation Summary: How to Identify Duplicate Indexes in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (InnoDB B-tree indexes, information_schema.STATISTICS)
- Percona Toolkit (pt-duplicate-key-checker)
- MySQL Online DDL (ALGORITHM=INPLACE, LOCK=NONE)

## Sources Consulted
- MySQL 8.0 Reference Manual — The INFORMATION_SCHEMA STATISTICS Table: https://dev.mysql.com/doc/refman/8.0/en/information-schema-statistics-table.html
- MySQL 8.0 Reference Manual — CREATE INDEX Statement: https://dev.mysql.com/doc/refman/8.0/en/create-index.html
- MySQL 8.0 Reference Manual — Multiple-Column Indexes (leftmost prefix rule): https://dev.mysql.com/doc/refman/8.0/en/multiple-column-indexes.html
- MySQL 8.0 Reference Manual — Online DDL Operations (ALTER TABLE ... DROP INDEX): https://dev.mysql.com/doc/refman/8.0/en/innodb-online-ddl-operations.html
- Percona Toolkit — pt-duplicate-key-checker documentation: https://docs.percona.com/percona-toolkit/pt-duplicate-key-checker.html

## Issues Found
1. **Exact duplicates query was missing HAVING clause to verify column count parity.** The original query joined `information_schema.STATISTICS` on matching `SEQ_IN_INDEX` and `COLUMN_NAME` but did not verify that both indexes have the same total number of columns. Without this check, the query would also match prefix-redundant indexes as false "exact duplicates" (e.g., `idx(customer_id)` would match `idx(customer_id, status)` because they share position 1). Added a `HAVING` clause with two correlated subqueries to ensure `COUNT(*)` equals the total column count of both index `a` and index `b`, restricting results to true exact duplicates only.

## Review Notes
- The prefix-redundant index detection query correctly uses a HAVING clause that checks the matched count against the narrow index's column count, properly identifying prefix relationships.
- The pt-duplicate-key-checker command uses `--password` on the command line, which works but will display a warning about insecure password usage. In production, `--ask-pass` is preferred. This is acceptable for a tutorial example.
- The `ALTER TABLE ... DROP INDEX` with `ALGORITHM=INPLACE, LOCK=NONE` is correct for InnoDB in MySQL 5.6+. Dropping a secondary index is a metadata-only operation in InnoDB and supports online DDL without blocking concurrent DML.
- The advice about not dropping unique indexes in favor of non-unique ones is an important and correct caveat.
