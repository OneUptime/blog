# Validation Summary: How to Design a Schema for Audit Logging in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (InnoDB engine)
- SQL DDL (CREATE TABLE, ALTER TABLE, partitioning)
- MySQL triggers (AFTER UPDATE, AFTER DELETE)
- MySQL JSON data type and JSON_OBJECT() function
- MySQL session variables for application context passing
- MySQL range partitioning with TO_DAYS()

## Sources Consulted
- MySQL 8.0 Reference Manual: Partitioning Limitations Relating to Keys https://dev.mysql.com/doc/refman/8.0/en/partitioning-limitations-partitioning-keys-unique-keys.html
- MySQL 8.0 Reference Manual: CREATE TABLE Statement https://dev.mysql.com/doc/refman/8.0/en/create-table.html
- MySQL 8.0 Reference Manual: CREATE TRIGGER Statement https://dev.mysql.com/doc/refman/8.0/en/create-trigger.html
- MySQL 8.0 Reference Manual: The JSON Data Type https://dev.mysql.com/doc/refman/8.0/en/json.html
- MySQL 8.0 Reference Manual: JSON_OBJECT() https://dev.mysql.com/doc/refman/8.0/en/json-creation-functions.html
- MySQL 8.0 Reference Manual: Range Partitioning https://dev.mysql.com/doc/refman/8.0/en/partitioning-range.html

## Issues Found
1. **Primary key incompatible with partitioning**: The CREATE TABLE defined `PRIMARY KEY (id)` but the partitioning section used `PARTITION BY RANGE (TO_DAYS(changed_at))`. MySQL requires that every column used in the partitioning expression must be part of every unique key (including the primary key). This would cause error 1503: "A PRIMARY KEY must include all columns in the table's partitioning function." Fixed by changing the primary key to `PRIMARY KEY (id, changed_at)`.

## Review Notes
- `ROW_FORMAT=COMPRESSED` is deprecated as of MySQL 8.0.23 and will be removed in a future release. The post does not specify a MySQL version and the feature is still functional, so no change was made, but authors should be aware of this deprecation.
- The second query (changes by user 42 in last 24 hours) filters on `changed_by` but there is no index on that column. For production use with large audit tables, an index on `(changed_by, changed_at)` would improve performance.
- The post demonstrates AFTER UPDATE and AFTER DELETE triggers but does not include an AFTER INSERT trigger, despite the ENUM including 'INSERT'. This is not an error but could be confusing to readers.
