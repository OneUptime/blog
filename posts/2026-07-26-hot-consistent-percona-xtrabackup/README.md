# How to Take a Hot, Consistent Percona Server Backup with XtraBackup

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Percona Server, Percona XtraBackup, MySQL, Backup, Disaster Recovery

Description: Create, prepare, restore-test, and retain a hot physical Percona Server backup without confusing a successful copy with a recoverable backup.

---

Percona XtraBackup can copy InnoDB data files while Percona Server continues serving reads and writes. It follows the changing redo log during the copy, records a consistent synchronization point, and later uses redo and undo during `--prepare` to make the copied files usable.

"Hot" does not mean "no coordination at all." XtraBackup uses backup locks where supported to protect metadata and non-InnoDB files. DML against InnoDB can normally continue, but DDL and writes to other storage engines may wait. Schedule and monitor the job accordingly.

This guide uses Percona Server and Percona XtraBackup 8.4. XtraBackup 8.4 only supports databases created by the 8.4 series or later, and the prepare binary must be compatible with the backup. Do not assume a binary from another major series can prepare it.

## Prepare the Backup Identity and Storage

Keep database credentials out of process listings by using a MySQL login path or a protected option file. A typical backup identity needs privileges appropriate to the chosen options, commonly:

```sql
CREATE USER 'xtrabackup'@'localhost'
  IDENTIFIED BY 'use-a-secret-manager';

GRANT BACKUP_ADMIN, PROCESS, RELOAD, LOCK TABLES, REPLICATION CLIENT
ON *.* TO 'xtrabackup'@'localhost';
```

Use `--check-privileges` in the actual job so missing mandatory privileges fail early. The operating-system account is separate from the MySQL account: it must be able to traverse and read the server data paths and write the target directory.

Preflight the destination:

```bash
df -h /srv/backups
df -i /srv/backups
xtrabackup --version
mysql --login-path=backup -e \
  "SELECT VERSION(), @@datadir, @@log_bin, @@server_uuid;"
```

Use a new, empty target directory for every run. XtraBackup does not overwrite existing backup files.

## Take the Hot Full Backup

```bash
xtrabackup \
  --backup \
  --target-dir=/srv/backups/2026-07-26T020000Z \
  --login-path=backup \
  --check-privileges \
  --parallel=4 \
  2> /var/log/xtrabackup-2026-07-26T020000Z.log
```

Success requires all of the following:

- the process exits with status `0`;
- the log ends with `completed OK!`;
- the target contains `xtrabackup_checkpoints`, `xtrabackup_info`, and `xtrabackup_logfile`;
- when binary logging is enabled, `xtrabackup_binlog_info` contains the recovery coordinate;
- storage monitoring shows no I/O errors or exhaustion.

Inspect the metadata:

```bash
sed -n '1,120p' /srv/backups/2026-07-26T020000Z/xtrabackup_checkpoints
sed -n '1,160p' /srv/backups/2026-07-26T020000Z/xtrabackup_info
test -s /srv/backups/2026-07-26T020000Z/xtrabackup_logfile
```

Expect `backup_type = full-backuped` before preparation. Preserve the complete directory, not just `.ibd` files. Tablespaces outside the main data directory, keyring material, and encryption configuration need special handling described in the XtraBackup encryption documentation.

## Prepare a Working Copy

Files copied at different instants are not yet a consistent data directory. Run `--prepare` to apply redo and roll back incomplete transactions:

```bash
xtrabackup \
  --prepare \
  --target-dir=/srv/backups/2026-07-26T020000Z \
  --parallel=4 \
  2> /var/log/xtrabackup-prepare-2026-07-26T020000Z.log
```

Do not interrupt preparation. Percona warns that an interrupted prepare can leave the backup unusable.

For a standalone full restore, do **not** add `--apply-log-only`; that option deliberately skips the rollback stage and is for a base that will receive incremental backups. A completed standalone prepare should again end with `completed OK!`.

As of Percona XtraBackup 8.4.0-6, `--check-tables` can add InnoDB B-tree structural validation after redo application:

```bash
xtrabackup \
  --prepare \
  --check-tables \
  --target-dir=/srv/backups/restore-test-copy
```

Because preparation modifies the backup directory, many teams keep an immutable original and prepare a verified copy. This also protects against operator error during restore testing.

## Prove It by Restoring Elsewhere

A prepared directory is still only a backup candidate. The meaningful test is to boot an isolated Percona Server from it.

On a disposable restore host with the database stopped and an empty data directory:

```bash
xtrabackup \
  --copy-back \
  --datadir=/var/lib/mysql \
  --target-dir=/srv/restore-test/backup

chown -R mysql:mysql /var/lib/mysql
```

Start the test instance with no access to production clients or replication peers. Confirm:

```sql
SELECT VERSION(), @@server_uuid, @@read_only;
CHECK TABLE app.orders, app.customers;
SELECT COUNT(*), MAX(updated_at) FROM app.orders;
```

Use application-specific invariants as well: recent business IDs, totals, foreign-key expectations, and a rollback-only write smoke test. A `CHECK TABLE` result alone does not demonstrate that the recovery point or application state is correct.

## Watch Production Impact

During the backup, graph:

- host and data-volume read latency and queue depth;
- redo generation versus XtraBackup's log-copy progress;
- DDL sessions waiting for a backup or metadata lock;
- query latency and replica lag;
- backup throughput, free space, and job duration.

XtraBackup's redo-copy thread can fail if redo is generated and overwritten faster than it can be copied. Faster storage, a quieter window, or appropriate redo capacity is preferable to ignoring the error. `--parallel` can increase throughput, but it can also saturate the same disks serving production.

Avoid `--no-lock` as a general performance shortcut. Percona documents it only for narrow cases: all relevant tables must be InnoDB, binary-log coordinates must not matter, and concurrent DDL must not occur. Backup locks are the safer default.

## Retain the Recovery Chain, Not Just the Snapshot

For point-in-time recovery, retain binary logs beginning at the position recorded in `xtrabackup_binlog_info`. Copying a snapshot to object storage while purging its required binary logs leaves a much weaker recovery point.

Record in the backup catalog:

- start and completion time in UTC;
- source UUID and exact server/XtraBackup versions;
- full or incremental lineage;
- checksums and object locations;
- binlog or GTID coordinate;
- encryption/key reference;
- prepare result and most recent restore-test result;
- expiry time for the snapshot and its dependent logs.

Apply encryption, immutability, off-site retention, and access controls according to the data's sensitivity. Test restores on a schedule and measure restore time at production scale. A hot backup is valuable because the source stays available; it is trustworthy only after preparation and an isolated restore.

## Official Documentation

- [Percona XtraBackup 8.4 quickstart and version requirements](https://docs.percona.com/percona-xtrabackup/8.4/quickstart-overview.html)
- [Create a full backup](https://docs.percona.com/percona-xtrabackup/8.4/create-full-backup.html)
- [How Percona XtraBackup works](https://docs.percona.com/percona-xtrabackup/8.4/how-xtrabackup-works.html)
- [Prepare a full backup](https://docs.percona.com/percona-xtrabackup/8.4/prepare-full-backup.html)
- [Restore a backup](https://docs.percona.com/percona-xtrabackup/8.4/restore-a-backup.html)
- [XtraBackup command-line options](https://docs.percona.com/percona-xtrabackup/8.4/xtrabackup-option-reference.html)
