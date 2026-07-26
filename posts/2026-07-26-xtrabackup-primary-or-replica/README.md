# Should You Run XtraBackup on the Primary or a Dedicated Percona Replica?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Percona XtraBackup, Percona Server, MySQL Replication, Backup, Capacity Planning

Description: Choose a primary or dedicated replica as the XtraBackup source by balancing recovery freshness, production I/O, replication correctness, and failure independence.

---

A dedicated backup replica is usually the better production source, but only if it is continuously proven to be a faithful, recoverable copy. Moving XtraBackup away from the primary reduces read I/O and backup-lock impact on the write endpoint; it does not transfer correctness automatically.

The choice is a risk allocation:

| Source | Strength | Main risk |
| --- | --- | --- |
| Primary | Freshest authoritative data and simplest coordinates | Backup I/O and locking affect the write service |
| Dedicated replica | Isolates most backup load and permits aggressive scheduling | Lag, replication errors, or divergent data can enter the backup |

## When the Primary Is the Right Source

Back up the primary when:

- the database is small enough that measured backup impact is negligible;
- a replica is not available or is less trustworthy than the primary;
- the recovery point must match the authoritative writer as closely as possible;
- non-InnoDB state or topology-specific metadata is simpler to capture there;
- operational simplicity is more valuable than workload isolation.

XtraBackup copies data files and follows redo while the server remains online. It can use backup locks rather than a long global read lock, but it still reads the full dataset, consumes CPU, and competes for storage bandwidth. DDL can wait for the backup lock, and XtraBackup can fail if redo generation outruns its log-copy thread.

Measure a full backup at production write rate before accepting this design. Watch database read latency, redo rate, query latency, DDL waits, and host I/O queue depth.

## When a Dedicated Replica Is Better

A replica is attractive for a large or busy primary because backup reads happen on separate CPU, memory, and disks. It can also be sized and scheduled specifically for backup, restore rehearsal, checksum work, and archival transfer.

Make it **dedicated**. A replica serving bursty analytics may be least able to complete a predictable backup. Do not let backup concurrency, ad hoc queries, and replication apply compete without capacity limits.

Before each run, establish these gates:

```sql
SHOW REPLICA STATUS\G
```

Require:

- receiver and applier threads running;
- no receiver or applier error;
- an acceptable retrieved-versus-executed GTID gap;
- replication delay below the backup RPO;
- no intentional filters that omit required data;
- source UUID and channel identity matching the expected topology;
- no local application writes.

`Seconds_Behind_Source` is a useful signal but not a proof of equality. A stopped SQL thread, multi-threaded apply state, delayed replication, or clock behavior can make one number misleading. Regularly validate replica consistency; Percona's replication-backup documentation recommends confirming that it is a true copy, for example with `pt-table-checksum`.

## Use Replica-Aware XtraBackup Options Deliberately

For a replica backup, Percona documents `--safe-slave-backup` and `--slave-info` (the option names retain the older terminology).

```bash
xtrabackup \
  --backup \
  --target-dir=/backup/2026-07-26T020000Z \
  --login-path=backup \
  --safe-slave-backup \
  --safe-slave-backup-timeout=600 \
  --slave-info
```

`--safe-slave-backup` stops the replication SQL thread and waits until `Slave_open_temp_tables` is zero. This avoids capturing problematic replica temporary-table state. XtraBackup restarts the SQL thread when the backup finishes; alert separately if replication is not running afterward.

`--slave-info` writes source coordinates to `xtrabackup_slave_info`, which can help provision another replica. On GTID-managed deployments, catalog the GTID state too and validate the recovered node's intended role before starting replication.

Percona recommends `--safe-slave-backup` when backing up a replica. Its timeout should fail the job rather than leave it waiting indefinitely while the recovery point grows stale.

## Account for the Lag Introduced by the Backup

Stopping apply creates a lag window, and heavy backup reads may slow apply even after it resumes. Record:

```sql
SELECT NOW(6), @@server_uuid, @@global.gtid_executed;
SHOW GLOBAL STATUS LIKE 'Slave_open_temp_tables';
```

Run the same replication health gate after backup. A successful `xtrabackup` exit with a broken replica is an operational failure.

If the replica cannot stay inside the RPO during a full backup:

- improve its storage or CPU;
- reduce XtraBackup parallelism;
- schedule during a quieter period;
- use a longer incremental strategy with periodic fulls;
- add another replica rather than weakening correctness checks.

Do not hide the symptom by accepting unlimited lag.

## Preserve Failure Independence

A replica on the same host, storage array, availability zone, or administrative blast radius as the primary is not an independent backup source. Likewise, a backup that remains only on the replica's local disk is not protected from host loss.

After creation:

1. transfer the complete backup to separate, access-controlled storage;
2. verify checksums and metadata;
3. prepare a working copy;
4. boot an isolated restore;
5. retain the binary logs required for PITR;
6. apply immutability and off-site retention.

Continue taking backups even if replication is unhealthy by choosing the primary under a documented fallback policy; do not silently take a backup from a stale replica simply to keep the job green.

## A Sensible Default

For a high-write, multi-terabyte production service, use a dedicated replica when all of these are true:

- it is unfettered by application writes;
- replication correctness and lag are hard preconditions;
- backup I/O is capacity-tested;
- replica apply is verified after the job;
- the resulting backup is copied off-host and restore-tested.

Use the primary when those conditions cannot be met or when its measured backup impact is acceptable. Some teams alternate: frequent replica backups plus less frequent primary backups provide an additional check against replica-specific corruption or filtering.

The best source is not the server with the lowest CPU graph. It is the server that can produce a current, complete, independently retained, and repeatedly restorable recovery point without breaching the production SLO.

## Official Documentation

- [Percona XtraBackup backups in replication environments](https://docs.percona.com/percona-xtrabackup/8.0/make-backup-in-replication-env.html)
- [XtraBackup option reference](https://docs.percona.com/percona-xtrabackup/8.4/xtrabackup-option-reference.html)
- [How Percona XtraBackup works](https://docs.percona.com/percona-xtrabackup/8.4/how-xtrabackup-works.html)
- [XtraBackup generated files](https://docs.percona.com/percona-xtrabackup/8.4/generated-files.html)
- [Percona Toolkit pt-table-checksum](https://docs.percona.com/percona-toolkit/pt-table-checksum.html)
