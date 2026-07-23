# DBCC CHECKDB Found Corruption: A Safe SQL Server Recovery Playbook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SQL Server, DBCC CHECKDB, Corruption, Disaster Recovery, Database Integrity

Description: Preserve evidence, fix the failing I/O path, prefer a known-good restore, and use DBCC repair only as a documented last resort.

---

When `DBCC CHECKDB` reports permanent consistency errors, Microsoft's preferred recovery is to restore from a known-good backup. `REPAIR_ALLOW_DATA_LOSS` is not a faster equivalent: it can deallocate damaged pages or rows, leave business data logically inconsistent, and still fail to repair every error.

Treat corruption as both a database recovery incident and an infrastructure incident. Recovering onto the same failing I/O path can corrupt the restored copy again.

## 1. Preserve the First Evidence

Capture the complete `DBCC CHECKDB` output, SQL Server error log, Windows/Linux system logs, storage logs, database state, SQL Server build, recent changes, and the exact time symptoms began. Do not reduce the incident to the final “minimum repair level” line; earlier messages identify objects, indexes, pages, and error types.

Query recorded suspect pages:

```sql
SELECT
    database_id,
    file_id,
    page_id,
    event_type,
    error_count,
    last_update_date
FROM msdb.dbo.suspect_pages
WHERE database_id = DB_ID(N'Sales')
ORDER BY last_update_date DESC;
```

Preserve current backup files, logs, keys, and the original damaged database files according to the incident plan. Avoid detach/attach, deleting the log, rebuilding a log, or running repair before a recoverable copy and evidence exist.

If the database remains writable, decide whether to stop application writes to prevent further inconsistency and preserve a stable recovery boundary. That is an incident-owner decision; abruptly taking a critical database offline can also cause harm.

## 2. Determine Whether the Error Is Persistent

Run a complete integrity check in an environment where its resource and blocking impact is acceptable:

```sql
DBCC CHECKDB (N'Sales')
WITH NO_INFOMSGS, ALL_ERRORMSGS;
```

`DBCC CHECKDB` normally creates an internal database snapshot for transactional consistency. If snapshot creation fails, investigate its specific error and use documented alternatives such as an appropriate maintenance window; do not assume the database itself is corrupt. `PHYSICAL_ONLY` is useful for more frequent physical checks but is not a replacement for periodic full logical checks.

Run checks on a restored copy when production load or safety requires it, while recognizing that this validates that restored backup, not pages changed later in the live database. Preserve the first full output before rerunning commands.

## 3. Fix the Underlying System First

Consistency errors can result from storage, filesystem, filter drivers, firmware, controller/cache behavior, memory, virtualization, or SQL Server defects. Investigate SQL Server errors 823, 824, and 825, operating-system I/O events, storage health, controller and SAN logs, multipath/network storage, drivers, firmware, BIOS, and RAM.

Microsoft's guidance is to resolve hardware or system problems before restore or repair. Engage the administrators and vendor responsible for the complete I/O path. Apply supported SQL Server cumulative updates when a relevant known issue exists, but do not label unexplained checksum errors a database-engine bug without evidence.

Check page verification:

```sql
SELECT name, page_verify_option_desc
FROM sys.databases
WHERE name = N'Sales';
```

`PAGE_VERIFY CHECKSUM` helps detect damaged pages when they are read, but enabling it does not retroactively add checksums to every existing page until pages are subsequently written. It detects corruption; it does not repair the I/O path.

## 4. Classify the Recoverable Scope

Use the `CHECKDB` messages and object metadata to decide whether damage is limited to:

- a nonclustered index that can be recreated from known-good base data;
- one or more data pages eligible for page restore;
- a file or filegroup;
- transaction-log structures;
- allocation/system metadata or broad database structures;
- in-memory or feature-specific data that has separate recovery constraints.

Do not drop an index merely because its name appears in one message; confirm whether all reported errors are confined to a recreatable nonclustered structure. Corruption in a clustered index affects the table's base data.

Check every replica and backup independently. An availability-group secondary may have received the same damaged logical change, while some physical page corruption can be local. Failover is not proof of recovery, and automatic page repair does not replace full integrity validation.

## 5. Find a Known-Good Recovery Point

Inventory full, differential, and log backups by headers and LSNs. Restore candidate sequences to clean, isolated storage and run full `DBCC CHECKDB` after recovery. Work backward until finding the newest recovery point that is both structurally consistent and logically acceptable.

If the current log is accessible and the recovery model/scenario permits it, a tail-log backup may preserve transactions after the latest scheduled log backup. A page restore under full recovery-or in the limited bulk-logged scenarios that support it-can repair localized data-page damage while preserving more current data, but it requires an intact backup/log sequence and supported page type. File/filegroup restore can be appropriate for broader file damage.

For a complete restore, keep the target isolated and use new file paths. Restore the full, optional compatible differential, every required log, and the tail, then recover once. Validate:

```sql
DBCC CHECKDB (N'Sales_Recovery')
WITH NO_INFOMSGS, ALL_ERRORMSGS;
```

