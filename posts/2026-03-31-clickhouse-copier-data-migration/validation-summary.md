# Validation Summary: How to Use clickhouse-copier for Data Migration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- clickhouse-copier utility
- ZooKeeper / ClickHouse Keeper
- ReplicatedMergeTree engine
- XML-based task configuration

## Sources Consulted
- [ClickHouse/copier GitHub repository (current home of the tool)](https://github.com/ClickHouse/copier)
- [ClickHouse/copier README (command-line options and task file format)](https://github.com/ClickHouse/copier/blob/main/README.md)
- ClickHouse official docs archive for clickhouse-copier
- ClickHouse v24.2 changelog referencing the removal of clickhouse-copier from the main bundle

## Issues Found
1. **Incorrect `--zookeeper-config` flag.** The post's first example used `--zookeeper-config /etc/clickhouse-server/config.xml` together with `--config copier.xml`. The `clickhouse-copier` binary does not accept a `--zookeeper-config` option; the ZooKeeper/Keeper connection settings belong inside the file passed to `--config` (typically `keeper.xml`). Fixed by removing the bogus flag and clarifying that `--config` points to a keeper/zookeeper configuration file.
2. **Outdated installation claim.** The post stated that clickhouse-copier "ships with the ClickHouse server package." This is no longer accurate — the tool has been moved to the separate `ClickHouse/copier` GitHub repository and is no longer bundled with recent ClickHouse server packages. Updated the introduction and installation section to reflect this.
3. **Second run command used server config instead of keeper config.** The "Running the Copy" example passed `--config /etc/clickhouse-server/config.xml`. Although passing the server config can work if it contains `<zookeeper>`, the tool's documented usage is to point `--config` at a dedicated keeper.xml. Normalized the example to use `keeper.xml` for consistency with the official README.
4. **Summary overstated current status.** "clickhouse-copier is the standard tool" is no longer true since the utility has been marked obsolete. Reworded to note the historical role, keep the fault-tolerance point, and point readers to currently recommended alternatives (`INSERT ... SELECT` via `remote()` / `remoteSecure()`, `clickhouse-client` piping).

## Review Notes
- The `task.xml` example structure (remote_servers, per-table cluster_pull / database_pull / cluster_push / database_push / engine / sharding_key) matches the documented task description format.
- The `--daemon`, `--config`, `--task-path`, `--task-file`, and `--base-dir` flags used in the "Running the Copy" section are all valid per the current ClickHouse/copier README.
- The claim of idempotency and ZooKeeper-tracked progress is correct.
- Monitoring via `SELECT * FROM system.zookeeper WHERE path = ...` is correct; `system.zookeeper` requires a `path =` predicate, which this example provides.
- Future improvement: because the tool is obsolete, readers should be strongly encouraged to evaluate modern alternatives first; the updated summary hints at this but a dedicated section could be added in a future revision.
