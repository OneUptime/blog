# Validation Summary: How to Add a UNIQUE Constraint with ALTER TABLE in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (DDL, DML, information_schema)
- SQL (ALTER TABLE, UNIQUE constraints, ON DUPLICATE KEY UPDATE)

## Sources Consulted
- MySQL 8.0 Reference Manual: ALTER TABLE — https://dev.mysql.com/doc/refman/8.0/en/alter-table.html
- MySQL 8.0 Reference Manual: CREATE INDEX — https://dev.mysql.com/doc/refman/8.0/en/create-index.html
- MySQL 8.0 Reference Manual: UNIQUE Indexes — https://dev.mysql.com/doc/refman/8.0/en/create-index.html#create-index-unique
- MySQL 8.0 Reference Manual: INSERT ... ON DUPLICATE KEY UPDATE — https://dev.mysql.com/doc/refman/8.0/en/insert-on-duplicate.html
- MySQL 8.0 Reference Manual: SHOW INDEX — https://dev.mysql.com/doc/refman/8.0/en/show-index.html
- MySQL 8.0 Reference Manual: The INFORMATION_SCHEMA TABLE_CONSTRAINTS Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-table-constraints-table.html
- MySQL 8.0 Reference Manual: The INFORMATION_SCHEMA KEY_COLUMN_USAGE Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-key-column-usage-table.html

## Issues Found
No technical issues found.

## Review Notes
- The upsert example uses `VALUES(username)` in the `ON DUPLICATE KEY UPDATE` clause. This syntax has been deprecated since MySQL 8.0.20 (April 2020) in favor of the row alias syntax: `INSERT INTO ... VALUES (...) AS new ON DUPLICATE KEY UPDATE username = new.username`. The deprecated form still works in current MySQL versions, so it is not incorrect, but readers using MySQL 8.0.20+ may see deprecation warnings.
- The `SHOW INDEX` output example is simplified to show only four columns (Table, Key_name, Column_name, Non_unique). The actual output includes additional columns (Seq_in_index, Collation, Cardinality, Sub_part, Packed, Null, Index_type, Comment, Index_comment, Visible, Expression). This is a reasonable simplification for readability.
