# Fixing “The Differential Backup Cannot Be Restored” in SQL Server

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SQL Server, Differential Backup, Restore Error, LSN, Troubleshooting

Description: Diagnose a SQL Server differential restore failure by identifying the exact base, restore state, backup-set position, and file-level dependencies.

---

When SQL Server says a differential backup cannot be restored because the database was not restored to the correct earlier state, the usual cause is a base mismatch: the full backup underneath the target is not the full that the differential references. Another common cause is that the full was restored with `RECOVERY`, so the database can no longer accept the differential.

Do not bypass the message. It prevents SQL Server from combining incompatible database states.

## Preserve Evidence First

Leave the failed target alone while you inspect media. Do not overwrite the source database, delete candidate backups, or repeatedly restore guessed files. If the incident involves the production database under full or bulk-logged recovery, determine whether a tail-log backup is needed and possible before any destructive restore.

Copy headers and storage metadata into the incident record. One physical file can contain several backup sets, and a striped backup can require several files.

## Confirm the Backup Type and Position

```sql
RESTORE HEADERONLY
FROM DISK = 'E:\Restore\Sales_diff.bak';
```

Find the intended row and record:

- `Position`, used as `WITH FILE = n`;
- `BackupType` 5 or `BackupTypeDescription` `DATABASE DIFFERENTIAL`;
- database name and creation date;
- `DifferentialBaseLSN` and `DifferentialBaseGUID`;
- `DatabaseBackupLSN`, `FirstLSN`, and `LastLSN`;
- `IsCopyOnly` and `HasBackupChecksums` status.

`RESTORE HEADERONLY` without `FILE` returns all backup sets on the specified media. `RESTORE DATABASE` defaults to `FILE = 1`, so omitting it can select a different set from multi-set media. A filename ending in `_diff.bak` does not prove the selected set is a differential.

## Find the Exact Base

Run `RESTORE HEADERONLY` on every candidate full. For a conventional single-based differential, Microsoft documents that the differential's `DifferentialBaseLSN` equals the `FirstLSN` of its base. Match the differential's `DifferentialBaseGUID` to the candidate full's `BackupSetGUID`, plus database identity and backup type.

A newer copy-only full is not the base because copy-only fulls cannot establish one. An unscheduled normal full can become the base, even if another backup product expected the scheduled weekly full to remain in use.

Use `msdb.dbo.backupset` to search when its history is available:

```sql
SELECT backup_start_date, type, first_lsn, backup_set_uuid, database_backup_lsn,
       differential_base_lsn, differential_base_guid, is_copy_only
FROM msdb.dbo.backupset
WHERE database_name = N'Sales'
ORDER BY backup_finish_date DESC;
```

Match the differential row's `differential_base_guid` to the full row's `backup_set_uuid`. Treat `msdb` as an index, then verify the media header. Its history may be incomplete or may not reflect files copied from another server.

## Restart With `NORECOVERY`

Once you find the base, restart the restore sequence:

```sql
RESTORE DATABASE Sales_Test
FROM DISK = 'E:\Restore\Sales_matching_full.bak'
WITH FILE = 1,
     MOVE 'Sales_Data' TO 'F:\SQLData\Sales_Test.mdf',
     MOVE 'Sales_Log'  TO 'G:\SQLLog\Sales_Test.ldf',
     NORECOVERY, CHECKSUM;

RESTORE DATABASE Sales_Test
FROM DISK = 'E:\Restore\Sales_diff.bak'
WITH FILE = 2, RECOVERY, CHECKSUM;
```

Use the positions returned for your media; the example intentionally shows that the differential might be set 2. The explicit `CHECKSUM` options require `HasBackupChecksums = 1`; SQL Server fails the restore if a backup lacks backup checksums. Without an explicit checksum option, `RESTORE` verifies checksums when present and proceeds without checksum verification when they are absent. If transaction log backups follow, restore the differential with `NORECOVERY` and recover only after the final log.

If the database is already `ONLINE`, it was recovered. SQL Server does not let you return that restored database to the middle of the same sequence. Start again from the full.

## Check Less Common Causes

**Multi-based differential.** File and partial backup strategies can use different bases per file. Database-level base fields can be null. Inspect `RESTORE FILELISTONLY` and follow a valid file or piecemeal sequence.

**Wrong database identity.** A database can be dropped and recreated with the same name. Compare creation date, backup metadata, and family identifiers rather than name alone.

**Missing stripe.** If the backup was striped across multiple devices, supply every media family in the `FROM` clause.

**Newer SQL Server version.** A backup created by a newer SQL Server cannot be restored to an older engine.

**TDE protector missing.** An encrypted database backup requires the certificate or asymmetric key and private key on the destination before restore. This typically produces a certificate-specific error, but it belongs in the same preflight check.

**Damaged media.** `WITH CHECKSUM` can surface checksum errors when checksums exist. Do not normalize `CONTINUE_AFTER_ERROR`; select another valid recovery chain or escalate a deliberate salvage decision.

## If the Base Is Gone

The differential cannot be rebased onto a different full. Choose another complete recovery path:

- an older full plus its matching differential;
- a newer full;
- a suitable full plus a continuous transaction-log sequence;
- another validated snapshot, replica, or backup-system recovery point.

Record why the base disappeared. Fix retention so a full cannot expire while dependent differentials remain, and use copy-only for ad hoc fulls that should not redirect the chain.

## Prevent the Next Incident

Export header metadata into a durable catalog and generate restore plans from LSN/GUID relationships. Preserve exact numeric LSN values. Test a late-cycle differential restore regularly, including storage retrieval, keys, `DBCC CHECKDB`, and application checks.

`RESTORE VERIFYONLY` is a useful media check but does not prove the base and differential can be recovered into a healthy, usable database. The preventive control is an actual automated restore.

## Official Documentation

- [Restore a differential SQL Server database backup](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/restore-a-differential-database-backup-sql-server?view=sql-server-ver17)
- [RESTORE HEADERONLY reference](https://learn.microsoft.com/en-us/sql/t-sql/statements/restore-statements-headeronly-transact-sql?view=sql-server-ver17)
- [RESTORE FILELISTONLY reference](https://learn.microsoft.com/en-us/sql/t-sql/statements/restore-statements-filelistonly-transact-sql?view=sql-server-ver17)
- [Microsoft SQL Server differential backups](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/differential-backups-sql-server?view=sql-server-ver17)
- [Microsoft SQL Server copy-only backups](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/copy-only-backups-sql-server?view=sql-server-ver17)
