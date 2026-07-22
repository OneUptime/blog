# SQL Server Differential Backups in Availability Groups

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SQL Server, Always On Availability Groups, Differential Backup, Secondary Replica, SQL Server 2025

Description: Route SQL Server availability-group backups correctly across version-specific primary and secondary capabilities while preserving one recoverable chain.

---

The replica that can take a differential backup depends on SQL Server version. In SQL Server 2022 and earlier, native full and differential database backups run on the primary; secondaries support log backups and copy-only full backups. SQL Server 2025 adds full and differential backup support on secondary replicas.

Backup preference does not make an unsupported operation valid. Jobs must combine version-aware capability checks with the availability group's preferred-replica policy.

## Rules Through SQL Server 2022

For SQL Server 2022 and earlier:

- the primary can take all supported backup types;
- a secondary can take transaction log backups;
- a secondary can take copy-only full database, file, or filegroup backups;
- a secondary cannot establish a regular full differential base or take a database differential.

This means a traditional plan with scheduled regular fulls and differentials keeps those data-backup jobs on the primary. Log backups can be offloaded according to preference, while remaining part of one database log chain.

A copy-only full from a secondary is useful for an independent restore copy, but by definition it cannot become a differential base. Do not point later primary differentials at it.

## SQL Server 2025 Changes the Capability

Microsoft documents that SQL Server 2025 and later allow full and differential backups on secondary replicas. This can offload data-backup read and compression work, but it requires the entire topology and tooling to support the new engine behavior.

Before enabling it:

- verify every replica's exact version and patch level;
- verify the backup product supports SQL Server 2025 secondary full/differential operations;
- test failover during and between jobs;
- confirm base metadata and restore on an isolated instance;
- measure redo, I/O, CPU, and network impact on the secondary;
- ensure retention sees one dependency graph across replica-local histories.

A mixed-version rolling upgrade requires conservative routing. Do not assume that because one replica supports the operation, a job can run it on any preferred secondary.

## Backup Preferences Are Advisory to Jobs

Availability groups expose these backup-preference policies:

- prefer secondary;
- secondary only;
- primary;
- any replica.

The Database Engine does not automatically launch, move, or prevent every backup job based solely on that setting. Backup scripts should call:

```sql
IF sys.fn_hadr_backup_is_preferred_replica(N'Sales') <> 1
BEGIN
    PRINT 'Not the preferred backup replica; exiting successfully.';
    RETURN;
END;
```

Deploy the guarded job to replicas that may be selected. Configure replica backup priorities and exclusion consistently. Also validate that the current role supports the requested backup type for its SQL Server version.

Jobs should exit without raising a false backup failure when another healthy replica is preferred, but monitoring must still prove that exactly one eligible job produced the expected backup within the RPO.

## Maintain a Unified Chain

Log backups taken on different replicas participate in the database's log chain. The problem is often catalog fragmentation: each instance has its own `msdb` history, while backup objects land in shared or separate repositories.

Build an external catalog containing:

- availability group, database identity, and producing replica;
- backup type, start and finish time, and backup-set position;
- first/last LSN and differential-base LSN/GUID;
- copy-only and checksum flags;
- media families, hashes, encryption-key identifier, and retention;
- transfer completion and restore-test result.

Never delete a full base because its producing replica is no longer primary. A differential's metadata relationship survives failover.

## Handle Failover Explicitly

A job can begin on a preferred replica just before roles change. Check the preferred-replica function and database state immediately before backup, handle command errors, and let monitoring detect a missed interval. Do not allow two independent schedulers to create competing regular fulls without catalog coordination; each can redirect the differential base.

After failover:

- confirm log jobs continue on one eligible preferred replica;
- through SQL Server 2022, confirm regular full/differential jobs follow the new primary;
- on SQL Server 2025, confirm the selected replica supports and is authorized for secondary data backups;
- inspect the next differential's base metadata;
- verify object-storage access from the new job host.

Backup preference is separate from mandatory secondary eligibility. Microsoft requires a secondary replica to be able to communicate with the primary and to be in `SYNCHRONIZED` or `SYNCHRONIZING` state before it can host a supported backup. A disconnected or otherwise ineligible secondary must not run the job, regardless of priority. Among eligible replicas, incorporate stricter lag and health thresholds required by your recovery policy and backup product.

## Test the Restore, Not the Replica Label

Run a drill that deliberately mixes a full, differential, and logs produced on different eligible replicas. Restore them from the external catalog, validate LSN continuity, run `DBCC CHECKDB`, and check application state. Then repeat across planned failover and a missed preferred replica.

Availability-group secondaries are not backups. They can replicate deletion or corruption and do not provide historical recovery by themselves. Continue maintaining protected, immutable, off-host backup chains even when backup work is successfully offloaded.

## Official Documentation

- [Offload supported backups to availability-group secondary replicas](https://learn.microsoft.com/en-us/sql/database-engine/availability-groups/windows/active-secondaries-backup-on-secondary-replicas-always-on-availability-groups?view=sql-server-ver17)
- [Configure backup on availability-group replicas](https://learn.microsoft.com/en-us/sql/database-engine/availability-groups/windows/configure-backup-on-availability-replicas-sql-server?view=sql-server-ver17)
- [`sys.fn_hadr_backup_is_preferred_replica`](https://learn.microsoft.com/en-us/sql/relational-databases/system-functions/sys-fn-hadr-backup-is-preferred-replica-transact-sql?view=sql-server-ver17)
- [Always On availability groups overview](https://learn.microsoft.com/en-us/sql/database-engine/availability-groups/windows/overview-of-always-on-availability-groups-sql-server?view=sql-server-ver17)
- [Azure Backup version-specific availability-group backup behavior](https://learn.microsoft.com/en-us/azure/backup/backup-sql-server-on-availability-groups)
