# How to Restore SQL Server to a Point in Time Without Breaking the Log Chain

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SQL Server, Point-in-Time Restore, Transaction Log, Backup, Disaster Recovery

Description: Select and restore a valid SQL Server backup sequence to a precise time while preserving the source log chain and a safe fallback.

---

A point-in-time restore is a restore sequence under the full or bulk-logged recovery model: restore a data backup, leave the database unrecovered, apply every required log backup in order, stop inside the log that contains the target time, and recover once.

The safe default is to restore to a new database on an isolated instance. That preserves the damaged or accidentally changed source, lets the team validate the target event, and avoids an irreversible overwrite based on an unverified timestamp.

## Confirm That the Target Is Recoverable

Before running `RESTORE`, establish:

- the last known-good business event and first known-bad event;
- the timezone and clock source used by the application, operators, and SQL Server host;
- whether the database was in full or bulk-logged recovery during the interval;
- whether a tail-log backup can capture changes after the latest scheduled log backup;
- whether any log backup covering the target contains minimally logged operations under bulk-logged recovery;
- whether backup encryption or TDE certificates and private keys are available.

Bulk-logged recovery can prevent stopping at an arbitrary time inside a log backup that contains bulk changes. In that case, SQL Server must restore that log through its end. Move the recovery point or choose a different recovery approach based on the business decision.

## Preserve the Tail When Possible

If the source database is damaged or about to be overwritten but its transaction log remains accessible, a tail-log backup may capture work since the last scheduled log backup. Coordinate this step carefully because `NORECOVERY` takes the source database into the restoring state:

```sql
BACKUP LOG Sales
TO DISK = N'E:\SQLBackups\Sales_tail_20260723_1438.trn'
WITH NORECOVERY, CHECKSUM, STATS = 10;
```

Some damaged-database scenarios use `NO_TRUNCATE`; follow the documented tail-log scenario rather than adding it automatically. Do not take a tail backup from a healthy source merely because an alternate test restore is being performed—the normal log chain can continue.

Retain the tail backup with the rest of the chain. It is not a disposable incident artifact.

## Inventory Backup Headers

Do not select files solely from names or modification times. Read their metadata:

```sql
RESTORE HEADERONLY
FROM DISK = N'E:\SQLBackups\Sales_full_20260720.bak';

RESTORE FILELISTONLY
FROM DISK = N'E:\SQLBackups\Sales_full_20260720.bak';
```

For every candidate set, record backup type, database identity, `Position`, backup start and finish time, `FirstLSN`, `LastLSN`, checkpoint/database backup LSN, differential base LSN and GUID, recovery fork, copy-only status, checksum status, and all media families. If a device contains multiple backup sets, use the correct `FILE = <Position>` in every command.

Choose:

1. a valid full backup before the target;
2. optionally, the newest compatible differential completed before the target and based on that exact full;
3. a continuous sequence of log backups covering the selected data backup through the target;
4. the tail-log backup when one was taken and the target requires it.

Overlapping log backups are normal; an LSN gap or incompatible recovery fork is not.

## Restore to New Names and Paths

The following example assumes the logical file names were confirmed by `RESTORE FILELISTONLY`:

```sql
RESTORE DATABASE Sales_Recovery
FROM DISK = N'E:\SQLBackups\Sales_full_20260720.bak'
WITH FILE = 1,
     MOVE N'Sales_Data' TO N'F:\SQLData\Sales_Recovery.mdf',
     MOVE N'Sales_Log'  TO N'G:\SQLLog\Sales_Recovery.ldf',
     NORECOVERY,
     CHECKSUM,
     STATS = 10;
```

If a compatible differential is part of the chosen path:

```sql
RESTORE DATABASE Sales_Recovery
FROM DISK = N'E:\SQLBackups\Sales_diff_20260723_0000.bak'
WITH FILE = 1, NORECOVERY, CHECKSUM, STATS = 10;
```

Do not use `WITH REPLACE` for a routine recovery-to-new-name workflow. Validate that the target files and database name are dedicated to the restore.

## Apply Every Required Log in Order

Specify the same target in the log restore commands. SQL Server fully applies backups that end before the target and stops when it reaches the target:

```sql
RESTORE LOG Sales_Recovery
FROM DISK = N'E:\SQLBackups\Sales_log_20260723_1400.trn'
WITH FILE = 1,
     STOPAT = '2026-07-23T14:32:15',
     NORECOVERY,
     CHECKSUM;

RESTORE LOG Sales_Recovery
FROM DISK = N'E:\SQLBackups\Sales_log_20260723_1415.trn'
WITH FILE = 1,
     STOPAT = '2026-07-23T14:32:15',
     NORECOVERY,
     CHECKSUM;

RESTORE LOG Sales_Recovery
FROM DISK = N'E:\SQLBackups\Sales_log_20260723_1430.trn'
WITH FILE = 1,
     STOPAT = '2026-07-23T14:32:15',
     NORECOVERY,
     CHECKSUM;
```

Use the timestamp convention verified for the environment. An ISO-shaped literal avoids language-dependent ambiguity, but it does not solve a timezone misunderstanding. Correlate the restored business data with event IDs or audit records before declaring it correct.

Keep `NORECOVERY` until all intended restores are complete. `NORECOVERY` leaves uncommitted changes unrolled back so later log backups can be applied. Once the database is recovered, additional backups cannot be appended to that restore sequence; a different target requires starting the sequence again.

## Recover Once, Then Validate

```sql
RESTORE DATABASE Sales_Recovery WITH RECOVERY;
```

Validate in layers:

```sql
SELECT name, state_desc, recovery_model_desc
FROM sys.databases
WHERE name = N'Sales_Recovery';

DBCC CHECKDB (N'Sales_Recovery') WITH NO_INFOMSGS;
```

Then verify:

- the last good transaction exists and the first bad transaction does not;
- schema version and critical row counts are expected;
- application invariants reconcile across related tables;
- database users, ownership, and instance-level dependencies are understood;
- an isolated application instance passes read and write smoke tests.

Restoring an unknown or untrusted database can expose executable code and malicious schema content. Keep the target isolated and use no production credentials until it is trusted.

## Decide How to Return Data to Production

Often the safest correction is to extract a small, reviewed set of rows from the recovered copy and apply a controlled compensating transaction to the live database. Replacing the whole production database may discard valid work after the chosen point.

If full replacement is required, script logins, jobs, ownership, configuration, and cutover steps; freeze writes; capture any final evidence or tail; and retain a rollback copy. Changing the destination database does not break the **source** log chain. What breaks recovery is missing required log backups, changing to simple recovery, or losing media/keys—not restoring a separate copy.

Document the selected backup-set positions and LSN path after the incident. Then add a recurring drill for the exact scenario that exposed the gap.

## Official Documentation

- [Restore a SQL Server database to a point in time](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/restore-a-sql-server-database-to-a-point-in-time-full-recovery-model?view=sql-server-ver17)
- [Tail-log backups](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/tail-log-backups-sql-server?view=sql-server-ver17)
- [Plan and perform restore sequences under the full recovery model](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/plan-and-perform-restore-sequences-full-recovery-model?view=sql-server-ver17)
- [RESTORE statements](https://learn.microsoft.com/en-us/sql/t-sql/statements/restore-statements-transact-sql?view=sql-server-ver17)
- [RESTORE HEADERONLY](https://learn.microsoft.com/en-us/sql/t-sql/statements/restore-statements-headeronly-transact-sql?view=sql-server-ver17)
