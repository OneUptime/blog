# Validation Summary: How to Monitor PostgreSQL Replication Lag

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- PostgreSQL streaming replication
- PostgreSQL system views and recovery functions
- SQL
- Bash and psql
- Prometheus postgres_exporter
- Prometheus alert rules
- Grafana SQL queries
- PostgreSQL replication configuration

## Sources Consulted
- PostgreSQL current documentation: pg_stat_replication view and lag column behavior - https://www.postgresql.org/docs/current/monitoring-stats.html#MONITORING-PG-STAT-REPLICATION-VIEW
- PostgreSQL current documentation: WAL and recovery information functions, including pg_wal_lsn_diff, pg_last_wal_receive_lsn, pg_last_wal_replay_lsn, and pg_last_xact_replay_timestamp - https://www.postgresql.org/docs/current/functions-admin.html
- PostgreSQL current documentation: replication configuration parameters, including max_standby_streaming_delay, hot_standby_feedback, and recovery_min_apply_delay - https://www.postgresql.org/docs/current/runtime-config-replication.html
- prometheus-community/postgres_exporter README and collector source for replication metrics - https://github.com/prometheus-community/postgres_exporter
- Prometheus current documentation: jobs, instances, and the built-in up scrape health metric - https://prometheus.io/docs/concepts/jobs_instances/

## Issues Found
- The comprehensive monitoring query ordered by the formatted `replay_lag` output alias, which could sort lexicographically instead of by actual byte lag. Changed the `ORDER BY` clause to use `pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn)` directly.
- The Prometheus "replication down" alert used `pg_replication_lag_seconds == -1`, but the current postgres_exporter replication collector does not use `-1` as the down signal. Changed the alert to use Prometheus' built-in `up == 0` scrape-health metric.
- The Prometheus metric list omitted `pg_replication_is_replica`, which the post referenced in the alert examples. Added it to the listed metrics.
- The Bash monitoring script could produce an empty or NULL lag value on non-replicas, caught-up replicas, or replicas without replayed transactions, causing integer comparisons to fail. Updated the query to always return a numeric value and to handle caught-up and NULL timestamp cases.

## Review Notes
- PostgreSQL's `write_lag`, `flush_lag`, and `replay_lag` columns are interval measurements for recent WAL acknowledgement/replay behavior. On an idle fully caught-up standby, PostgreSQL may display the last measured values briefly and then NULL, so monitoring systems should decide how to represent missing data.
- `pg_last_xact_replay_timestamp()` is only a useful time-lag proxy when there is recent write activity on the primary. The post notes this caveat in the replica lag query.
- `hot_standby_feedback = on` can reduce query cancellations on replicas, but it can also contribute to bloat on the primary; this is worth expanding in a future tuning-focused article.
