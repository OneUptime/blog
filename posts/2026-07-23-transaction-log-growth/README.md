# Why the SQL Server Transaction Log Keeps Growing—and How to Stop It Safely

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SQL Server, Transaction Log, Recovery Model, Backup, Database Administration

Description: Diagnose the reason SQL Server cannot reuse transaction-log space, resolve that cause, and right-size the file without breaking recovery.

---

A growing transaction log is a symptom, not a request to shrink the file. SQL Server grows the physical log when the active portion needs more space and no reusable virtual log file is available. The safe response is to identify what delays log truncation, protect recoverability, and only then decide whether the physical file should become smaller.

Never delete, rename, or detach a transaction-log file to recover disk space. The log is required for transaction rollback, crash recovery, and backup/restore continuity.

## Separate File Size from Used Space

Run these checks in the affected database:

```sql
USE Sales;
GO

SELECT
    total_log_size_in_bytes / 1048576.0 AS total_log_mb,
    used_log_space_in_bytes / 1048576.0 AS used_log_mb,
    used_log_space_in_percent
FROM sys.dm_db_log_space_usage;

SELECT
    name,
    size * 8.0 / 1024 AS size_mb,
    CASE max_size
        WHEN -1 THEN NULL
        ELSE max_size * 8.0 / 1024
    END AS max_size_mb,
    is_percent_growth,
    CASE WHEN is_percent_growth = 1
         THEN growth
         ELSE growth * 8.0 / 1024
    END AS growth_value
FROM sys.database_files
WHERE type_desc = 'LOG';

SELECT
    recovery_model_desc,
    log_reuse_wait_desc
FROM sys.databases
WHERE name = DB_NAME();
```

`log_reuse_wait_desc` is the routing signal. It explains why inactive log records cannot currently be truncated for reuse. Truncation is logical and makes space inside the existing file reusable; shrinking is physical and returns trailing free space to the filesystem. A successful truncation does not reduce the file's size on disk.

## Match the Reuse Wait to the Cause

### `LOG_BACKUP`

Under the full or bulk-logged recovery model, regular transaction-log backups are required. Confirm the backup destination, SQL Server Agent job, credentials, and retention before taking an ad hoc backup:

```sql
BACKUP LOG Sales
TO DISK = N'E:\SQLBackups\Sales_20260723_1430.trn'
WITH CHECKSUM, STATS = 10;
```

The path is an example and must be a protected destination accessible to the Database Engine service account. A conventional ad hoc log backup becomes part of the restore chain, so retain and catalog it. Do not use `COPY_ONLY` expecting it to free reusable space: a copy-only log backup leaves the regular log-backup sequence unchanged, but it never truncates the log.

### `ACTIVE_TRANSACTION`

A transaction that began near the head of the active log can prevent reuse even if later transactions commit:

```sql
DBCC OPENTRAN (N'Sales');
```

Correlate the reported transaction with sessions, requests, application ownership, and transaction DMVs. Prefer getting the application to commit or roll back cleanly. `KILL` is an incident decision: rollback itself is logged and can take considerable time, so estimate the impact before terminating a session.

### `AVAILABILITY_REPLICA`

An availability-group secondary has not hardened or processed required log records. Check replica connectivity, send and redo queues, suspended data movement, endpoint/network health, secondary disk capacity, and SQL Server error logs. Removing a replica or forcing failover is not routine log maintenance; follow the availability and data-loss runbook.

### `REPLICATION`

Replication or change data capture has not advanced its log-processing point. Check Log Reader Agent health, distribution database capacity, errors, and latency. Do not remove replication metadata simply to truncate the log.

### `ACTIVE_BACKUP_OR_RESTORE`

A data backup or restore operation is retaining required log. Determine whether it is healthy and progressing. Cancel only when the operational cost and recovery implications are understood.

### `CHECKPOINT`

This can be transient. Observe it across multiple samples and check I/O health. A manual checkpoint may be appropriate after investigating:

