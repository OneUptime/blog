# Validation Summary: How to Rollback a Failed ClickHouse Upgrade

## Status
validated

## Post Type
Tutorial / Operations Guide

## Technologies Covered
- ClickHouse (server, client, replication via Keeper/ZooKeeper)
- clickhouse-backup (Altinity tool)
- Debian/Ubuntu package management (apt-get, apt-mark, dpkg)
- RHEL/CentOS package management (yum, yum versionlock)
- systemd (systemctl, journalctl)
- SQL queries against ClickHouse system tables

## Sources Consulted
- ClickHouse `system.replicas` documentation: https://clickhouse.com/docs/en/operations/system-tables/replicas
- ClickHouse `system.tables` documentation: https://clickhouse.com/docs/en/operations/system-tables/tables
- ClickHouse SYSTEM statements: https://clickhouse.com/docs/sql-reference/statements/system
- ClickHouse Debian/Ubuntu install docs: https://clickhouse.com/docs/install/debian_ubuntu
- ClickHouse GitHub source (StorageSystemReplicas.cpp): https://github.com/ClickHouse/ClickHouse
- clickhouse-backup project: https://github.com/Altinity/clickhouse-backup
- apt-mark / yum versionlock man pages

## Issues Found
1. **Incorrect `system.replicas` column name** in the "Verifying Cluster Health After Rollback" section. The post selected and filtered on `last_exception`, which does not exist in `system.replicas`. The correct columns are `last_queue_update_exception` and `zookeeper_exception`. Fixed the query to select both columns and filter on either being non-empty.

## Review Notes
- The `is_leader` column in `system.replicas` still exists but has limited meaning in modern ClickHouse versions (multi-leader replication is the default) — the existing usage in the post remains syntactically valid.
- `yum versionlock` requires the `yum-plugin-versionlock` (or `dnf-plugin-versionlock` on newer distros) package to be installed; readers should install it if not present.
- The `clickhouse-backup` tool is a third-party Altinity project; readers should ensure it is installed and configured before running the preparation steps.
- Rolling back across major ClickHouse versions can sometimes fail due to on-disk format changes (e.g., MergeTree metadata written by a newer version that an older binary cannot read). This caveat could be worth adding in a future revision but was not technically incorrect in the current post.
