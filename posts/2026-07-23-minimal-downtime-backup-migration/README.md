# Migrating SQL Server with Minimal Downtime Using Full, Log, and Tail-Log Backups

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SQL Server, Database Migration, Backup and Restore, Transaction Log, Cutover

Description: Seed a destination from a full backup, continuously replay log backups, and use a final tail-log backup for a controlled low-downtime cutover.

---

Native backup and restore can migrate a SQL Server database while the source remains online for most of the copy. Restore a full backup to the destination with `NORECOVERY`, apply every subsequent transaction-log backup in order, stop source writes, capture and restore the tail, and recover the destination.

Downtime becomes the final write drain, tail backup transfer and restore, validation, and client switch-not the duration of the full database copy.

## Confirm That the Method Fits

This workflow requires:

- the source database to use full recovery with a healthy log chain;
- a destination on the same or a newer SQL Server version supported for restore;
- network and storage capacity for the full seed and continuing logs;
- every certificate/private key or EKM asymmetric key/provider used for backup encryption or TDE available at the destination before restore;
- a tested method to transfer instance-level objects and switch clients;
- an outage window long enough for the final tail and validation.

SQL Server cannot restore a backup created by a newer version onto an older version. When recovery upgrades a database on a newer engine, it cannot simply be backed up and restored to the older engine for rollback. Treat that as a one-way compatibility boundary and test the exact source/destination builds.

Run `DBCC CHECKDB` and a restore rehearsal before the migration window. Resolve corruption, backup errors, insufficient destination capacity, and unsupported features before cutover.

## Inventory Everything Outside the Database

A user database backup does not move all instance state. Script or migrate:

- SQL-authenticated logins with their original SIDs and password hashes, plus Windows/Entra principals as applicable;
- SQL Server Agent jobs, schedules, alerts, operators, credentials, and proxies;
- linked servers, endpoints, server roles, permissions, and configuration;
- certificates, keys, Database Mail, integration dependencies, and maintenance jobs;
- database owner, trustworthy/containment decisions, and server-level dependencies;
- connection listener, DNS, aliases, firewall rules, and monitoring.

Disable destination jobs that could modify the database until cutover. Keep source and destination job ownership explicit so a failback decision does not produce duplicate processing.

## Seed the Destination

A copy-only full backup is useful when the migration must not change the source's differential base:

```sql
BACKUP DATABASE Sales
TO DISK = N'E:\Migration\Sales_seed.bak'
WITH COPY_ONLY, CHECKSUM, COMPRESSION, INIT, STATS = 10;
```

Transfer the file using a checked and retryable process, record its byte length and cryptographic hash, and inspect its header at the destination. Determine logical file names with `RESTORE FILELISTONLY`, then restore to explicit paths:

```sql
RESTORE DATABASE Sales
FROM DISK = N'X:\Inbound\Sales_seed.bak'
WITH FILE = 1,
     MOVE N'Sales_Data' TO N'F:\SQLData\Sales.mdf',
     MOVE N'Sales_Log'  TO N'G:\SQLLog\Sales.ldf',
     NORECOVERY,
     CHECKSUM,
     STATS = 10;
```

The destination database remains in `RESTORING`, which is required for later log restores. Do not use `STANDBY` unless the migration design intentionally needs read-only access and has capacity for the undo file.

## Keep Replaying the Log Chain

Take migration log backups frequently enough to keep the final backlog small:

```sql
BACKUP LOG Sales
TO DISK = N'E:\Migration\Sales_log_0001.trn'
WITH CHECKSUM, COMPRESSION, INIT, STATS = 5;
```

Transfer and restore each file in LSN order:

```sql
RESTORE LOG Sales
FROM DISK = N'X:\Inbound\Sales_log_0001.trn'
WITH FILE = 1, NORECOVERY, CHECKSUM, STATS = 5;
```

Every non-copy-only log backup taken after the seed participates in the sequence, including backups produced by the normal production job or another backup product. Do not restore only files whose names begin with `Sales_log_migration`. Either coordinate one authoritative log-backup workflow during the migration or catalog and deliver **all** intervening log backup sets. Check `FirstLSN`, `LastLSN`, database identity, and recovery fork from the headers before restore.

