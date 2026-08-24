# How to Correlate Application Pool Checkout Latency with Database Session Saturation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Connection Pools, Database Monitoring, HikariCP, Prometheus, Capacity Planning

Description: Correlate pool acquisition delay with active borrowers, database sessions, waits, and connection churn to distinguish database saturation from application-held connections.

---

An application request can wait for a database connection before it sends any SQL. Database query latency will not include that queue, while a database session dashboard may show many idle sessions and still miss a saturated application pool.

Diagnose the boundary by aligning the pool's acquisition and usage telemetry with database sessions and active work over the same labels and time window.

## Measure the pool queue directly

HikariCP's official Dropwizard metrics distinguish:

- `Wait`: a timer for how long `getConnection()` callers wait, including attempts that time out;
- `Usage`: a histogram of how long a connection remains checked out;
- `TotalConnections`, `IdleConnections`, and `ActiveConnections` gauges;
- `PendingConnections`: threads currently awaiting a connection.

HikariCP's `maximumPoolSize` includes both idle and in-use connections. When the pool has reached that size and has no idle connection, `getConnection()` blocks for at most `connectionTimeout` before throwing.

Micrometer, Dropwizard-to-Prometheus bridges, and framework versions expose different metric names and sometimes different histogram types. Normalize them into an internal schema such as:

```text
db_pool_checkout_seconds_bucket{service,instance,pool,database}
db_pool_checkout_timeouts_total{service,instance,pool,database}
db_pool_connections_active{service,instance,pool,database}
db_pool_connections_idle{service,instance,pool,database}
db_pool_connections_max{service,instance,pool,database}
db_pool_connections_pending{service,instance,pool,database}
db_pool_usage_seconds_bucket{service,instance,pool,database}
db_pool_physical_connections_created_total{...}
```

For a classic Prometheus histogram, calculate a fleet-aggregated percentile from bucket rates:

```promql
histogram_quantile(
  0.95,
  sum by (le, service, pool, database) (
    rate(db_pool_checkout_seconds_bucket[5m])
  )
)
```

Do not average per-instance precomputed p95 values. Histograms can be aggregated through buckets; client-side summary quantiles generally cannot.

## Measure sessions and work at the database

For PostgreSQL, one collector query can separate client sessions from active and waiting work:

```sql
WITH limits AS (
  SELECT setting::integer AS max_connections
  FROM pg_settings
  WHERE name = 'max_connections'
)
SELECT count(*) FILTER (
         WHERE backend_type = 'client backend'
       ) AS client_sessions,
       count(*) FILTER (
         WHERE backend_type = 'client backend'
           AND state = 'active'
       ) AS active_sessions,
       count(*) FILTER (
         WHERE backend_type = 'client backend'
           AND wait_event IS NOT NULL
       ) AS waiting_sessions,
       max(limits.max_connections) AS max_connections
FROM pg_stat_activity
CROSS JOIN limits;
```

`state = 'active'` means the backend is executing a query, but it can still be waiting; `wait_event` distinguishes that condition. Keep idle and `idle in transaction` sessions separate. Reserve capacity for superuser or reserved roles, replication, maintenance, failover, and other services rather than treating `max_connections` as the application budget.

For MySQL, use global `Threads_connected`, `Threads_running`, connection rates, and `max_connections`; for SQL Server use current user sessions and requests with the applicable worker and resource waits. Preserve the same semantic split: open sessions are not the same as actively executing work.

## Align identities and clocks

Correlate only pools and database endpoints that actually belong together. Carry bounded labels for service, deployment, pool, database, cluster, and role. A read/write pool and a read-only-replica pool are separate capacity domains.

Sum across every application instance before comparing with server totals. Ten pods with a 20-connection maximum can demand 200 sessions. The database includes administrators, jobs, proxies, and other services, so the two sides should not be expected to equal exactly.

Use synchronized clocks, consistent scrape intervals, and a common five- or ten-minute window. Pool gauges are snapshots—HikariCP's Dropwizard gauges are cached at one-second resolution—and active, idle, and total can change while being read. Small arithmetic mismatches are normal; sustained patterns matter.

## Interpret the combined patterns

| Pool evidence | Database evidence | Investigate first |
|---|---|---|
| Checkout p95 and pending rise; active reaches max | Active DB sessions and waits rise | Database CPU, locks, I/O, slow queries, or true concurrency |
| Checkout p95 and pending rise; active reaches max | DB active work remains low | Connections held during application work, long transactions, streaming, or a leak |
| Checkout latency rises; total pool connections below max | Connection creation/errors rise | Authentication, network, TLS, failover, or validation |
| DB sessions near limit | This pool is not saturated | Other services, jobs, idle sessions, or proxy topology |
| Usage duration rises with query latency | DB waits or resource time rises | Work is holding each connection longer because the database is slow |

Pool checkout latency is a queueing symptom, not proof that the database needs more sessions. Increasing `maximumPoolSize` can move the queue into the database, increase contention, and worsen tail latency. Size changes should be load-tested against database throughput, not made solely to eliminate pending borrowers.

## Add causality evidence

During an incident, capture:

- checkout p50/p95/p99, timeout rate, pending threads, and active/max ratio;
- checked-out usage duration and leak-detection evidence;
- database session state, wait class, transaction age, and top normalized query latency;
- connection open/close rate and driver errors;
- request concurrency, cancellations, retries, and deploy events.

Trace spans should cover the pool-acquisition phase separately from database execution. A trace that begins only after checkout hides the exact latency this analysis is meant to explain.

Use lagged plots cautiously: a database slowdown can lengthen connection usage and then cause the pool queue; a pool burst can raise database concurrency and then create database waits. Time ordering strengthens an explanation but does not establish causation without request or trace evidence.

## Alert on user impact plus pressure

A strong alert requires sustained checkout latency or timeouts plus a pressure signal such as pending borrowers and active/max near 1. Route the alert with the database-side classification so responders know whether active sessions and waits are also high.

Set a minimum checkout rate for percentiles, because a p95 based on a handful of requests is unstable. Keep metric dimensions bounded: pool names should be explicitly configured and stable, not generated per request or tenant.

## Official Documentation

- [HikariCP configuration](https://github.com/brettwooldridge/HikariCP)
- [HikariCP Dropwizard metrics](https://github.com/brettwooldridge/HikariCP/wiki/Dropwizard-Metrics)
- [Prometheus histograms and summaries](https://prometheus.io/docs/practices/histograms/)
- [PostgreSQL activity and cumulative statistics](https://www.postgresql.org/docs/current/monitoring-stats.html)
- [MySQL server status variables](https://dev.mysql.com/doc/refman/8.4/en/server-status-variables.html)
- [SQL Server `sys.dm_exec_sessions`](https://learn.microsoft.com/en-us/sql/relational-databases/system-dynamic-management-views/sys-dm-exec-sessions-transact-sql?view=sql-server-ver17)

## Conclusion

Measure pool acquisition and usage separately, aggregate application instances, and compare them with active—not merely open—database sessions and waits. The combined pattern reveals whether callers are queued behind slow database work, application-held connections, or physical connection creation, preventing a reflexive pool-size increase from moving the bottleneck downstream.
