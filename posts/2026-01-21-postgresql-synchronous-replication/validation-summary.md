# Validation Summary: How to Set Up Synchronous Replication in PostgreSQL

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- PostgreSQL streaming replication
- PostgreSQL synchronous replication
- PostgreSQL configuration parameters
- PostgreSQL monitoring views
- Patroni synchronous replication mode
- Prometheus alert examples
- Python database transaction example

## Sources Consulted
- PostgreSQL Write Ahead Log configuration, including `synchronous_commit` modes: https://www.postgresql.org/docs/current/runtime-config-wal.html
- PostgreSQL Replication configuration, including `synchronous_standby_names` syntax: https://www.postgresql.org/docs/current/runtime-config-replication.html
- PostgreSQL Log-Shipping Standby Servers documentation, including priority and quorum synchronous replication behavior: https://www.postgresql.org/docs/current/warm-standby.html
- PostgreSQL Monitoring Statistics documentation for `pg_stat_replication` columns and `sync_state` values: https://www.postgresql.org/docs/current/monitoring-stats.html
- PostgreSQL `pg_stat_statements` documentation: https://www.postgresql.org/docs/current/pgstatstatements.html
- PostgreSQL libpq connection parameter documentation for connection-string options such as `application_name` and keepalive settings: https://www.postgresql.org/docs/current/libpq-connect.html
- Patroni replication modes documentation for `synchronous_mode`, `synchronous_mode_strict`, and quorum mode: https://patroni.readthedocs.io/en/latest/replication_modes.html

## Issues Found
- The introduction and comparison table described synchronous replication as simply committing on both primary and standby with unconditional zero data loss. Updated the wording to match PostgreSQL's documented behavior: acknowledged commits wait for the configured standby acknowledgment, and the exact guarantee depends on `synchronous_commit` mode and standby availability.
- The `synchronous_commit` comments incorrectly implied that `on` meant `remote_apply`. Updated the comments so `remote_write`, `on`, and `remote_apply` match PostgreSQL's documented WAL write, flush, and replay semantics.
- A heading described "Mixed Priority and Quorum" but the example used only priority-based `FIRST 2` syntax. Renamed the heading to describe the actual configuration.
- The two-datacenter `FIRST 2` example claimed it required acknowledgment from both datacenters. PostgreSQL priority mode cannot enforce that if the higher-priority candidates available at commit time are not split across datacenters, so the comment now says it prefers one from each datacenter when the first standby in each datacenter is available.
- The local-plus-remote synchronous standby example used invalid `synchronous_standby_names` syntax by combining separate `FIRST` and `ANY` groups in one setting. Replaced it with a valid priority-based example that prefers the local standby and uses remote standbys as failover candidates.
- The primary-side replication lag query filtered only `sync_state = 'sync'`, which misses quorum-mode standbys whose state is `quorum`. Updated it to include both `sync` and `quorum`.
- The Python graceful-degradation snippet used `SET LOCAL` without showing transaction-scoped execution through a cursor and passed the parameter value incorrectly. Updated it to execute both statements through a cursor and pass the insert parameter as a one-element tuple.
- The health check query counted only `sync` standbys, so it reported quorum synchronous configurations as unhealthy. Updated the status logic and synchronous standby count to include `quorum`.

## Review Notes
The Prometheus metric names in the alerting examples are exporter-specific rather than PostgreSQL-native; they are plausible examples but should be aligned with the exact PostgreSQL exporter used in production. `pg_stat_statements` requires `shared_preload_libraries` configuration and a server restart before `CREATE EXTENSION` can expose useful data; the post's snippet is directionally correct but abbreviated.