Automate transfer acknowledgement and restore status. Alert on:

- a missing or duplicate backup-set position;
- an LSN gap or wrong database/recovery fork;
- transfer checksum/hash mismatch;
- destination restore failure or low disk space;
- growing unshipped byte backlog;
- source log reuse waiting on backup.

Practice failure handling: if one log is delayed, retain later logs but do not apply them out of order.

## Rehearse the Cutover

Measure a full rehearsal with a production-sized restored copy. The cutover runbook should name one decision maker and include exact commands, expected durations, health gates, and abort points.

Before the window:

1. catch the destination up to the latest completed log backup;
2. install but disable destination jobs;
3. validate login SIDs and database user mappings;
4. lower DNS TTL in advance if DNS is part of the switch;
5. confirm application connection-pool drain and write-freeze controls;
6. confirm no unplanned backup job can create an unseen log backup;
7. take a final go/no-go snapshot of capacity and replication/backup health.

## Capture the Tail and Recover the Target

At cutover, stop application writes and background workers. Prove that writes have drained; do not rely only on an announcement. Drain or terminate remaining database connections so that `NORECOVERY` can obtain exclusive access, using a rehearsed single-user procedure if necessary. Then take the final tail-log backup:

```sql
BACKUP LOG Sales
TO DISK = N'E:\Migration\Sales_tail.trn'
WITH NORECOVERY, CHECKSUM, COMPRESSION, INIT, STATS = 5;
```

`NORECOVERY` backs up the tail and leaves the source database in `RESTORING`, preventing new transactions from silently appearing after the final backup. If this backup fails, stop and investigate; do not recover the destination while claiming a zero-loss boundary.

Transfer and verify the file, then apply it and recover exactly once:

```sql
RESTORE LOG Sales
FROM DISK = N'X:\Inbound\Sales_tail.trn'
WITH FILE = 1, NORECOVERY, CHECKSUM, STATS = 5;

RESTORE DATABASE Sales WITH RECOVERY;
```

After `WITH RECOVERY`, further log backups cannot be added to that restore sequence.

## Validate Before Enabling Writes

Keep clients blocked while checking:

- database state, owner, compatibility level, and file locations;
- last source business watermark versus destination watermark;
- critical row counts and application invariants;
- login-to-user SID mappings and least-privilege access;
- TDE, Service Broker, replication, CDC, and other feature-specific state;
- read smoke tests and write tests that are guaranteed to roll back without external side effects through the future application endpoint;
- jobs, monitoring, backup ownership, and alerting.

Only then switch the listener, alias, DNS, or connection configuration and enable destination jobs. Watch connection errors, write throughput, blocking, and business transactions throughout the stabilization window.

## Make Rollback an Explicit Data Decision

Before destination writes begin, rollback can often mean returning the source database to service and reversing the client switch. After destination writes begin, the source and destination diverge. A quick DNS reversal can lose or duplicate committed work unless a separate reverse-migration design reconciles it.

Define a final rollback gate before enabling writes. Preserve the source files and all migration media according to policy, but do not bring both copies online for writers. After acceptance, start and verify destination full/log backups; the migration chain is not a substitute for the destination's ongoing recovery strategy.

## Official Documentation

- [Copy databases with backup and restore](https://learn.microsoft.com/en-us/sql/relational-databases/databases/copy-databases-with-backup-and-restore?view=sql-server-ver17)
- [Copy-only backups](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/copy-only-backups-sql-server?view=sql-server-ver17)
- [Tail-log backups](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/tail-log-backups-sql-server?view=sql-server-ver17)
- [RESTORE statements](https://learn.microsoft.com/en-us/sql/t-sql/statements/restore-statements-transact-sql?view=sql-server-ver17)
- [Transfer logins and passwords between SQL Server instances](https://learn.microsoft.com/en-us/troubleshoot/sql/database-engine/security/transfer-logins-passwords-between-instances)
