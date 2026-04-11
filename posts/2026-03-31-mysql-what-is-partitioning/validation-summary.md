# Validation Summary: What Is Partitioning in MySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL (InnoDB, MyISAM)
- MySQL Partitioning (RANGE, LIST, HASH, KEY)
- SQL DDL (CREATE TABLE, ALTER TABLE)
- information_schema.PARTITIONS

## Sources Consulted
- MySQL 8.0 Reference Manual: Partitioning — https://dev.mysql.com/doc/refman/8.0/en/partitioning.html
- MySQL 8.0 Reference Manual: RANGE Partitioning — https://dev.mysql.com/doc/refman/8.0/en/partitioning-range.html
- MySQL 8.0 Reference Manual: LIST Partitioning — https://dev.mysql.com/doc/refman/8.0/en/partitioning-list.html
- MySQL 8.0 Reference Manual: HASH Partitioning — https://dev.mysql.com/doc/refman/8.0/en/partitioning-hash.html
- MySQL 8.0 Reference Manual: Partition Pruning — https://dev.mysql.com/doc/refman/8.0/en/partitioning-pruning.html
- MySQL 8.0 Reference Manual: Partition Management — https://dev.mysql.com/doc/refman/8.0/en/partitioning-management.html
- MySQL 8.0 Reference Manual: Partitioning Limitations — https://dev.mysql.com/doc/refman/8.0/en/partitioning-limitations.html

## Issues Found

1. **ADD PARTITION fails when MAXVALUE partition exists**: The "Managing Partitions" section used `ALTER TABLE orders ADD PARTITION (PARTITION p2026 VALUES LESS THAN (2027))`, but the `orders` table already has a `p_future VALUES LESS THAN MAXVALUE` partition. MySQL does not allow adding a new RANGE partition after a MAXVALUE catch-all (ERROR 1481). Fixed by replacing with `ALTER TABLE orders REORGANIZE PARTITION p_future INTO (PARTITION p2026 VALUES LESS THAN (2027), PARTITION p_future VALUES LESS THAN MAXVALUE)`.

2. **Primary key / unique index partitioning rule stated backwards**: The limitations section said "All columns in a PRIMARY KEY or UNIQUE index must be part of the partitioning expression." The actual MySQL rule is the reverse: every PRIMARY KEY or UNIQUE index must include all columns used in the partitioning expression. The original wording contradicted the post's own examples (e.g., `id` is in the PK but not in the partitioning expression `YEAR(created_at)`). Fixed to: "Every PRIMARY KEY or UNIQUE index must include all columns used in the partitioning expression."

## Review Notes
- The partition pruning example with `WHERE created_at BETWEEN '2024-01-01' AND '2025-12-31'` is correct — MySQL can prune RANGE partitions using `YEAR()` when the WHERE clause uses date range comparisons on the underlying column.
- The FULLTEXT index restriction on partitioned tables remains accurate as of MySQL 8.0.
- The foreign key restriction on partitioned tables remains accurate as of MySQL 8.0.
- The information_schema.PARTITIONS query is correct; note that TABLE_ROWS is an estimate for InnoDB (not exact), but this is acceptable for the use case shown.
