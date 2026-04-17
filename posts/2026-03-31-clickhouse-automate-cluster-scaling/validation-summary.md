# Validation Summary: How to Automate ClickHouse Cluster Scaling

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- ClickHouse (cluster topology, Distributed engine, ALTER PARTITION)
- Ansible (config templating)
- Bash / shell scripting
- XML configuration (`remote_servers`)
- SQL (DDL for distributed tables, virtual column queries)

## Sources Consulted
- ClickHouse ALTER PARTITION reference: https://clickhouse.com/docs/en/sql-reference/statements/alter/partition
- ClickHouse Distributed engine reference (virtual columns including `_shard_num`): https://clickhouse.com/docs/en/engines/table-engines/special/distributed
- ClickHouse `remote_servers` configuration documentation
- ClickHouse FETCH PARTITION documentation

## Issues Found
- **Incorrect `ATTACH PARTITION ... FROM '<path>'` syntax.** The original script used `ALTER TABLE events_local ATTACH PARTITION '${PARTITION}' FROM '/mnt/data/transfer/${PARTITION}'`. The `FROM` clause of `ATTACH PARTITION` accepts only a source **table name**, not a filesystem path. The correct workflow is to place the partition's part directories under the target table's `detached/` directory and then run `ALTER TABLE ... ATTACH PARTITION '<id>'` (without `FROM`). I rewrote the snippet accordingly and added a note that replicated tables can use `FETCH PARTITION ... FROM '<zk_path>'` to pull data from another replica before attaching.

## Review Notes
- `clickhouse-copier` is deprecated in recent ClickHouse versions (removed/marked obsolete since 22.x onward). I replaced it in the migration suggestion with `remote()`/`remoteSecure()` + `INSERT ... SELECT`, which is the currently recommended approach. `SELECT ... INTO OUTFILE` is retained as an option for offline export.
- The `<remote_servers>` XML snippet is shown as a fragment; in a real `config.xml` it would be wrapped in the top-level `<clickhouse>` (or legacy `<yandex>`) element. This is a common documentation convention and not a technical error.
- Live config reload of `remote_servers` without a restart is correct — ClickHouse polls config files and applies cluster topology changes dynamically.
- `_shard_num` is a valid virtual column on `Distributed` tables and is the right column for per-shard row-count queries.
- The `Distributed(cluster, db, table, sharding_key)` engine signature and use of `rand()` as a sharding expression are correct.
