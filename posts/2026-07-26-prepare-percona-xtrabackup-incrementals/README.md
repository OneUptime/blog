# How to Chain and Prepare Percona XtraBackup Incrementals in the Correct Order

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Percona XtraBackup, Percona Server, Incremental Backup, MySQL, Disaster Recovery

Description: Build and prepare an XtraBackup incremental chain by proving every LSN link and merging deltas into the base in chronological order.

---

An XtraBackup incremental is not an independent restore point. It contains pages whose log sequence numbers changed after a base LSN. Recovery succeeds only when every incremental begins exactly where its parent ended and the deltas are applied to the full base in order.

Suppose the chain is:

```text
/backup/full   from_lsn=0        to_lsn=1000
/backup/inc1   from_lsn=1000     to_lsn=1800
/backup/inc2   from_lsn=1800     to_lsn=2500
```

Preparation modifies `/backup/full`. It never turns `/backup/inc2` into a complete datadir.

## Create an Explicit Chain

Take the full backup:

```bash
xtrabackup \
  --backup \
  --target-dir=/backup/full \
  --login-path=backup
```

Create the first incremental from that directory:

```bash
xtrabackup \
  --backup \
  --target-dir=/backup/inc1 \
  --incremental-basedir=/backup/full \
  --login-path=backup
```

Create the next incremental from `inc1`, not from the original full:

```bash
xtrabackup \
  --backup \
  --target-dir=/backup/inc2 \
  --incremental-basedir=/backup/inc1 \
  --login-path=backup
```

`--incremental-basedir` reads the parent's checkpoint. You can instead use an explicit `--incremental-lsn`, but deriving it from a cataloged directory reduces transcription mistakes. Do not reuse a target directory; XtraBackup does not overwrite existing backup files.

## Prove the LSN Links Before Preparing

Inspect every `xtrabackup_checkpoints`:

```bash
for d in /backup/full /backup/inc1 /backup/inc2; do
  echo "$d"
  grep -E '^(backup_type|from_lsn|to_lsn|last_lsn)' \
    "$d/xtrabackup_checkpoints"
done
```

The invariant is:

```text
full.to_lsn == inc1.from_lsn
inc1.to_lsn == inc2.from_lsn
```

Also verify source identity, server version, timestamps, checksums, and encryption/key references in your backup catalog. Matching names such as `daily-1` and `daily-2` do not prove lineage.

Stop if there is a gap, overlap, missing directory, or mixed source. You cannot repair a missing physical incremental by applying a later one. Select an earlier complete chain or take a new full backup.

## Work on a Copy of the Full Backup

Preparation changes the full backup as deltas are merged. Preserve immutable source media and make a restore working copy:

```text
/restore-work/full
/restore-work/inc1
/restore-work/inc2
```

Percona also warns not to use the same incremental directory to prepare two different copies of a backup. Keep one clean incremental set per rehearsal, or clone the protected source set before each run.

If the backups are compressed or encrypted, perform the documented decrypt/decompress steps before prepare and supply the required keyring configuration. Do not mix those transformations into an improvised chain.

## Apply Redo Without Rolling Back Too Early

Prepare the full base with `--apply-log-only`:

```bash
xtrabackup \
  --prepare \
  --apply-log-only \
  --target-dir=/restore-work/full
```

This applies redo but skips rollback of uncommitted transactions. That skip is essential: a transaction uncommitted at the full backup might commit in a later incremental. If it is rolled back now, subsequent deltas cannot reconstruct the proper state.

Apply every non-final incremental with the same option:

```bash
xtrabackup \
  --prepare \
  --apply-log-only \
  --target-dir=/restore-work/full \
  --incremental-dir=/restore-work/inc1
```

The updated data is in `/restore-work/full`. Check its checkpoint metadata and the command output before continuing.

## Finalize on the Last Incremental

Apply the last incremental without `--apply-log-only`:

```bash
xtrabackup \
  --prepare \
  --target-dir=/restore-work/full \
  --incremental-dir=/restore-work/inc2
```

This final prepare performs the rollback phase and leaves the merged full directory ready for restore. Percona notes that leaving `--apply-log-only` on the last step still produces consistent data, but the server must finish rollback during crash recovery at startup. Finalizing during a controlled prepare produces a cleaner, more predictable restore.

For XtraBackup 8.4.0-3 and later, incremental delta application can use file-level parallelism:

```bash
xtrabackup \
  --prepare \
  --parallel=4 \
  --apply-log-only \
  --target-dir=/restore-work/full \
  --incremental-dir=/restore-work/inc1
```

This helps when there are many `.ibd` files. One very large delta file is still processed by one thread, so raising the value does not guarantee linear speedup.

## Detect a Wrong-Order Prepare

Do not proceed merely because the command printed progress. Capture exit status and require `completed OK!`. Wrong lineage commonly produces an LSN mismatch or an incremental starting at a point different from the current base.

After each merge, record:

- the incremental directory and checksum set;
- its `from_lsn` and `to_lsn`;
- the current base checkpoint;
- XtraBackup version and command line;
- start/end time and exit status;
- log path and final `completed OK!` evidence.

If a prepare fails, do not experiment on the only copy. Discard the working directory, fix the chain or environment, and restart from a clean full and clean incrementals.

## Restore-Test the Final Base

The only restore source after merging is `/restore-work/full`:

```bash
systemctl stop mysql

xtrabackup \
  --copy-back \
  --datadir=/var/lib/mysql \
  --target-dir=/restore-work/full

chown -R mysql:mysql /var/lib/mysql
```

Boot it on an isolated host and validate recovery-point watermarks, critical row counts, grants, encryption, and application invariants. Include the full merge time in the recovery-time objective. A long chain may save backup storage but make a time-critical restore slower and more failure-prone.

Set a maximum chain length and periodically create a new full backup. Retain the full plus every dependent incremental until all restore points that need them expire; deleting `inc1` makes `inc2` unusable even if both the full and `inc2` remain.

## Official Documentation

- [Create an incremental backup](https://docs.percona.com/percona-xtrabackup/8.4/create-incremental-backup.html)
- [Prepare an incremental backup](https://docs.percona.com/percona-xtrabackup/8.4/prepare-incremental-backup.html)
- [Prepare a full backup](https://docs.percona.com/percona-xtrabackup/8.4/prepare-full-backup.html)
- [XtraBackup backup files](https://docs.percona.com/percona-xtrabackup/8.4/generated-files.html)
- [Restore a backup](https://docs.percona.com/percona-xtrabackup/8.4/restore-a-backup.html)
