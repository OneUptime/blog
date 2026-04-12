# Validation Summary: How to Use InnoDB General Tablespaces in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0+
- InnoDB storage engine
- InnoDB general tablespaces
- information_schema views (INNODB_TABLESPACES, INNODB_TABLES, TABLES)

## Sources Consulted
- MySQL 8.0 Reference Manual — General Tablespaces: https://dev.mysql.com/doc/refman/8.0/en/general-tablespaces.html
- MySQL 8.4 Reference Manual — General Tablespaces: https://dev.mysql.com/doc/refman/8.4/en/general-tablespaces.html
- MySQL 8.0 Reference Manual — CREATE TABLESPACE: https://dev.mysql.com/doc/refman/8.0/en/create-tablespace.html
- MySQL 8.0 Reference Manual — INNODB_TABLESPACES Table: https://dev.mysql.com/doc/refman/8.0/en/information-schema-innodb-tablespaces-table.html

## Issues Found
1. **Incorrect claim about COMPRESSED row format**: The post stated "The COMPRESSED row format is not supported in general tablespaces." This is incorrect for MySQL 8.0+. All row formats (REDUNDANT, COMPACT, DYNAMIC, and COMPRESSED) are supported. The caveat is that compressed and uncompressed tables cannot coexist in the same general tablespace, and the tablespace must be created with a `FILE_BLOCK_SIZE` specification for compressed tables. Fixed the explanation and added a code example showing how to create a general tablespace for compressed tables using `FILE_BLOCK_SIZE` and `KEY_BLOCK_SIZE`.

## Review Notes
- The `ADD DATAFILE` clause became optional in MySQL 8.0.14+ (InnoDB can auto-generate a unique filename). The post's syntax is still valid but does not mention this convenience.
- The `ENGINE=InnoDB` clause is optional in MySQL 8.0+ since InnoDB is the default engine, but specifying it explicitly is not an error.
- The query using `information_schema.TABLES WHERE CREATE_OPTIONS LIKE '%tablespace=app_data%'` is a workable approach but can be fragile depending on MySQL's formatting of CREATE_OPTIONS. The alternative query via INNODB_TABLES/INNODB_TABLESPACES shown in the post is more reliable.
