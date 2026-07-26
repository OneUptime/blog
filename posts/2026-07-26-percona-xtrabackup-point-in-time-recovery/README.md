# How to Perform Point-in-Time Recovery with Percona XtraBackup and Binary Logs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Percona XtraBackup, Percona Server, Point-in-Time Recovery, Binary Log, MySQL

Description: Restore a physical XtraBackup baseline and replay an unbroken binary-log sequence to a tested timestamp or transaction boundary.

---

Point-in-time recovery (PITR) has two layers:

1. a prepared XtraBackup restores a consistent physical baseline; and
2. `mysqlbinlog` replays every required change after that baseline until the chosen stop boundary.

The snapshot alone can only return to backup time. Binary logs alone cannot reconstruct tables that predate their retention. Your recovery policy must retain both as one chain.

## Establish the Recovery Boundary

Identify the incident in UTC and choose a stop point immediately before the harmful transaction. A timestamp is convenient but can be ambiguous when many transactions occur in the same second. A binary-log position or GTID boundary is more precise when it is known.

Preserve evidence before starting:

- the source binary logs and index;
- the backup directory and its checksums;
- application and audit logs that identify the bad transaction;
- the source server UUID, time zone, and exact server version.

Do the first recovery on an isolated server. Do not replay experimentally into production.

## Verify and Prepare the Baseline

Inspect the XtraBackup metadata:

```bash
cat /backup/2026-07-26/xtrabackup_binlog_info
sed -n '1,160p' /backup/2026-07-26/xtrabackup_info
```

With binary logging enabled, `xtrabackup_binlog_info` records the binary-log file and position corresponding to the backup. That coordinate is the starting point for replay.

Prepare a working copy:

```bash
xtrabackup \
  --prepare \
  --target-dir=/restore-work/2026-07-26
```

Require a zero exit status and `completed OK!`. If incrementals are involved, merge the complete LSN chain first; PITR begins from the final prepared physical state.

Restore to an empty datadir on the isolated target:

```bash
systemctl stop mysql

xtrabackup \
  --copy-back \
  --datadir=/var/lib/mysql \
  --target-dir=/restore-work/2026-07-26

chown -R mysql:mysql /var/lib/mysql
systemctl start mysql
```

Keep applications, schedulers, event consumers, and replication stopped. New writes would make validation and repeatability much harder.

## Build One Continuous Binlog Stream

Suppose the coordinate file says:

```text
binlog.000217  684
```

You need byte position 684 onward from that file and every subsequent binary log in order. Confirm the files exist:

```bash
mysqlbinlog --verify-binlog-checksum /archive/binlog.000217 >/dev/null
mysqlbinlog --verify-binlog-checksum /archive/binlog.000218 >/dev/null
mysqlbinlog --verify-binlog-checksum /archive/binlog.000219 >/dev/null
```

Inspect a narrow window before replay:

```bash
mysqlbinlog \
  --base64-output=DECODE-ROWS \
  --verbose \
  --start-position=684 \
  /archive/binlog.000217 \
  /archive/binlog.000218 \
  /archive/binlog.000219 \
  > /restore-work/review.sql
```

Pass all files to a single `mysqlbinlog` process. Starting a separate process for every file while reusing the original start position is an easy way to skip or misinterpret events.

For row-based logging, decoded output is useful for human inspection, but replay should use the normal executable stream rather than an edited verbose rendering.

## Replay to a Timestamp

After confirming the event time and server time-zone assumptions, replay:

```bash
mysqlbinlog \
  --start-position=684 \
  --stop-datetime='2026-07-26 14:37:20' \
  /archive/binlog.000217 \
  /archive/binlog.000218 \
  /archive/binlog.000219 \
| mysql --login-path=recovery
```

`--start-position` applies to the first input log. `--stop-datetime` stops before the first event whose timestamp is at or after the supplied value. Test this behavior with your exact incident and binary logs; timestamps describe events, not necessarily the business time shown in an application UI.

Do not add `--force` to push through SQL errors. A duplicate-key or missing-object error can mean the replay began at the wrong coordinate, a log is missing, the wrong backup was restored, or external writes reached the target.

## Prefer a Position or GTID Boundary When Available

If inspection locates the exact offending transaction, note its start/end log positions and stop before it:

```bash
mysqlbinlog \
  --start-position=684 \
  --stop-position=932144 \
  /archive/binlog.000217 \
| mysql --login-path=recovery
```

Position options apply to the named file context, so plan carefully when the stop lies in a later file. A safe approach is to replay complete intermediate files, then run a final command with the stop position for the last file.

GTID-aware recovery can use included or excluded GTID sets, but do not improvise GTID filtering during an incident. Record the backup's GTID metadata, rehearse the exact `mysqlbinlog` options used by your environment, and verify `@@GLOBAL.gtid_executed` after replay.

## Validate the Recovered State

Before accepting the target:

```sql
SELECT @@server_uuid, @@global.gtid_executed, @@read_only;
SELECT MAX(updated_at), COUNT(*) FROM app.orders;
```

Then verify:

- the unwanted change is absent;
- transactions immediately before it are present;
- critical business totals and referential invariants hold;
- user accounts, scheduled events, and application configuration are correct;
- no unexpected errors occurred in the replay client or server log.

Use application owners to validate business state. Database consistency cannot tell you whether the chosen second was the correct business recovery point.

## Plan the Production Cutover

Once the isolated recovery is accepted, choose a controlled replacement strategy. Usually this means blocking production writes, taking final evidence, switching clients to the recovered instance, and starting a new backup/binlog retention chain.

Do not merge later "good" transactions by simply resuming the old binlog after skipping one bad statement. Transactions can have dependencies, and manually editing a row-based log is unsafe. If the business needs selected post-incident transactions, define a separate logical reconciliation process and validate it explicitly.

Continuously test that:

- binary logs survive longer than the oldest retained XtraBackup that may need them;
- every file is archived before source purge;
- encrypted logs and backups have recoverable keys;
- restore plus replay finishes inside the RTO;
- runbooks use UTC and record exact positions/GTIDs.

PITR is an end-to-end retention and rehearsal capability, not a command discovered during the outage.

## Official Documentation

- [Percona XtraBackup point-in-time recovery](https://docs.percona.com/percona-xtrabackup/8.0/point-in-time-recovery.html)
- [Percona XtraBackup and binary logs](https://docs.percona.com/percona-xtrabackup/8.0/working-with-binary-logs.html)
- [XtraBackup generated files](https://docs.percona.com/percona-xtrabackup/8.4/generated-files.html)
- [MySQL 8.4 mysqlbinlog utility](https://dev.mysql.com/doc/refman/8.4/en/mysqlbinlog.html)
- [MySQL 8.4 point-in-time recovery using binary logs](https://dev.mysql.com/doc/refman/8.4/en/point-in-time-recovery-binlog.html)
