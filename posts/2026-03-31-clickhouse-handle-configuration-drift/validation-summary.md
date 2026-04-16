# Validation Summary: How to Handle ClickHouse Configuration Drift

## Status
validated

## Post Type
Tutorial / Operations guide

## Technologies Covered
- ClickHouse (system tables: `system.settings`, `system.server_settings`)
- ClickHouse table functions (`clusterAllReplicas`, `remote`)
- Ansible (templates, tasks, playbooks)
- Bash / SSH / md5sum
- GitOps / CI (GitHub Actions)

## Sources Consulted
- ClickHouse docs — `system.settings` table: https://clickhouse.com/docs/en/operations/system-tables/settings
- ClickHouse docs — `system.server_settings` table: https://clickhouse.com/docs/en/operations/system-tables/server_settings
- ClickHouse docs — `clusterAllReplicas` table function: https://clickhouse.com/docs/en/sql-reference/table-functions/cluster
- ClickHouse docs — `remote` table function: https://clickhouse.com/docs/en/sql-reference/table-functions/remote
- ClickHouse docs — `hostName()` function: https://clickhouse.com/docs/en/sql-reference/functions/other-functions#hostname
- Ansible `ansible.builtin.template` module docs

## Issues Found
1. **Wrong system table for server settings.** The first SQL query queried `system.settings` for `background_pool_size` and `max_server_memory_usage_to_ram_ratio`. These are server-level settings defined in `config.xml` and are exposed via `system.server_settings`, not `system.settings`. Split the query into two: `system.settings` for query/session settings (`max_memory_usage`, `max_threads`) and `system.server_settings` for the server-level ones.
2. **Missing `hostName()` in `clusterAllReplicas` queries.** Both cluster queries selected a `host` column, but `clusterAllReplicas(...)` does not automatically inject a host column — it returns only the underlying table's columns. Replaced `host` with `hostName() AS host` in the `SELECT` lists of both cluster-level queries (detection and automated drift check).
3. **Function-name mismatch in prose.** The text said "use the `remote()` function" but the code example uses `clusterAllReplicas()`. They are distinct functions (`remote()` targets arbitrary hosts on-the-fly; `clusterAllReplicas()` uses a pre-configured cluster). Updated the prose to reference `clusterAllReplicas()` to match the code.

## Review Notes
- The Ansible task, md5sum loop, and GitOps flow are standard and correct.
- `system.server_settings` has existed since ClickHouse 22.10 — safe to assume availability on any reasonably current cluster.
- The automated drift-check subquery compares against the coordinator's local value; that's fine as a "find rows that differ from my reference" pattern, but readers running it should be aware the reference node is implicit (the initiator of the query).
