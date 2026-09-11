# Find Health Checks and Pools Preventing Azure SQL Auto-Pause

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure SQL, Serverless, Connection Pooling, Monitoring, Cost Optimization

Description: Find the sessions, health checks, connection pools, and feature settings that keep Azure SQL serverless online after application traffic stops.

---

An empty request queue does not mean an Azure SQL serverless database is idle enough to pause. A health check that opens a connection every minute, an administration tab, or an idle application pool can keep database sessions alive even when no customer query is running.

Investigate the database's pause prerequisites and the clients connected during the idle window. Low average CPU by itself is not evidence that auto-pause should already have happened.

## Verify that auto-pause is available and enabled

Read the database configuration through Azure Resource Manager:

```bash
az sql db show --resource-group rg-data \
  --server orders-prod --name orders \
  --query '{status:status,sku:sku,autoPauseDelay:autoPauseDelay,minCapacity:minCapacity}' \
  --output json
```

Auto-pause is supported for General Purpose serverless databases. It is not the pause mechanism for Hyperscale serverless. Check the configured delay rather than assuming the default; an auto-pause delay of `-1` disables the feature.

Microsoft's [auto-pause documentation](https://learn.microsoft.com/en-us/azure/azure-sql/database/serverless-tier-auto-pause-resume?view=azuresql-db) requires no sessions and no user-workload CPU during the configured delay. Brief reconnects can therefore prevent a continuous idle interval even when a graph rounds CPU down to zero.

The transition itself also takes time after the eligibility interval. Treat the configured delay as a condition for starting pause, not an exact promise that the status changes at that minute.

## Check feature-level blockers before chasing pools

Some database features keep auto-pause from occurring. Review active geo-replication or failover groups, long-term backup retention, and logical-server DNS aliases. SQL Data Sync's sync database and an elastic jobs job database have additional restrictions. Consult the current feature table before changing any of these settings.

These features may exist for recovery or operational requirements. Removing them merely to demonstrate a pause can create a larger problem than the compute cost. If an essential feature prevents auto-pause, document that constraint and compare compute choices using the actual workload.

There can also be temporary service-update activity. Persistent session activity and a temporarily deferred platform transition require different remedies.

## Identify connected applications

Connect directly to the database using an authorized diagnostic identity. In Azure SQL Database, `VIEW DATABASE STATE` is required to inspect other sessions through `sys.dm_exec_sessions`.

```sql
SELECT session_id, login_name, host_name, program_name,
       status, login_time, last_request_start_time,
       last_request_end_time, open_transaction_count
FROM sys.dm_exec_sessions
WHERE is_user_process = 1
  AND database_id = DB_ID()
  AND session_id <> @@SPID
ORDER BY last_request_end_time;
```

Look for the same application name appearing long after scheduled work completed. A `sleeping` session remains a session; its lack of an active request does not mean the underlying connection has disappeared.

Use `Application Name` in SqlClient connection strings to make the output useful:

```text
Application Name=orders-api;Min Pool Size=0;
```

Choose stable names such as `orders-api`, `orders-worker`, and `orders-health`. Do not generate a unique application name for each request because connection-string differences can create distinct pools.

The query is a snapshot. An empty result cannot rule out a health check that connected thirty seconds earlier. Where existing database auditing is available, correlate login activity over the entire delay window. Do not leave the diagnostic connection open while testing whether the database can pause.

## Understand what disposing a connection does

With SqlClient pooling enabled, disposing a logical connection normally returns the physical connection to a pool. That reuse is beneficial during active traffic but can leave an idle SQL session after application code finishes.

`Min Pool Size=0` allows an idle pool to release connections over time. A positive minimum retains a baseline of connections while the process remains alive. Review both the application and any framework defaults rather than assuming that a `using` block guarantees immediate physical disconnection.

For a short-lived batch worker, allowing the process to exit after its work is complete provides a clear connection-lifecycle boundary. For a small dedicated diagnostic job where pooling offers little benefit, an explicit nonpooled connection can be reasonable:

```text
Server=tcp:orders-prod.database.windows.net,1433;Database=orders;Authentication=Active Directory Managed Identity;Encrypt=True;TrustServerCertificate=False;Pooling=False;Application Name=occasional-diagnostic;
```

This example assumes a system-assigned managed identity and a compatible SqlClient authentication setup. It is not a recommendation to disable pooling on a busy web service. More physical connections can increase authentication work and latency during active periods.

## Review health checks and background work

Inventory readiness checks, uptime monitors, ORM background tasks, scheduled jobs, dashboards, migration probes, and administration tools. A query that runs every thirty seconds prevents a sixty-minute idle interval even if each query takes only a few milliseconds.

Separate process liveness from dependency verification. A liveness endpoint can report whether the process is functioning without opening SQL on every probe. Keep a deliberate database readiness check where the deployment needs it, but recognize that continuously checking database responsiveness is incompatible with expecting the database to remain paused.

For an application with scheduled idle periods, adjust the diagnostic schedule to match the service expectation. Do not simply disable monitoring without replacing the signal operators still need. Management-plane status and Azure Monitor metrics can observe pause behavior without repeatedly issuing SQL login attempts.

## Run a controlled idle-window experiment

Record the time of the final expected application request. Stop or reschedule one known source of periodic SQL access, let its connections close, and disconnect your diagnostic session. Observe database status through `az sql db show` at a reasonable interval.

If the database pauses, reintroduce clients one at a time to identify the source that resumes it or prevents the next pause. If it stays online, recheck session evidence and feature constraints rather than reducing the delay again.

A paused database can resume for reasons beyond user traffic, including some management operations. Correlate `Resume Databases` events and their caller information before attributing every wake-up to the application.

## Conclusion

Auto-pause depends on a continuous interval without sessions and user-workload CPU, plus compatible configuration. Make clients identifiable, inspect their connection lifetimes, and verify an actual idle window without letting the diagnostic session keep the database awake.

## Official Documentation

- [Auto-pause requirements and blockers](https://learn.microsoft.com/en-us/azure/azure-sql/database/serverless-tier-auto-pause-resume?view=azuresql-db)
- [Serverless status and metrics](https://learn.microsoft.com/en-us/azure/azure-sql/database/serverless-tier-monitor?view=azuresql)
- [SqlClient connection pool lifecycle](https://learn.microsoft.com/en-us/sql/connect/ado-net/sql-server-connection-pooling?view=sql-server-ver17)
- [Session DMV and permissions](https://learn.microsoft.com/en-us/sql/relational-databases/system-dynamic-management-views/sys-dm-exec-sessions-transact-sql?view=sql-server-ver17)
- [Serverless compute billing](https://learn.microsoft.com/en-us/azure/azure-sql/database/serverless-tier-billing?view=azuresql)
