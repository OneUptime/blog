# Validation Summary: How to Migrate ClickHouse Between Cloud Providers

## Status
validated

## Post Type
Guide

## Technologies Covered
- ClickHouse
- clickhouse-backup (Altinity)
- ClickHouse `remote()` table function
- ReplicatedMergeTree engine
- ClickHouse Keeper / ZooKeeper
- ClickHouse system tables (`system.parts`, `system.replicas`)

## Sources Consulted
- ClickHouse official documentation on the `remote` table function: https://clickhouse.com/docs/en/sql-reference/table-functions/remote
- ClickHouse official documentation on `system.parts`: https://clickhouse.com/docs/en/operations/system-tables/parts
- ClickHouse official documentation on `system.replicas`: https://clickhouse.com/docs/en/operations/system-tables/replicas
- ClickHouse official documentation on ReplicatedMergeTree: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/replication
- Altinity clickhouse-backup GitHub repository: https://github.com/Altinity/clickhouse-backup

## Issues Found
No technical issues found.

## Review Notes
- The `remote()` function example uses port 9000 (native protocol), which is correct. Users should be aware that if their source cluster uses a non-default port or requires TLS, the connection string would need adjustment.
- The clickhouse-backup tool requires configuration (e.g., remote storage credentials for S3/GCS/Azure) before `upload` and `download` will work. The post assumes this is already configured, which is reasonable for a guide at this level.
- The replication-based migration (Option 3) requires both clusters to share a ClickHouse Keeper or ZooKeeper ensemble, which can be non-trivial to set up across cloud providers. The post correctly describes the high-level steps but readers should consult the ReplicatedMergeTree documentation for detailed setup.
