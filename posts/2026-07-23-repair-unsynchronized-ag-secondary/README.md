# How to Repair an Unsynchronized SQL Server Availability Group Secondary

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SQL Server, Always On, Availability Groups, High Availability, Troubleshooting

Description: Diagnose why an availability-group secondary is not synchronizing, resume safe data movement, and reseed only when the existing copy cannot recover.

---

“Not synchronized” is a health symptom, not a command to reseed. A secondary can be catching up normally, suspended after an error, disconnected from the primary, blocked by storage or network pressure, reverting after failover, or missing a valid joined database.

First preserve evidence and determine whether log movement is stopped or merely behind. Reinitializing a healthy but slow replica adds load and can destroy a copy needed to investigate possible data divergence.

## Establish the Role and Database State

Run a replica-state query on the primary and, when possible, on the affected secondary. Some DMV columns are local-state dependent, so compare both perspectives:

```sql
SELECT
    ag.name AS ag_name,
    ar.replica_server_name,
    ars.role_desc,
    ars.connected_state_desc,
    DB_NAME(drs.database_id) AS database_name,
    drs.synchronization_state_desc,
    drs.synchronization_health_desc,
    drs.database_state_desc,
    drs.is_suspended,
    drs.suspend_reason_desc,
    drs.log_send_queue_size,
    drs.log_send_rate,
    drs.redo_queue_size,
    drs.redo_rate,
    drs.last_sent_time,
    drs.last_received_time,
    drs.last_hardened_time,
    drs.last_redone_time
FROM sys.availability_groups AS ag
JOIN sys.availability_replicas AS ar
  ON ar.group_id = ag.group_id
LEFT JOIN sys.dm_hadr_availability_replica_states AS ars
  ON ars.replica_id = ar.replica_id
LEFT JOIN sys.dm_hadr_database_replica_states AS drs
  ON drs.replica_id = ar.replica_id
ORDER BY ag.name, database_name, ar.replica_server_name;
```

Interpret the pattern:

- **All databases disconnected on one replica:** investigate instance, endpoint, network, authentication, or WSFC health.
- **One database suspended:** inspect its error and suspend reason; storage/file problems are common candidates.
- **`SYNCHRONIZING` with moving timestamps/queues:** data movement works; determine whether send or redo throughput is insufficient.
- **`NOT SYNCHRONIZING` with `REVERTING`:** the replica may be undoing changes after a failover; estimate progress before intervening.
- **Database absent or not joined:** initial seeding or join may be incomplete.

An asynchronous-commit secondary normally reports `SYNCHRONIZING`, not `SYNCHRONIZED`, even when healthy. Do not require the synchronous state from an asynchronous design.

## Preserve the Error Evidence

Record the Always On dashboard, SQL Server error logs on both replicas, Windows event logs, and cluster logs for the incident interval. Check:

- database mirroring endpoint state, URL, port, firewall, and service-account authentication;
- SQL Server service and host restarts;
- data and log volume capacity, file permissions, and I/O errors;
- a file added on the primary whose path does not exist on the secondary;
- log-send, network, hardening, and redo bottlenecks;
- recovery model and backup/log health;
- whether a forced failover created potentially divergent transactions.

Fix the external cause before resuming. A full secondary disk will suspend again; a missing endpoint route will remain disconnected.

## Resume a Suspended Database

If data movement was suspended and the underlying problem is corrected, connect to the instance that hosts the affected secondary database:

```sql
ALTER DATABASE Sales SET HADR RESUME;
```

The command returns after the replica accepts it; resumption is asynchronous. Monitor `is_suspended`, synchronization state, last received/hardened/redone times, and queue sizes until progress is proven.

If the primary database itself was suspended, resuming it has group-wide implications. Follow the primary-specific runbook and confirm every secondary's state rather than issuing commands indiscriminately.

## Decide Whether the Secondary Is Sending or Redoing Slowly

`log_send_queue_size` is unsent log retained at the primary for that secondary. A growing send queue points toward log generation exceeding transport/hardening throughput, network trouble, or the secondary being unavailable.

`redo_queue_size` is hardened log waiting to be redone on the secondary. A growing redo queue points toward redo throughput, secondary I/O, CPU, blocking of redo in relevant scenarios, or a workload that generates changes faster than redo can apply them.

