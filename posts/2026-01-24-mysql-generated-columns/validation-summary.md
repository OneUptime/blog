# Validation Summary: How to Handle Generated Columns in MySQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL generated columns
- Virtual generated columns
- Stored generated columns
- InnoDB secondary indexes
- JSON extraction and indexing
- SQL DDL and DML

## Sources Consulted
- MySQL 8.4 Reference Manual: CREATE TABLE and Generated Columns - https://dev.mysql.com/doc/refman/8.4/en/create-table-generated-columns.html
- MySQL 8.4 Reference Manual: Secondary Indexes and Generated Columns - https://dev.mysql.com/doc/refman/8.4/en/create-table-secondary-indexes.html
- MySQL 8.4 Reference Manual: ALTER TABLE and Generated Columns - https://dev.mysql.com/doc/refman/8.4/en/alter-table-generated-columns.html
- MySQL 5.7 Reference Manual: CREATE TABLE and Generated Columns - https://dev.mysql.com/doc/refman/5.7/en/create-table-generated-columns.html
- MySQL 9.7 Reference Manual: The JSON Data Type - https://dev.mysql.com/doc/en/json.html

## Issues Found
- The computed age example used `CURDATE()` in a virtual generated column. MySQL generated column expressions require deterministic functions, so this would fail. Replaced it with a deterministic birth-year example using `YEAR(birth_date)`.
- The computed subscription status example used `CURDATE()` in a virtual generated column. Replaced it with a deterministic expression based on a stored `checked_on` column.
- The limitations section claimed virtual generated columns can use some non-deterministic functions such as `NOW()`. MySQL documentation lists `NOW()` as non-deterministic and disallowed in generated column expressions. Updated the example to show that it fails.
- The limitations section claimed generated columns cannot reference other generated columns in MySQL 5.7. MySQL 5.7 allows references to generated columns that occur earlier in the table definition. Updated the example to show the real restriction: generated columns cannot reference generated columns defined later.
- The updating section said generated columns cannot be directly modified. MySQL allows `ALTER TABLE ... MODIFY COLUMN` for data type and expression changes, but changing between `VIRTUAL` and `STORED` requires dropping and recreating the column. Updated the section accordingly.
- The indexing guidance implied indexed columns should be stored and that virtual columns have no storage or write cost. InnoDB supports secondary indexes on virtual generated columns, and materializes values in those index records. Updated the decision tree, table, note, and best practices to reflect this.
- The migration section said generated columns are excluded from `INSERT` statements. MySQL permits explicitly listing a generated column only if the supplied value is `DEFAULT`. Updated the wording and example.

## Review Notes
The post is now technically accurate for modern MySQL/InnoDB generated-column behavior, with relevant MySQL 5.7 caveats preserved. MySQL 8.0.13+ also supports functional indexes, which may be an alternative to generated columns for some expression-indexing use cases, but that is outside the scope of this post.
