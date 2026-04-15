# Validation Summary: How to Use system.storage_policies in ClickHouse

## Status
validated

## Post Type
Reference / Tutorial

## Technologies Covered
- ClickHouse (system tables, storage configuration, MergeTree engine)
- ClickHouse `system.storage_policies` system table
- ClickHouse `system.disks` system table
- ClickHouse tiered storage (hot/warm/cold volumes)
- ClickHouse TTL-based data movement
- S3-backed ClickHouse disks

## Sources Consulted
- ClickHouse official documentation on system.storage_policies: https://clickhouse.com/docs/en/operations/system-tables/storage_policies
- ClickHouse official documentation on storage configuration: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#table_engine-mergetree-multiple-volumes
- ClickHouse official documentation on system.disks: https://clickhouse.com/docs/en/operations/system-tables/disks
- ClickHouse official documentation on TTL for data movement: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#table_engine-mergetree-ttl
- ClickHouse official documentation on array functions (arrayStringConcat, has): https://clickhouse.com/docs/en/sql-reference/functions/array-functions

## Issues Found
- **Mermaid diagram disk name inconsistency**: The mermaid diagram labeled the cold volume's disk as `s3_cold`, but the XML configuration example below it defines the disk as `s3_archive` and references it as `<disk>s3_archive</disk>` in the cold volume. Changed `s3_cold` to `s3_archive` in the diagram to match the configuration.

## Review Notes
- All SQL queries use correct ClickHouse syntax: `arrayStringConcat`, `extractAll`, `has()`, `formatReadableSize`, and joins between system tables are all valid.
- The XML storage configuration structure is correct with proper nesting of `<storage_configuration>` > `<disks>` / `<policies>` > `<volumes>`.
- Column names and types in the Key Columns table accurately reflect the `system.storage_policies` schema.
- The `move_factor` explanation is correct: it represents the free space ratio threshold that triggers data movement to the next volume (default 0.1).
- TTL-based volume movement syntax (`TO VOLUME 'name'`) is correct.
- The `ALTER TABLE ... MODIFY SETTING storage_policy` syntax is valid for changing a table's storage policy.
- The note about the built-in `default` policy is accurate.
