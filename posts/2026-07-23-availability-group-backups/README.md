# SQL Server Availability Group Backups: Which Replica Should Run Each Job?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SQL Server, Availability Groups, Backup, High Availability, SQL Server Agent

Description: Route availability-group backup jobs by SQL Server version, backup type, replica health, preference, and measured restore requirements.

---

An availability group replicates a database; it does not replace backups. Accidental changes and some corruption can be reproduced on secondaries, and an availability-group failover does not provide an older recovery point.

Backup routing has two layers: which backup types a SQL Server version supports on a secondary, and which healthy replica the configured preference selects. The availability-group preference is advisory—the Database Engine does not automatically start, stop, or enforce SQL Server Agent jobs for you.

## Start with the Version and Backup Type

Secondary-replica support changed in SQL Server 2025:

| Backup type | SQL Server 2022 and earlier secondary | SQL Server 2025 and later secondary |
| --- | --- | --- |
| Regular full | Not supported | Supported |
| Differential | Not supported | Supported |
| Copy-only full | Supported | Supported |
| Transaction log | Supported | Supported |

On SQL Server 2022 and earlier, run regular full and differential backups on the primary. A full backup taken on a secondary must be copy-only, so it does not establish a new differential base. On SQL Server 2025 and later, full and differential backups can run on any eligible secondary, allowing the backup preference to route those types too.

Log backups taken on different replicas still form one consistent database log chain. `COPY_ONLY` is not supported for log backups on a secondary. Catalog every log backup regardless of which instance wrote it.

The secondary must communicate with the primary and be `SYNCHRONIZED` or `SYNCHRONIZING` to run supported backups. A backup on a lagging secondary can add CPU, I/O, and log-retention pressure; support does not mean it is always the best operational target.

Do not overlap backup operations across replicas. Microsoft documents concurrent backups—for example, a transaction-log backup on the primary while a full backup runs on a secondary—as unsupported. Coordinate schedules and retries centrally so failover does not accidentally create overlap.

## Understand the Four Preferences

Configure one availability-group preference:

- **Primary:** prefer only the current primary.
- **Secondary only:** never choose the primary; if no eligible secondary is available, the preference provides no fallback.
- **Prefer secondary:** choose an eligible secondary when one exists, otherwise allow the primary.
- **Any replica:** choose by backup priority and eligibility without regard to role.

Each replica has a backup priority from 0 through 100. Zero excludes that replica from preference selection; higher values rank ahead of lower values. Equal priorities are resolved according to the documented replica-name ordering behavior, so assign deliberate values rather than relying on a tie.

Inspect the configuration:

```sql
SELECT
    ag.name AS ag_name,
    ag.automated_backup_preference_desc,
    ar.replica_server_name,
    ar.backup_priority,
    ars.role_desc,
    ars.connected_state_desc,
    ars.synchronization_health_desc
FROM sys.availability_groups AS ag
JOIN sys.availability_replicas AS ar
  ON ar.group_id = ag.group_id
LEFT JOIN sys.dm_hadr_availability_replica_states AS ars
  ON ars.replica_id = ar.replica_id
ORDER BY ag.name, ar.backup_priority DESC;
```

Configure preferences from the current primary using SSMS, `ALTER AVAILABILITY GROUP`, or PowerShell. Recheck them after topology changes.

## Put a Role-Aware Job on Every Candidate

For backup types supported on all candidate replicas, create the same scheduled job on every instance and gate its work with:

```sql
DECLARE @database sysname = N'Sales';

IF sys.fn_hadr_backup_is_preferred_replica(@database) <> 1
BEGIN
    PRINT N'Not the preferred backup replica; exiting successfully.';
    RETURN;
END;

BACKUP LOG Sales
TO DISK = N'\\backup.example\sql\Sales\Sales_log_20260723_1430.trn'
WITH CHECKSUM, COMPRESSION, INIT, STATS = 5;
```

Generate a collision-proof filename from an approved scheduler rather than hard-coding a timestamp. The function returns `1` for a database that is not in an availability group, which lets the same job protect standalone databases, but the job should still validate database state and policy.

