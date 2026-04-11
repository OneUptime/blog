# How to Restore MySQL NDB Cluster from a Backup

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, NDB Cluster, Restore, Recovery, ndb_restore

Description: Learn how to restore MySQL NDB Cluster data from a native backup using the ndb_restore utility on data nodes.

---

## Overview

Restoring an NDB Cluster backup uses the `ndb_restore` utility, which is run on each data node separately. The restore process involves three phases: first restoring the metadata (schema), then restoring the data, and finally rebuilding indexes. The cluster must be running during a restore, and the target tables must exist (or be recreated from the backup metadata).

## Prerequisites

- NDB Cluster is running with a fresh or empty state
- Backup files are present on each data node in the backup directory
- `ndb_restore` binary is installed on data node hosts

## Backup File Location

Backup files are in the format:
```text
/backup/mysql-cluster/BACKUP-<id>/BACKUP-<id>-0.<nodeid>.ctl
/backup/mysql-cluster/BACKUP-<id>/BACKUP-<id>-0.<nodeid>.Data
/backup/mysql-cluster/BACKUP-<id>/BACKUP-<id>-0.<nodeid>.log
```

## Phase 1: Restore Metadata (Schema)

Run `ndb_restore` with `--restore-meta` on the first data node only. This recreates the databases and tables:

```bash
ndb_restore \
  --nodeid=2 \
  --backupid=1 \
  --restore-meta \
  --backup-path=/backup/mysql-cluster \
  --ndb-connectstring=192.168.1.10 \
  --disable-indexes
```

- `--nodeid=2` - the node ID of this data node
- `--backupid=1` - the backup ID to restore
- `--disable-indexes` - skip rebuilding indexes during data restore (much faster)

## Phase 2: Restore Data on Each Data Node

Run `ndb_restore` with `--restore-data` on every data node (including the first):

**On data node 2:**

```bash
ndb_restore \
  --nodeid=2 \
  --backupid=1 \
  --restore-data \
  --backup-path=/backup/mysql-cluster \
  --ndb-connectstring=192.168.1.10
```

**On data node 3:**

```bash
ndb_restore \
  --nodeid=3 \
  --backupid=1 \
  --restore-data \
  --backup-path=/backup/mysql-cluster \
  --ndb-connectstring=192.168.1.10
```

Each node restores its own partition of the data.

## Phase 3: Rebuild Indexes

After all data is restored, rebuild indexes on the first node:

```bash
ndb_restore \
  --nodeid=2 \
  --backupid=1 \
  --rebuild-indexes \
  --backup-path=/backup/mysql-cluster \
  --ndb-connectstring=192.168.1.10
```

## Restoring to a Different Cluster

To restore to a different cluster or database, use `--rewrite-database` and `--include-databases`:

```bash
ndb_restore \
  --nodeid=2 \
  --backupid=1 \
  --restore-data \
  --include-databases=mydb \
  --backup-path=/backup/mysql-cluster \
  --ndb-connectstring=192.168.1.10
```

## Verifying the Restore

After restore, check row counts from a SQL node:

```sql
USE mydb;
SELECT COUNT(*) FROM orders;
SELECT COUNT(*) FROM customers;
```

Cross-reference with counts from before the backup if available.

## Summary

Restoring NDB Cluster follows a three-phase process: restore metadata on one node, restore data on all nodes in parallel, then rebuild indexes. Always use `--disable-indexes` during the metadata phase and rebuild indexes afterward for significantly faster restore times on large datasets. Verify row counts from a SQL node after the restore to confirm data integrity.
