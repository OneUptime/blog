# Validation Summary: How to Partition Tables in MySQL by RANGE

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (InnoDB engine)
- MySQL RANGE partitioning
- MySQL partition pruning
- UNIX_TIMESTAMP partitioning
- information_schema.PARTITIONS

## Sources Consulted
- MySQL 8.0 Reference Manual — Partitioning by RANGE: https://dev.mysql.com/doc/refman/8.0/en/partitioning-range.html
- MySQL 8.0 Reference Manual — Partition Pruning: https://dev.mysql.com/doc/refman/8.0/en/partitioning-pruning.html
- MySQL 8.0 Reference Manual — Partition Management: https://dev.mysql.com/doc/refman/8.0/en/partitioning-management.html
- MySQL 8.0 Reference Manual — Partitioning Limitations (keys and unique indexes): https://dev.mysql.com/doc/refman/8.0/en/partitioning-limitations-partitioning-keys-unique-keys.html
- MySQL 8.0 Reference Manual — UNIX_TIMESTAMP() partitioning: https://dev.mysql.com/doc/refman/8.0/en/partitioning-range.html#partitioning-range-timestamp

## Issues Found

1. **Incorrect partition pruning claim (line 29)**: The text stated that `WHERE order_date >= '2026-01-01'` "only scans the 2026 partition." Because the `>=` operator is unbounded on the upper end, MySQL would also scan `p_future` (MAXVALUE partition, covering years 2027+). Changed the example to use `WHERE order_date BETWEEN '2026-01-01' AND '2026-12-31'`, which correctly prunes to only `p_2026`.

2. **Wrong column type for UNIX_TIMESTAMP partitioning (line 59)**: The `events` table declared `event_time` as `DATETIME` but used `PARTITION BY RANGE (UNIX_TIMESTAMP(event_time))`. MySQL only supports `UNIX_TIMESTAMP()` as a partitioning expression when the column is of type `TIMESTAMP`, not `DATETIME`. Changed `DATETIME` to `TIMESTAMP`.

3. **Inaccurate description of DROP PARTITION (line 110)**: The text described `DROP PARTITION` as a "metadata-only operation." While it is far faster than row-by-row `DELETE`, it is not merely a metadata change — MySQL also removes the partition's underlying InnoDB tablespace file (`.ibd`). Changed to: "This is a DDL operation that removes the partition's data file directly - no row-by-row deletion occurs."

## Review Notes
- The `EXPLAIN` output example showing `partitions: p_2026` for the `BETWEEN '2026-01-01' AND '2026-12-31'` query is correct, as that range falls entirely within the p_2026 partition (YEAR values from 2026 to 2026, which is less than 2027).
- The note about partitioning columns needing to be part of the primary key or unique index is correct and important — MySQL enforces this constraint.
- All SQL syntax (CREATE TABLE, ALTER TABLE REORGANIZE PARTITION, DROP PARTITION, information_schema query) is correct for MySQL 8.0+.
- The MAXVALUE catch-all best practice is sound advice for production use.