A nonpreferred job should normally exit successfully so failover does not create false job failures on every replica. Separately monitor **actual backup age in a central catalog**. Otherwise, all jobs can report success by skipping while no backup is created.

On SQL Server 2022 and earlier, do not gate a regular full or differential job solely with a preference that chooses a secondary: that replica cannot run the requested type. Keep those jobs primary-role-aware, while copy-only full and log jobs can use the availability-group preference. On SQL Server 2025 and later, supported full and differential jobs can use preference routing across replicas.

## Choose a Replica by More Than Spare CPU

Evaluate:

- **Recovery objective:** can the selected job cadence and media retention restore to the required point?
- **Replica lag:** will backup I/O or compression compete with log hardening or redo?
- **Synchronous commit:** pressure on a synchronous secondary can affect primary commit latency.
- **Storage path:** can every candidate reach the protected destination with the same permissions and throughput?
- **Failure domains:** does backup media survive loss of the availability-group hosts and storage?
- **Readable workload:** will reports, redo, and backup compete on the same secondary?
- **Network:** will a remote secondary's upload path meet schedule and RTO?
- **Licensing and version:** is the intended operation supported on that replica and release?

Measure backup duration, compression CPU, I/O latency, log send/redo queues, and primary transaction latency under production-like load. Offloading is useful only if the secondary remains a healthy recovery target.

## Coordinate Full, Differential, and Log Policy

Maintain one logical recovery policy per database, not an independent chain per replica. Record backup-set headers, LSNs, differential base, replica, SQL Server build, stripes, checksum status, encryption key, object URI, and retention in a catalog outside the source instances.

Remember that backup history in `msdb` is local. After jobs move during failover, no one instance necessarily has the full history. Central monitoring must find media written by all replicas.

For SQL Server 2022 and earlier:

1. run normal full and differential backups on the current primary;
2. route log backups to the preferred eligible replica;
3. use copy-only full backups on a secondary for independent needs without changing the differential base.

For SQL Server 2025 and later, full and differential backups can follow the preference too, but test restore selection and third-party tooling with the new behavior before changing the production schedule.

Do not allow overlapping tools to create log backups that one another fails to retain. A log backup written by an ad hoc job is part of the restore sequence even when the normal scheduler did not create it.

## Make Failover Boring

Test these conditions intentionally:

- planned failover immediately before every backup type;
- preferred secondary offline;
- `SECONDARY_ONLY` with no eligible secondary;
- backup share unavailable from one replica;
- suspended data movement;
- equal and zero backup priorities;
- SQL Server Agent stopped on the newly preferred replica.

Alert when the newest recoverable full/differential/log chain exceeds RPO, not merely when an Agent step returns failure. Verify checksums, media replication, and key access. Run recurring restores that select files across a replica failover and prove the LSN sequence.

Finally, never run `RESTORE` against a primary or secondary database while it belongs to the availability group; restore drills belong on an isolated database/instance. The backup system is successful only when it can rebuild the database without relying on the availability group that just failed.

## Official Documentation

- [Offload supported backups to secondary replicas](https://learn.microsoft.com/en-us/sql/database-engine/availability-groups/windows/active-secondaries-backup-on-secondary-replicas-always-on-availability-groups?view=sql-server-ver17)
- [Configure backups on availability replicas](https://learn.microsoft.com/en-us/sql/database-engine/availability-groups/windows/configure-backup-on-availability-replicas-sql-server?view=sql-server-ver17)
- [sys.fn_hadr_backup_is_preferred_replica](https://learn.microsoft.com/en-us/sql/relational-databases/system-functions/sys-fn-hadr-backup-is-preferred-replica-transact-sql?view=sql-server-ver17)
- [ALTER AVAILABILITY GROUP](https://learn.microsoft.com/en-us/sql/t-sql/statements/alter-availability-group-transact-sql?view=sql-server-ver17)
- [Copy-only backups](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/copy-only-backups-sql-server?view=sql-server-ver17)
