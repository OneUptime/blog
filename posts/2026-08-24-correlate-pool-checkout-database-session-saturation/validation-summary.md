# Validation Summary: Correlate Pool Checkout Latency with Database Session Saturation

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- HikariCP 7.1.0 connection-pool configuration and metrics
- Dropwizard Metrics
- Micrometer metrics
- Prometheus classic histograms and PromQL
- PostgreSQL 18 activity monitoring and connection limits
- MySQL 8.4 server status and connection variables
- SQL Server dynamic management views and waits
- Distributed tracing and database capacity planning

## Sources Consulted

- [HikariCP configuration](https://github.com/brettwooldridge/HikariCP)
- [HikariCP Dropwizard metrics](https://github.com/brettwooldridge/HikariCP/wiki/Dropwizard-Metrics)
- [HikariCP 7.1.0 Dropwizard metrics tracker](https://github.com/brettwooldridge/HikariCP/blob/HikariCP-7.1.0/src/main/java/com/zaxxer/hikari/metrics/dropwizard/CodaHaleMetricsTracker.java)
- [HikariCP 7.1.0 pool checkout and statistics implementation](https://github.com/brettwooldridge/HikariCP/blob/HikariCP-7.1.0/src/main/java/com/zaxxer/hikari/pool/HikariPool.java)
- [HikariCP 7.1.0 physical connection creation implementation](https://github.com/brettwooldridge/HikariCP/blob/HikariCP-7.1.0/src/main/java/com/zaxxer/hikari/pool/PoolBase.java)
- [HikariCP 7.1.0 Micrometer metrics tracker](https://github.com/brettwooldridge/HikariCP/blob/HikariCP-7.1.0/src/main/java/com/zaxxer/hikari/metrics/micrometer/MicrometerMetricsTracker.java)
- [HikariCP 7.1.0 Prometheus summary tracker](https://github.com/brettwooldridge/HikariCP/blob/HikariCP-7.1.0/src/main/java/com/zaxxer/hikari/metrics/prometheus/PrometheusMetricsTracker.java)
- [HikariCP 7.1.0 Prometheus histogram tracker](https://github.com/brettwooldridge/HikariCP/blob/HikariCP-7.1.0/src/main/java/com/zaxxer/hikari/metrics/prometheus/PrometheusHistogramMetricsTracker.java)
- [Micrometer histograms and percentiles](https://docs.micrometer.io/micrometer/reference/concepts/histogram-quantiles.html)
- [Prometheus `histogram_quantile()`](https://prometheus.io/docs/prometheus/latest/querying/functions/#histogram_quantile)
- [Prometheus histograms and summaries](https://prometheus.io/docs/practices/histograms/)
- [PostgreSQL activity monitoring](https://www.postgresql.org/docs/current/monitoring-stats.html)
- [PostgreSQL predefined monitoring roles](https://www.postgresql.org/docs/current/predefined-roles.html)
- [PostgreSQL connection settings](https://www.postgresql.org/docs/current/runtime-config-connection.html)
- [PostgreSQL replication settings](https://www.postgresql.org/docs/current/runtime-config-replication.html)
- [PostgreSQL 12 release notes](https://www.postgresql.org/docs/release/12.0/)
- [MySQL 8.4 server status variables](https://dev.mysql.com/doc/refman/8.4/en/server-status-variables.html)
- [MySQL 8.4 `max_connections`](https://dev.mysql.com/doc/refman/8.4/en/server-system-variables.html#sysvar_max_connections)
- [SQL Server `sys.dm_exec_sessions`](https://learn.microsoft.com/en-us/sql/relational-databases/system-dynamic-management-objects/sys-dm-exec-sessions-transact-sql?view=sql-server-ver17)
- [SQL Server `sys.dm_exec_requests`](https://learn.microsoft.com/en-us/sql/relational-databases/system-dynamic-management-objects/sys-dm-exec-requests-transact-sql?view=sql-server-ver17)
- [SQL Server `sys.dm_os_waiting_tasks`](https://learn.microsoft.com/en-us/sql/relational-databases/system-dynamic-management-objects/sys-dm-os-waiting-tasks-transact-sql?view=sql-server-ver17)
- [SQL Server `max worker threads`](https://learn.microsoft.com/en-us/sql/database-engine/configure-windows/configure-the-max-worker-threads-server-configuration-option?view=sql-server-ver17)

## Issues Found

- The HikariCP timeout explanation omitted the explicitly suspendable-pool exception: a suspended pool waits until it is resumed rather than applying `connectionTimeout`. Qualified the statement to the default `allowPoolSuspension=false` configuration.
- The metrics-normalization text implied that any exported distribution could be normalized into Prometheus histogram buckets. Clarified that an aggregatable histogram must be selected or configured before export because client-side summary quantiles cannot be converted into buckets afterward.
- The example histogram labels and PromQL grouping did not retain `cluster` and `role`, even though the post correctly identifies them as separate capacity domains. Added those bounded labels, retained them during aggregation, and required consistent classic-histogram bucket boundaries across instances.
- The normalized HikariCP connection-creation count was named as a total of successfully created physical connections. HikariCP records its connection-creation distribution in a `finally` block for successful and failed creation or setup attempts, so renamed the metric to `db_pool_physical_connection_attempts_total`.
- The PostgreSQL `waiting_sessions` filter counted every client backend with a non-null `wait_event`. That includes idle clients commonly waiting on `ClientRead`, so it did not measure waiting work. Added `state = 'active'` and renamed the result to `active_waiting_sessions`.
- The PostgreSQL collector example omitted its visibility requirement. Added the need for superuser, `pg_read_all_stats`, or an encompassing role such as `pg_monitor`; otherwise state and wait fields for other users' sessions can be null and the query can under-report.
- The PostgreSQL capacity guidance treated replication as part of the `max_connections` budget. Since PostgreSQL 12, WAL senders are governed separately by `max_wal_senders`, so the guidance now reserves `max_connections` for client services and accounts for WAL senders separately.

## Review Notes

- The HikariCP Dropwizard wiki calls the pool gauges `CachedGauge` values. Current HikariCP registers gauges backed by `PoolStats`, which still has a one-second polling resolution, so the post's caching description remains accurate.
- The HikariCP checkout timer includes both successful acquisitions and acquisitions that end in timeout, and the separate timeout counter is current and non-deprecated.
- The PromQL expression is valid for classic histograms: it applies `rate()` before aggregation and preserves the required `le` label. Native histograms use the base metric and do not group by `le`.
- The PostgreSQL query is valid on PostgreSQL 10 and later, where `pg_stat_activity.backend_type` is available. The current documentation resolved to PostgreSQL 18 during review.
- MySQL's `Threads_connected` means currently open connections, while `Threads_running` means threads that are not sleeping. The cumulative `Connections` counter includes successful and unsuccessful attempts, and MySQL also keeps a privileged administrative connection beyond the ordinary limit.
- SQL Server 2022 and later generally require `VIEW SERVER PERFORMANCE STATE` to see the relevant server-wide DMV data; SQL Server 2019 and earlier use `VIEW SERVER STATE`, with different rules for Azure SQL. The post does not prescribe permissions, so no change was required.
- All documentation links in the post resolved to the intended official resources. The SQL Server link redirects from the older `system-dynamic-management-views` path to the current canonical `system-dynamic-management-objects` path.