```sql
CHECKPOINT;
```

Other values, including database snapshot creation, mirroring, or memory-optimized checkpoint waits, require their feature-specific investigation. Do not map every wait to “take a log backup.”

## Check Whether Growth Was Expected

Even when truncation works, the active log must be large enough for the largest operation between reuse points. Index builds, bulk loads, large deletes, long transactions, and availability lag can require substantial space. A file that grows to 200 GB during every maintenance window probably needs to remain near that size or the operation needs redesign; repeated shrink-and-grow cycles add overhead and risk another disk-full incident.

Inspect recent autogrowth events through an intentional Extended Events/monitoring pipeline. The deprecated default trace may contain historical growth events where it remains enabled, but do not build new monitoring on it. Correlate growth with job history and workload. Review virtual log file layout:

```sql
SELECT
    file_id,
    vlf_sequence_number,
    vlf_size_mb,
    vlf_active
FROM sys.dm_db_log_info(DB_ID())
ORDER BY file_id, vlf_begin_offset;
```

SQL Server's VLF creation algorithm varies by version and growth size. Use sensible pre-sizing and fixed-megabyte growth rather than trying to manufacture a particular VLF count from an obsolete formula.

## Stabilize Capacity

After resolving the reuse wait:

1. pre-size the log for the measured peak plus operational headroom;
2. use a fixed-megabyte autogrowth increment large enough to avoid frequent growth;
3. keep autogrowth enabled as a safety net and alert on every event;
4. alert on both used percentage and remaining volume capacity;
5. ensure the log-backup frequency meets the RPO and normal reuse needs.

Example configuration values must come from the workload:

```sql
ALTER DATABASE Sales MODIFY FILE
(
    NAME = N'Sales_log',
    SIZE = 65536MB,
    FILEGROWTH = 1024MB
);
```

Adding a second log file does not stripe normal log writes or improve throughput; SQL Server uses log files sequentially. An additional file on another volume can be a temporary capacity escape hatch, but the final layout should be deliberately remediated.

## Shrink Only After an Exceptional Event

Shrink when a one-time operation caused abnormal growth, the cause is fixed, the reclaimed capacity is genuinely needed, and the target steady-state size is known. First make space reusable through the correct checkpoint or log-backup behavior. Then shrink the **named log file** to a planned target:

```sql
USE Sales;
GO
DBCC SHRINKFILE (N'Sales_log', 65536);
```

The target is megabytes and is only an example. SQL Server cannot remove active VLFs or free space that is not at the end of the file, so the operation may not reach the target immediately. Never loop shrink continuously. Afterward, verify the resulting size, set the intended growth increment, run a log backup if required by the recovery model, and verify the next backup/restore drill.

Do not switch to simple recovery merely to shrink a log. Switching recovery models changes recovery capability and can break the log backup chain; returning to full recovery requires establishing a new chain with a full or differential database backup. That is a business recovery-policy change, not a disk-space trick.

## Official Documentation

- [The transaction log](https://learn.microsoft.com/en-us/sql/relational-databases/logs/the-transaction-log-sql-server?view=sql-server-ver17)
- [Troubleshoot a full transaction log (error 9002)](https://learn.microsoft.com/en-us/sql/relational-databases/logs/troubleshoot-a-full-transaction-log-sql-server-error-9002?view=sql-server-ver17)
- [Manage the size of the transaction log file](https://learn.microsoft.com/en-us/sql/relational-databases/logs/manage-the-size-of-the-transaction-log-file?view=sql-server-ver17)
- [sys.dm_db_log_info](https://learn.microsoft.com/en-us/sql/relational-databases/system-dynamic-management-views/sys-dm-db-log-info-transact-sql?view=sql-server-ver17)
- [DBCC SHRINKFILE](https://learn.microsoft.com/en-us/sql/t-sql/database-console-commands/dbcc-shrinkfile-transact-sql?view=sql-server-ver17)
