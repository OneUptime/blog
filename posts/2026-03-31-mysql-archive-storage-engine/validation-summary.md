# Validation Summary: What Is the ARCHIVE Storage Engine in MySQL

## Status
validated

## Post Type
Reference / Guide

## Technologies Covered
- MySQL ARCHIVE storage engine
- MySQL information_schema
- zlib compression (as used by ARCHIVE engine)
- SQL DDL and DML syntax

## Sources Consulted
- MySQL 8.0 Reference Manual, Section 18.5: The ARCHIVE Storage Engine (https://dev.mysql.com/doc/refman/8.0/en/archive-storage-engine.html)
- MySQL 8.0 Reference Manual: information_schema.TABLES (https://dev.mysql.com/doc/refman/8.0/en/information-schema-tables-table.html)
- MySQL 8.0 Reference Manual: SHOW ENGINES (https://dev.mysql.com/doc/refman/8.0/en/show-engines.html)

## Issues Found
1. **Missing REPLACE in supported operations**: The post stated that ARCHIVE tables support only `INSERT` and `SELECT` operations. Per the MySQL documentation, the ARCHIVE engine also supports `REPLACE`. This was corrected in two places:
   - In the "Core Characteristics" section: changed "support only `INSERT` and `SELECT` operations" to "support only `INSERT`, `REPLACE`, and `SELECT` operations."
   - In the "Summary" section: changed "It supports only INSERT and SELECT" to "It supports only INSERT, REPLACE, and SELECT."

## Review Notes
- The compression ratio claim of "3:1 to 10:1" is a reasonable general estimate, though actual ratios vary significantly depending on data characteristics. This is not an error but readers should understand their results may differ.
- The statement "all queries other than primary key lookups require a full table scan" is technically accurate given that ARCHIVE supports an index on the AUTO_INCREMENT column, but readers should understand that even with this index, ARCHIVE is not optimized for frequent read queries of any kind.
- The ARCHIVE engine uses row-level locking (not mentioned in the post), which could be relevant for concurrent insert workloads. This is not an error but could be a useful addition in a future revision.
- As of MySQL 8.0, the ARCHIVE engine is included by default but may not be available in all distributions or configurations. The post correctly recommends checking with `SHOW ENGINES`.
