# Validation Summary: How to Move Data Between Tables Using TTL in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (MergeTree engine, TTL, partition operations)
- SQL (CREATE TABLE, ALTER TABLE, INSERT SELECT, materialized views)
- Bash scripting (scheduled partition moves via clickhouse-client)
- merge() table function for cross-table verification queries

## Sources Consulted
- ClickHouse ALTER TABLE partition operations documentation: https://clickhouse.com/docs/en/sql-reference/statements/alter/partition
- ClickHouse MergeTree engine documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse CREATE VIEW / materialized views documentation: https://clickhouse.com/docs/en/sql-reference/statements/create/view
- ClickHouse merge() table function documentation: https://clickhouse.com/docs/en/sql-reference/table-functions/merge

## Issues Found
- **Intro pattern count mismatch**: The introduction stated "There are two practical patterns" but the post describes three distinct patterns (Scheduled Partition Move, INSERT SELECT + DROP PARTITION, and Materialized View to Archive Table). Fixed to say "three practical patterns" and list all three.

## Review Notes
- The claim that `MOVE PARTITION TO TABLE` is "zero-copy on the same disk" is well-known ClickHouse behavior (it uses filesystem hard links), but this specific wording is not explicitly stated in the official partition operations documentation. The docs confirm the operation is atomic. The claim is practically accurate but could benefit from a source citation.
- The shell script uses `date -d "2 months ago"` which is GNU coreutils syntax and works on Linux. It will not work on macOS, which uses BSD date (equivalent would be `date -v-2m +%Y%m`). This is a minor portability note, not an error, since ClickHouse servers typically run on Linux.
- The materialized view pattern (Pattern 3) correctly notes that MVs only fire on new inserts. The `WHERE event_time < now() - INTERVAL 90 DAY` filter means it only routes rows that are already older than 90 days at insert time — useful for late-arriving or backfilled data, not for aging out data that was fresh when inserted.
- All SQL syntax verified as correct against ClickHouse documentation: CREATE TABLE with PARTITION BY and ORDER BY, SETTINGS storage_policy, MOVE PARTITION TO TABLE, DROP PARTITION, CREATE MATERIALIZED VIEW ... TO ... AS SELECT, and the merge() table function.
