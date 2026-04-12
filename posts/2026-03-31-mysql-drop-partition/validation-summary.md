# Validation Summary: How to Drop a Partition in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (partitioning, ALTER TABLE, INFORMATION_SCHEMA)
- InnoDB storage engine
- MySQL Event Scheduler
- SQL prepared statements (PREPARE/EXECUTE)

## Sources Consulted
- MySQL 8.0 Reference Manual: ALTER TABLE Partition Operations — https://dev.mysql.com/doc/refman/8.0/en/alter-table-partition-operations.html
- MySQL 8.0 Reference Manual: Partitioning Types — https://dev.mysql.com/doc/refman/8.0/en/partitioning-types.html
- MySQL 8.0 Reference Manual: Partitioning Limitations Relating to Keys — https://dev.mysql.com/doc/refman/8.0/en/partitioning-limitations-partitioning-keys-unique-keys.html
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA PARTITIONS Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-partitions-table.html
- MySQL 8.0 Reference Manual: CREATE EVENT Statement — https://dev.mysql.com/doc/refman/8.0/en/create-event.html
- MySQL 8.0 Reference Manual: TRUNCATE PARTITION — https://dev.mysql.com/doc/refman/8.0/en/alter-table-partition-operations.html

## Issues Found
- **Hardcoded partition name in CREATE EVENT automation example**: The original event used `ALTER TABLE page_views DROP PARTITION p2021;` with a hardcoded partition name inside a recurring yearly event. This would only work once (the first year) and fail on subsequent executions because partition `p2021` would no longer exist. The comment claimed "Drop data older than 3 years" but the code did not implement dynamic partition selection. Fixed by replacing with dynamic SQL using `PREPARE`/`EXECUTE` that computes the partition name based on `YEAR(CURDATE()) - 3`, and added a `STARTS` clause to the event schedule.

## Review Notes
- The automation example assumes a naming convention of `pYYYY` for partitions. If the partition naming differs, the dynamic SQL approach would need adjustment. This is a reasonable convention for the tutorial context.
- The event will produce an error if the computed partition does not exist (e.g., if it was already dropped or was never created). In production, wrapping this in error handling or checking INFORMATION_SCHEMA.PARTITIONS first would be more robust, but that's beyond the scope of this introductory tutorial.
- The "100x faster" claim for DROP PARTITION vs DELETE is a rough order-of-magnitude estimate, not a precise benchmark. It's reasonable for very large partitions but actual performance depends on table size, hardware, and configuration.