Then validate schema, constraints, critical totals, business invariants, security mappings, and an isolated application workflow. A clean `CHECKDB` establishes structural consistency, not that every business transaction is correct.

## 6. Prefer Restore Over Repair

Choose the recovery option that meets the business's data-loss and downtime decision:

1. **Restore a known-good database** when broad corruption exists and the backup chain meets the acceptable recovery point.
2. **Page restore** for eligible localized page damage with a valid data-backup/log sequence.
3. **Recreate a nonclustered index** only when base data is verified and all related corruption is confined to that recreatable index.
4. **Export known-good data into a clean database** when backups are unavailable but enough structures remain readable, accepting that dependencies and relationships need intensive validation.
5. **DBCC repair** only when better recovery paths are unavailable and explicit data loss is accepted.

Record why the chosen backup is known good, which changes will be lost, and who authorized that recovery point.

## 7. Use Repair Only on a Preserved Copy

The repair level named by `CHECKDB` is the minimum level capable of attempting all reported repairs. It is not a promise that repair succeeds or that the database retains all data.

- `REPAIR_REBUILD` performs repairs that have no possibility of data loss, such as rebuilding certain nonclustered indexes.
- `REPAIR_ALLOW_DATA_LOSS` can deallocate rows, pages, or structures to restore physical consistency.
- `REPAIR_FAST` is maintained for backward compatibility and performs no repairs.

Repair operations require single-user mode. Ordinary `REPAIR_*` operations are fully logged and can be rolled back when they are run inside a user transaction, so Microsoft recommends reviewing the result before committing. Work on a copy after fixing the underlying system, with all original files and backups preserved. A representative last-resort sequence is intentionally incomplete until the incident owner substitutes the exact preserved copy and approved option:

```sql
ALTER DATABASE Sales_RepairCopy SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
GO
BEGIN TRANSACTION;
DBCC CHECKDB (N'Sales_RepairCopy', REPAIR_ALLOW_DATA_LOSS)
WITH ALL_ERRORMSGS;
```

Pause in the same session, review the complete repair output and affected data, and then execute exactly one of `COMMIT TRANSACTION` or `ROLLBACK TRANSACTION`. Only after that transaction is resolved should you return the database to multi-user mode:

```sql
ALTER DATABASE Sales_RepairCopy SET MULTI_USER;
```

`ROLLBACK IMMEDIATE` in the first statement terminates other connections and rolls back their transactions; it is separate from the transaction protecting the repair. Never run this template against the production name by substitution without explicit authorization and target verification.

Emergency-mode repair can attempt special recovery, including log reconstruction in some cases, but it cannot run inside a user transaction and be rolled back after execution. It is a last-resort operation with no transactional or business-consistency guarantee. Escalate to Microsoft support and preserve forensic copies before considering it.

Microsoft notes that repair may reveal additional broken relationships and might need more than one pass. Record every pass and its output. Repeatedly running repair until the message disappears does not prove the remaining data is correct.

## 8. Validate After Any Repair or Data Salvage

After structural checks pass:

- run `DBCC CHECKCONSTRAINTS` and application-specific reconciliation;
- compare critical aggregates and row counts with independent systems;
- review every object/page reported in the original output;
- test foreign keys, unique business rules, and workflow transitions;
- rebuild only the indexes/statistics justified by the recovery work;
- take a new full backup with checksums and restore-test it;
- reset the backup/HA runbook around the newly recovered database;
- monitor the repaired I/O path for recurring 823/824/825 errors.

Any `REPAIR_ALLOW_DATA_LOSS` database should be treated as salvaged, not automatically production-ready. When practical, move validated data into a clean database rather than trusting an extensively repaired structure indefinitely.

## 9. Close the Recovery Gap

The post-incident action list should include root cause, affected pages/objects, earliest detection time, why monitoring did or did not alert, newest verified recovery point, measured RPO/RTO, media/key gaps, and the next restore drill. Schedule `DBCC CHECKDB` often enough that corruption is discovered while a known-good backup remains inside retention.

The safest playbook is determined before corruption: checksummed backups, independent media, retained keys, recurring integrity checks, tested page/full restores, and named authority for accepting data loss.

## Official Documentation

- [Troubleshoot database consistency errors reported by DBCC CHECKDB](https://learn.microsoft.com/en-us/troubleshoot/sql/database-engine/database-file-operations/troubleshoot-dbcc-checkdb-errors)
- [DBCC CHECKDB](https://learn.microsoft.com/en-us/sql/t-sql/database-console-commands/dbcc-checkdb-transact-sql?view=sql-server-ver17)
- [Manage the suspect_pages table](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/manage-the-suspect-pages-table-sql-server?view=sql-server-ver17)
- [Restore pages](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/restore-pages-sql-server?view=sql-server-ver17)
- [MSSQLSERVER error 824](https://learn.microsoft.com/en-us/sql/relational-databases/errors-events/mssqlserver-824-database-engine-error?view=sql-server-ver17)
