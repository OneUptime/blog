# Validation Summary: How to Implement Cross-Region Replication

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- PostgreSQL streaming replication
- CloudNativePG replica clusters
- MySQL GTID replication
- MySQL semisynchronous replication
- MySQL Group Replication
- Prometheus alerting and PostgreSQL exporter custom metrics
- Patroni failover and switchover APIs
- CRDTs and application-level conflict resolution

## Sources Consulted
- PostgreSQL documentation: Replication settings, including `max_wal_senders`, `wal_keep_size`, and streaming replication behavior: https://www.postgresql.org/docs/current/runtime-config-replication.html
- MySQL documentation: `CHANGE REPLICATION SOURCE TO` statement: https://dev.mysql.com/doc/refman/9.5/en/change-replication-source-to.html
- MySQL documentation: Semisynchronous replication installation and source/replica plugin names: https://dev.mysql.com/doc/refman/8.0/en/replication-semisync-installation.html
- MySQL documentation: Semisynchronous replication configuration variables: https://dev.mysql.com/doc/refman/8.0/en/replication-semisync-interface.html
- MySQL documentation: Group Replication single-primary and multi-primary modes: https://dev.mysql.com/doc/refman/8.4/en/group-replication-deploying-in-multi-primary-or-single-primary-mode.html
- CloudNativePG documentation: Replica clusters and required `bootstrap.pg_basebackup` plus `spec.replica` configuration: https://cloudnative-pg.io/documentation/1.20/replica_cluster/
- Prometheus documentation: Alerting rule file format: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- prometheus-community postgres_exporter documentation and examples for custom query YAML: https://github.com/prometheus-community/postgres_exporter
- Patroni documentation: REST API switchover and failover endpoints: https://patroni.readthedocs.io/en/latest/rest_api.html

## Issues Found
- The PostgreSQL configuration comment said `wal_level = replica` enabled WAL archiving. Changed it to say it enables WAL for streaming replication, because WAL archiving requires separate archive settings.
- The CloudNativePG replica example enabled replica mode but did not include the required bootstrap source for a streaming base backup. Added `bootstrap.pg_basebackup.source: postgres-primary`.
- The MySQL semisynchronous replication example used deprecated `master`/`slave` plugin names and variables while the rest of the section used current source/replica terminology. Updated the snippets to `rpl_semi_sync_source`, `rpl_semi_sync_replica`, and their current variables.
- The postgres_exporter custom query key would have produced a metric name that did not match the alert expressions. Renamed the query namespace so the `lag_bytes` column exports as `pg_replication_lag_bytes`.
- The `ReplicationStopped` alert referenced `pg_replication_is_replica`, which the example custom query did not export, and could fire during idle periods. Changed it to alert only when nonzero lag remains unchanged.
- The application lag check treated an idle, fully caught-up PostgreSQL replica as increasingly lagged because `pg_last_xact_replay_timestamp()` does not advance when no transactions replay. Updated it to return `0` when receive and replay LSNs match.

## Review Notes
- The examples are intentionally illustrative and still require environment-specific security hardening, credentials management, DNS/load balancer updates, and operational testing before production use.
- The MySQL replication user example keeps `GRANT REPLICATION SLAVE`, which remains the documented privilege name for replication accounts despite newer source/replica command terminology.
