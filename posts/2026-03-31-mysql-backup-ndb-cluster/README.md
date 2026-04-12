# How to Back Up MySQL NDB Cluster

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, NDB Cluster, Backup, Recovery, Management

Description: Learn how to perform online backups of MySQL NDB Cluster using ndb_mgm and configure backup storage paths and retention.

---

## How NDB Cluster Backup Works

NDB Cluster backup is performed at the cluster level through the management node. When triggered, each data node writes its portion of the data to a local backup directory simultaneously. The backup captures a consistent snapshot across all data nodes without stopping the cluster. Backups are stored as three file types per data node:

```text
BACKUP-<id>.<nodeid>.ctl      - Control file with metadata
BACKUP-<id>-0.<nodeid>.Data   - Table data
BACKUP-<id>.<nodeid>.log      - Log of committed transactions during backup
```

## Configuring the Backup Directory

Set the backup directory in `config.ini` on the management node:

```text
[ndbd default]
BackupDataDir=/backup/mysql-cluster
```

Create the directory on all data node hosts:

```bash
sudo mkdir -p /backup/mysql-cluster
sudo chown mysql:mysql /backup/mysql-cluster
```

## Starting a Backup

From the management client:

```bash
ndb_mgm -e "start backup"
```

Or interactively:

```bash
ndb_mgm
ndb_mgm> start backup
```

Output:

```text
Waiting for completed, this may take several minutes
Node 2: Backup 1 started from node 1
Node 2: Backup 1 started from node 1 completed
StartGCP: 177 StopGCP: 180
#Records: 2034325 #LogRecords: 0
Data: 54157248 bytes Log: 0 bytes
```

The number `1` is the backup ID, incremented automatically for each backup.

## Starting a Backup with a Specific ID

```bash
ndb_mgm -e "start backup 5"
```

## Checking Available Backups

On any data node, list backup directories:

```bash
ls /backup/mysql-cluster/
```

```text
BACKUP-1/  BACKUP-2/
```

To see the files inside a specific backup:

```bash
ls /backup/mysql-cluster/BACKUP-1/
```

```text
BACKUP-1-0.2.Data  BACKUP-1.2.ctl  BACKUP-1.2.log
BACKUP-1-0.3.Data  BACKUP-1.3.ctl  BACKUP-1.3.log
```

## Automating Backups with a Cron Job

```bash
# /etc/cron.d/ndb-backup
0 2 * * * root ndb_mgm -c 192.168.1.10 -e "start backup" >> /var/log/ndb-backup.log 2>&1
```

## Backing Up to a Remote Location

After the backup completes locally on data nodes, copy files to a central backup server:

```bash
#!/bin/bash
BACKUP_DIR=/backup/mysql-cluster
REMOTE=backup-server.internal:/backups/ndb/
LATEST=$(ls -d $BACKUP_DIR/BACKUP-* 2>/dev/null | sort -V | tail -1)

if [ -n "$LATEST" ]; then
  rsync -avz "$LATEST/" "$REMOTE$(basename $LATEST)/"
  echo "Backup transferred: $LATEST"
fi
```

## Verifying Backup Integrity

Check that all data node files are present for the backup:

```bash
# For backup ID 1 with nodes 2 and 3:
ls /backup/mysql-cluster/BACKUP-1/
```

Expected files for each data node:

```text
BACKUP-1-0.2.Data  BACKUP-1.2.ctl  BACKUP-1.2.log
BACKUP-1-0.3.Data  BACKUP-1.3.ctl  BACKUP-1.3.log
```

## Summary

NDB Cluster backups are triggered via `ndb_mgm -e "start backup"` and run online without stopping the cluster. Configure `BackupDataDir` in `config.ini` to a dedicated volume on each data node host, automate daily backups with cron, and copy backup files to a remote location after each run. Always collect backup files from all data nodes before attempting a restore.