Rates are samples and can be zero during idle periods. Trend queue sizes and timestamps over time; do not divide one instantaneous queue by one instantaneous rate and call it an RTO. Check performance counters and waits on both hosts, and account for readable-secondary workload competing with redo.

When queues decline and timestamps advance, leave data movement running. Reseeding would copy more data and extend the exposure.

## Handle Reverting and Forced-Failover History Carefully

After failover, a new secondary may enter `REVERTING` while it negotiates a common recovery point and undoes log that is ahead of the current primary. This can be slow after a large interrupted transaction. Monitor the documented recovery-queue counters and error log before deciding it is stuck.

After a forced failover with possible data loss, the former primary may contain transactions absent from the new primary. Resuming can roll that divergent state back. If losing those rows is unacceptable, remove and preserve the former-primary database for analysis instead of resuming it automatically. This is a business data-reconciliation decision, not routine availability maintenance.

## Reseed Only When the Existing Secondary Is Not Recoverable

Reseeding is justified when the secondary database is damaged, its log chain cannot continue, initialization is invalid, or Microsoft-supported diagnosis indicates it cannot catch up. Before replacing it:

- confirm the primary is healthy and has a tested backup chain;
- preserve the existing secondary when it may contain divergent or forensic data;
- estimate backup, transfer, restore, log retention, and network capacity;
- verify file paths and free space on the secondary;
- coordinate backup jobs so every required log is retained.

To manually rebuild a secondary, first remove only that secondary database from the group on the secondary instance:

```sql
ALTER DATABASE Sales SET HADR OFF;
```

Do not recover and overwrite the old copy casually. Preserve or drop it according to the approved plan, then restore a current full backup and subsequent logs to a clean `Sales` database using `NORECOVERY`:

```sql
RESTORE DATABASE Sales
FROM DISK = N'X:\Seed\Sales_full.bak'
WITH MOVE N'Sales_Data' TO N'F:\SQLData\Sales.mdf',
     MOVE N'Sales_Log'  TO N'G:\SQLLog\Sales.ldf',
     NORECOVERY, CHECKSUM, STATS = 10;

RESTORE LOG Sales
FROM DISK = N'X:\Seed\Sales_log_0001.trn'
WITH NORECOVERY, CHECKSUM;
```

Apply every intervening log backup in LSN order until the copy is current enough to join. On the secondary:

```sql
ALTER DATABASE Sales
SET HADR AVAILABILITY GROUP = SalesAG;
```

If database files use different paths across replicas, use `RESTORE ... WITH MOVE` and ensure future add-file operations are designed for those differences. Automatic seeding is another supported option in appropriate versions and environments, but it still requires permission, capacity, and progress monitoring.

## Validate Redundancy, Not Only a Green Icon

After recovery:

1. verify queue trends and last harden/redo timestamps;
2. confirm the configured availability and failover modes;
3. test read-only routing if used;
4. verify backup jobs evaluate the preferred replica correctly;
5. restore-test a recent backup independently;
6. run a planned failover rehearsal only after the replica is eligible and the change is approved;
7. alert on suspension, disconnects, queue age/size, and volume capacity.

Document the original suspend reason and its remediation. “Reseeded successfully” is not a root cause and will not prevent the next suspension.

## Official Documentation

- [Monitor and troubleshoot availability groups](https://learn.microsoft.com/en-us/sql/database-engine/availability-groups/windows/always-on-availability-groups-troubleshooting-and-monitoring-guide?view=sql-server-ver17)
- [Resume an availability database](https://learn.microsoft.com/en-us/sql/database-engine/availability-groups/windows/resume-an-availability-database-sql-server?view=sql-server-ver17)
- [Monitor performance for Always On availability groups](https://learn.microsoft.com/en-us/sql/database-engine/availability-groups/windows/monitor-performance-for-always-on-availability-groups?view=sql-server-ver17)
- [Manually prepare a secondary database](https://learn.microsoft.com/en-us/sql/database-engine/availability-groups/windows/manually-prepare-a-secondary-database-for-an-availability-group-sql-server?view=sql-server-ver17)
- [Troubleshoot an availability-group database in reverting state](https://learn.microsoft.com/en-us/troubleshoot/sql/database-engine/availability-groups/troubleshoot-availability-group-database-reverting-state)
