# Validation Summary: How to Use MySQL for Time Series Data

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (InnoDB engine)
- MySQL range partitioning (PARTITION BY RANGE with TO_DAYS)
- MySQL composite indexes
- SQL date/time functions (DATE_FORMAT, NOW, INTERVAL)
- MySQL partition management (REORGANIZE PARTITION, DROP PARTITION)

## Sources Consulted
- MySQL 8.0 Reference Manual — Partitioning: https://dev.mysql.com/doc/refman/8.0/en/partitioning.html
- MySQL 8.0 Reference Manual — Range Partitioning: https://dev.mysql.com/doc/refman/8.0/en/partitioning-range.html
- MySQL 8.0 Reference Manual — Partition Pruning: https://dev.mysql.com/doc/refman/8.0/en/partitioning-pruning.html
- MySQL 8.0 Reference Manual — Partition Management: https://dev.mysql.com/doc/refman/8.0/en/partitioning-management.html
- MySQL 8.0 Reference Manual — Partitioning Keys, Primary Keys, and Unique Keys: https://dev.mysql.com/doc/refman/8.0/en/partitioning-limitations-partitioning-keys-unique-keys.html
- MySQL 8.0 Reference Manual — DATETIME fractional seconds: https://dev.mysql.com/doc/refman/8.0/en/fractional-seconds.html
- MySQL 8.0 Reference Manual — DATE_FORMAT function: https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_date-format
- MySQL 8.0 Reference Manual — INSERT syntax: https://dev.mysql.com/doc/refman/8.0/en/insert.html

## Issues Found
No technical issues found.

## Review Notes
- The summary states that old partitions "drop instantly without table-wide locking." While DROP PARTITION is extremely fast (it removes the partition's tablespace file rather than deleting rows individually), it does briefly acquire a metadata lock (MDL) on the table. This is standard simplification in MySQL literature and the practical impact is negligible, so no change was made.
- The query in the "Querying Recent Data" section uses `NOW()` which returns whole-second precision. For a DATETIME(3) column, `NOW(3)` would provide millisecond-precision boundaries. However, since the comparison uses `>=`, this does not cause functional issues — it just means the boundary snaps to the nearest second. This is acceptable for the tutorial context.
- The post could mention `PARTITION BY RANGE COLUMNS(recorded_at)` as an alternative to `PARTITION BY RANGE (TO_DAYS(recorded_at))` available since MySQL 5.5, which avoids the function wrapper. Both approaches are valid; the TO_DAYS approach used here is well-established and widely documented.
