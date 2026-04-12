# How to Understand InnoDB Redo Log Archiving in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, InnoDB, Redo Log, Backup, Recovery

Description: Learn how InnoDB redo log archiving works in MySQL 8.0.17+ and how to use it to enable consistent hot backups without stalling the database.

---

## What Is Redo Log Archiving?

InnoDB redo log archiving is a feature introduced in MySQL 8.0.17 that allows backup tools to copy redo log records as they are written, preventing the backup from failing when redo log files are overwritten before the backup completes.

Without redo log archiving, a backup tool (like MySQL Enterprise Backup or XtraBackup) that takes a long time may miss redo log records that have already been recycled. Redo log archiving solves this by writing redo log records to an archive file during the backup window.

## How Redo Log Archiving Works

When archiving is activated, InnoDB writes redo log records to both the normal redo log files and a separate archive file in a designated directory. The backup tool reads from the archive file to ensure it captures all changes since the backup started, even if the redo log has wrapped multiple times.

## Prerequisites

You must set the `innodb_redo_log_archive_dirs` variable to specify one or more labeled directories where archive files can be created:

```ini
[mysqld]
innodb_redo_log_archive_dirs = backup_dir:/var/mysql/redo-archive
```

Multiple labeled directories can be specified separated by semicolons:

```ini
innodb_redo_log_archive_dirs = local:/var/mysql/redo-archive;nfs:/mnt/nfs/redo-archive
```

Verify the setting:

```sql
SHOW VARIABLES LIKE 'innodb_redo_log_archive_dirs';
```

## Starting Redo Log Archiving

To start archiving, call the built-in function using the label defined in `innodb_redo_log_archive_dirs`:

```sql
SELECT innodb_redo_log_archive_start('backup_dir', 'my-backup-session');
```

The second argument is an optional subdirectory name appended to the archive directory path. MySQL creates a file within that subdirectory with a name like:

```text
/var/mysql/redo-archive/my-backup-session/archive.<server_uuid>.000001.log
```

## Stopping Redo Log Archiving

After your backup is complete, stop archiving:

```sql
SELECT innodb_redo_log_archive_stop();
```

If the session that started archiving disconnects without calling stop, MySQL automatically halts archiving to prevent unbounded disk growth.

## Monitoring Archive Status

Check whether archiving is active:

```sql
SELECT VARIABLE_NAME, VARIABLE_VALUE
FROM performance_schema.global_status
WHERE VARIABLE_NAME LIKE 'Innodb_redo_log%';
```

You can also monitor archive file growth:

```bash
ls -lh /var/mysql/redo-archive/
```

## Integrating with XtraBackup

Percona XtraBackup 8.0 supports redo log archiving natively. When you use `--backup` mode, XtraBackup can activate redo log archiving to avoid "redo log has overflowed" errors on busy servers:

```bash
xtrabackup --backup \
  --target-dir=/backup/full \
  --redo-log-arch-dir=/var/mysql/redo-archive \
  --user=backup_user \
  --password=secret
```

## Cleaning Up Archive Files

Archive files are not automatically deleted. After a successful backup, remove old archive files:

```bash
find /var/mysql/redo-archive -name "*.archive.log" -mtime +1 -delete
```

Ensure you only delete archive files from completed backup sessions - never delete an archive file while a backup is still in progress.

## Key Limitations

- Redo log archiving requires the `INNODB_REDO_LOG_ARCHIVE` privilege to start and stop.
- Only one archiving session can be active at a time.
- The archive directory must be accessible and have sufficient space - a busy server can write several GB per hour to the archive.

## Summary

InnoDB redo log archiving enables consistent hot backups on busy MySQL 8.0.17+ servers by capturing redo log records to an archive file during the backup window. Configure `innodb_redo_log_archive_dirs`, start archiving with `innodb_redo_log_archive_start()`, run your backup, then stop with `innodb_redo_log_archive_stop()`. Always clean up archive files after successful backups to prevent disk exhaustion.
