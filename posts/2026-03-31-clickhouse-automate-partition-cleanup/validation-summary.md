# Validation Summary: How to Automate ClickHouse Partition Cleanup

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- ClickHouse (MergeTree engine, TTL rules, partitioning, ALTER TABLE, system.parts)
- Python (clickhouse-connect client, python-dateutil)
- Cron (system crontab in /etc/cron.d)
- ClickHouse tiered storage (TO DISK)

## Sources Consulted
- ClickHouse ALTER TTL docs: https://clickhouse.com/docs/en/sql-reference/statements/alter/ttl
- ClickHouse MergeTree TTL docs: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#table_engine-mergetree-ttl
- ClickHouse ALTER PARTITION docs: https://clickhouse.com/docs/en/sql-reference/statements/alter/partition
- ClickHouse system.parts docs: https://clickhouse.com/docs/en/operations/system-tables/parts
- clickhouse-connect Python client docs: https://clickhouse.com/docs/en/integrations/python
- ClickHouse functions reference (formatReadableSize, toYYYYMM, toUInt32)

## Issues Found
- **`DROP PARTITION` syntax**: The Python cleanup script used `ALTER TABLE ... DROP PARTITION '{partition}'` (quoted string without the `ID` keyword). Per ClickHouse docs, the documented forms are either `DROP PARTITION <expr>` (e.g., `DROP PARTITION 202401` with no quotes for numeric partitions) or `DROP PARTITION ID '<partition_id>'` (with the `ID` keyword and single quotes). Since the script reads partition values as strings from `system.parts.partition` and interpolates them quoted, the correct unambiguous form is `DROP PARTITION ID '<partition>'`. Fixed both occurrences in the script and the dry-run example.

## Review Notes
- TTL syntax (`CREATE TABLE ... TTL ...`, `ALTER TABLE ... MODIFY TTL ...`, `ALTER TABLE ... MATERIALIZE TTL`) is correct and current.
- Tiered-storage TTL with comma-separated `TO DISK` and `DELETE` clauses is valid per the MergeTree TTL grammar.
- `system.parts` columns referenced (partition, database, table, active, bytes_on_disk) all exist.
- `clickhouse_connect.get_client()`, `client.query().result_rows`, and `client.command()` usage matches the official client API.
- The `toUInt32(partition)` cast in the monitoring SQL works specifically because the partition key is `toYYYYMM(...)` which produces numeric string values; this pattern would not generalize to non-numeric partition keys, but the post's context is consistent.
- The cron line uses the system crontab format (with a user field) appropriate for `/etc/cron.d/`. The Python script is invoked directly, which assumes a shebang line — a minor usability detail, not a technical error.
