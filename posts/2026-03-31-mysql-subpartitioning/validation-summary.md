# Validation Summary: How to Use Subpartitioning in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (partitioning / subpartitioning)
- InnoDB storage engine
- INFORMATION_SCHEMA.PARTITIONS

## Sources Consulted
- MySQL 8.0 Reference Manual — Subpartitions: https://dev.mysql.com/doc/refman/8.0/en/partitioning-subpartitions.html
- MySQL 8.0 Reference Manual — INFORMATION_SCHEMA PARTITIONS Table: https://dev.mysql.com/doc/refman/8.0/en/information-schema-partitions-table.html
- MySQL 8.0 Reference Manual — Partitioning Limitations: https://dev.mysql.com/doc/refman/8.0/en/partitioning-limitations.html

## Issues Found
No technical issues found.

## Review Notes
- All three SQL CREATE TABLE examples are syntactically correct and use valid partitioning/subpartitioning combinations (RANGE+HASH, RANGE+KEY, RANGE+HASH with named subpartitions).
- Primary keys in all examples correctly include the columns used in both the partition and subpartition expressions, satisfying MySQL's requirement that partitioning columns be part of the primary key.
- The INFORMATION_SCHEMA query references only columns that exist in the PARTITIONS table (PARTITION_NAME, SUBPARTITION_NAME, PARTITION_METHOD, SUBPARTITION_METHOD, TABLE_ROWS).
- The math of 4 partitions x 4 subpartitions = 16 physical files is correct.
- The four rules listed under "Rules and Constraints" are all accurate per official documentation.
- One minor note: `SUBPARTITION BY KEY` requires the column to be explicitly specified (unlike `PARTITION BY KEY` which can default to the primary key column). The post does specify the column explicitly in its example, so this is correct, but the distinction is not called out. This is a very minor omission and not an error.
