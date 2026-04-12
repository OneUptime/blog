# Validation Summary: How to Add a Primary Key with ALTER TABLE in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (InnoDB storage engine)
- SQL DDL (ALTER TABLE, CREATE TABLE)
- MySQL information_schema
- pt-online-schema-change / gh-ost (online schema change tools)

## Sources Consulted
- MySQL 8.0 Reference Manual: ALTER TABLE — https://dev.mysql.com/doc/refman/8.0/en/alter-table.html
- MySQL 8.0 Reference Manual: Online DDL Operations — https://dev.mysql.com/doc/refman/8.0/en/innodb-online-ddl-operations.html
- MySQL 8.0 Reference Manual: CREATE TABLE — https://dev.mysql.com/doc/refman/8.0/en/create-table.html
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA KEY_COLUMN_USAGE Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-key-column-usage-table.html
- MySQL 8.0 Reference Manual: SHOW INDEX Statement — https://dev.mysql.com/doc/refman/8.0/en/show-index.html

## Issues Found
1. **Performance Considerations section: incorrect instant DDL claim and invalid LOCK = NONE**
   - **What was wrong:** The text referred to "MySQL 8.0 instant DDL" for adding a primary key, but adding a primary key is NOT an instant DDL operation (ALGORITHM=INSTANT does not support primary key additions). The code example used `ALGORITHM = INPLACE, LOCK = NONE`, but MySQL does not permit `LOCK = NONE` when adding a primary key because concurrent DML is not allowed for this operation — it requires a table rebuild. Running this statement would produce an error.
   - **What was changed:** Updated the text to correctly describe `ALGORITHM = INPLACE` behavior (avoids table copy but still rebuilds, does not permit concurrent DML). Changed `LOCK = NONE` to `LOCK = SHARED` which is a valid option that allows concurrent reads while blocking writes. Replaced the "instant DDL" mention with a recommendation for `pt-online-schema-change` or `gh-ost` as appropriate tools for large production tables. Updated code comments to accurately describe what each clause does.
   - **Why:** Per the MySQL 8.0 Online DDL Operations documentation, adding a primary key supports In-Place = Yes, Rebuilds Table = Yes, Permits Concurrent DML = No. This means LOCK=NONE is rejected by the server.

## Review Notes
- All SQL syntax throughout the post is correct and uses current MySQL 8.0 conventions.
- The information_schema queries for checking primary keys and finding tables without primary keys are accurate.
- The DESCRIBE output matches what MySQL would produce for the given ALTER TABLE statement.
- The HAVING clause using a column alias (`HAVING cnt > 1`) is valid in MySQL, though it is a MySQL extension to standard SQL.
- The advice about using pt-online-schema-change for large tables is sound. Added gh-ost as an additional widely-used alternative.
