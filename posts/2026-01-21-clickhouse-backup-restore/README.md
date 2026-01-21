# How to Back Up and Restore ClickHouse Databases

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Backup, Restore, Disaster Recovery, Database, DevOps, clickhouse-backup, S3

Description: A comprehensive guide to backing up and restoring ClickHouse databases using clickhouse-backup, native snapshots, and S3 storage for reliable disaster recovery.

---

ClickHouse stores petabytes of valuable data. Losing that data to hardware failure, human error, or corruption would be catastrophic. This guide covers backup strategies from simple file copies to automated cloud backups with clickhouse-backup.

## Backup Methods Overview

| Method | Speed | Consistency | Remote Support | Best For |
|--------|-------|-------------|----------------|----------|
| clickhouse-backup | Fast | Consistent | S3, GCS, Azure | Production |
| Native BACKUP | Fast | Consistent | S3, disk | ClickHouse 22.8+ |
| File copy | Slow | Requires freeze | Manual | Simple setups |
| Replication | Real-time | Eventual | Built-in | HA setups |

## Method 1: clickhouse-backup (Recommended)

The most popular backup tool for ClickHouse, supporting local and cloud storage.

### Installation

```bash
# Download latest release
wget https://github.com/Altinity/clickhouse-backup/releases/download/v2.4.0/clickhouse-backup-linux-amd64.tar.gz
tar -xzf clickhouse-backup-linux-amd64.tar.gz
sudo mv clickhouse-backup /usr/local/bin/

# Or install from package
sudo apt install clickhouse-backup
```

### Configuration

Create `/etc/clickhouse-backup/config.yml`:

```yaml
general:
  remote_storage: s3
  backups_to_keep_local: 3
  backups_to_keep_remote: 14

clickhouse:
  host: localhost
  port: 9000
  username: backup_user
  password: backup_password
  data_path: /var/lib/clickhouse
  skip_tables:
    - system.*
    - INFORMATION_SCHEMA.*

s3:
  access_key: YOUR_ACCESS_KEY
  secret_key: YOUR_SECRET_KEY
  bucket: clickhouse-backups
  region: us-east-1
  path: backups/
  compression_format: zstd
  compression_level: 3
```

### Create Backup

```bash
# Create local backup
clickhouse-backup create daily-$(date +%Y%m%d)

# Create and upload to S3
clickhouse-backup create_remote daily-$(date +%Y%m%d)

# Or create then upload separately
clickhouse-backup create daily-$(date +%Y%m%d)
clickhouse-backup upload daily-$(date +%Y%m%d)
```

### List Backups

```bash
# List local backups
clickhouse-backup list

# List remote backups
clickhouse-backup list remote

# Example output:
# daily-20240115    local    1.2GB    2024-01-15 10:30:00
# daily-20240114    remote   1.1GB    2024-01-14 10:30:00
```

### Restore Backup

```bash
# Restore from local backup
clickhouse-backup restore daily-20240115

# Download and restore from S3
clickhouse-backup restore_remote daily-20240115

# Or download then restore
clickhouse-backup download daily-20240115
clickhouse-backup restore daily-20240115
```

### Restore Specific Tables

```bash
# Restore single table
clickhouse-backup restore --table default.events daily-20240115

# Restore with different name
clickhouse-backup restore --table default.events --restore-table default.events_restored daily-20240115
```

### Automated Backups with Cron

```bash
# /etc/cron.d/clickhouse-backup
0 2 * * * root /usr/local/bin/clickhouse-backup create_remote daily-$(date +\%Y\%m\%d) >> /var/log/clickhouse-backup.log 2>&1
0 3 * * 0 root /usr/local/bin/clickhouse-backup delete local --keep-last 7 >> /var/log/clickhouse-backup.log 2>&1
0 4 * * 0 root /usr/local/bin/clickhouse-backup delete remote --keep-last 30 >> /var/log/clickhouse-backup.log 2>&1
```

## Method 2: Native BACKUP Command

ClickHouse 22.8+ includes built-in backup commands.

### Backup to Local Disk

```sql
-- Configure backup destination in config.xml
-- <storage_configuration>
--   <disks>
--     <backups>
--       <type>local</type>
--       <path>/var/lib/clickhouse/backups/</path>
--     </backups>
--   </disks>
-- </storage_configuration>

-- Create backup
BACKUP DATABASE default TO Disk('backups', 'daily-20240115');

-- Backup specific tables
BACKUP TABLE default.events, default.users TO Disk('backups', 'tables-20240115');

-- Backup with compression
BACKUP DATABASE default TO Disk('backups', 'daily-20240115')
SETTINGS compression_method='zstd', compression_level=3;
```

### Backup to S3

```sql
-- Backup directly to S3
BACKUP DATABASE default TO S3('https://bucket.s3.amazonaws.com/backups/daily-20240115', 'KEY', 'SECRET');

-- With compression
BACKUP DATABASE default TO S3('https://bucket.s3.amazonaws.com/backups/daily-20240115', 'KEY', 'SECRET')
SETTINGS compression_method='zstd', compression_level=3;
```

### Restore from Backup

```sql
-- Restore entire database
RESTORE DATABASE default FROM Disk('backups', 'daily-20240115');

-- Restore specific table
RESTORE TABLE default.events FROM Disk('backups', 'tables-20240115');

-- Restore with different name
RESTORE TABLE default.events AS default.events_restored FROM Disk('backups', 'tables-20240115');

-- Restore from S3
RESTORE DATABASE default FROM S3('https://bucket.s3.amazonaws.com/backups/daily-20240115', 'KEY', 'SECRET');
```

### Monitor Backup Progress

```sql
-- Check backup status
SELECT * FROM system.backups ORDER BY start_time DESC LIMIT 10;

-- Example output shows status, progress, errors
```

## Method 3: File-Level Backups

For simple setups or when other tools aren't available.

### Freeze and Copy

```sql
-- Freeze table to create consistent snapshot
ALTER TABLE events FREEZE;
```

```bash
# Copy frozen data
cp -r /var/lib/clickhouse/shadow/1/data/default/events /backup/events-$(date +%Y%m%d)

# Clean up shadow directory
rm -rf /var/lib/clickhouse/shadow/1
```

### Restore from Files

```bash
# Stop ClickHouse
sudo systemctl stop clickhouse-server

# Copy data back
cp -r /backup/events-20240115/* /var/lib/clickhouse/data/default/events/

# Fix permissions
chown -R clickhouse:clickhouse /var/lib/clickhouse/data/default/events/

# Start ClickHouse
sudo systemctl start clickhouse-server

# Attach table if needed
```

```sql
-- Reattach restored parts
ALTER TABLE events ATTACH PARTITION ID 'all';
```

## Backup Strategies

### Strategy 1: Daily Full + Incremental

```yaml
# clickhouse-backup config
general:
  backups_to_keep_local: 1
  backups_to_keep_remote: 30

# Cron jobs
0 2 * * 0 clickhouse-backup create_remote full-$(date +%Y%m%d)  # Weekly full
0 2 * * 1-6 clickhouse-backup create_remote incr-$(date +%Y%m%d) --diff-from-remote full-$(date +%Y%m%d -d 'last sunday')
```

### Strategy 2: Continuous WAL Archiving (Replicated Tables)

```xml
<!-- Use ZooKeeper/Keeper for built-in replication -->
<remote_servers>
    <cluster>
        <shard>
            <replica>
                <host>node1</host>
            </replica>
            <replica>
                <host>node2</host>
            </replica>
        </shard>
    </cluster>
</remote_servers>
```

Replicated tables automatically sync data between nodes.

### Strategy 3: Multi-Region Backup

```yaml
# Backup to multiple regions
s3:
  access_key: KEY
  secret_key: SECRET
  bucket: backups-primary
  region: us-east-1

# Secondary backup
# Run separately with different config
s3:
  access_key: KEY
  secret_key: SECRET
  bucket: backups-dr
  region: eu-west-1
```

## Verification and Testing

### Verify Backup Integrity

```bash
# Verify local backup
clickhouse-backup verify daily-20240115

# Verify remote backup
clickhouse-backup verify_remote daily-20240115
```

### Test Restore Regularly

```bash
# Restore to test cluster monthly
clickhouse-backup restore_remote --restore-database test_restore daily-20240115

# Verify data
clickhouse-client --query "SELECT count() FROM test_restore.events"
```

### Backup Metrics

```sql
-- Monitor backup-related metrics
SELECT
    metric,
    value
FROM system.metrics
WHERE metric LIKE '%Backup%';

-- Check backup sizes over time
SELECT
    name,
    formatReadableSize(total_bytes) AS size,
    creation_time
FROM system.backups
ORDER BY creation_time DESC;
```

## Disaster Recovery Runbook

### Complete Cluster Failure

1. **Deploy new ClickHouse cluster**
2. **Install clickhouse-backup**
3. **Configure S3 credentials**
4. **List available backups:**
   ```bash
   clickhouse-backup list remote
   ```
5. **Restore latest backup:**
   ```bash
   clickhouse-backup restore_remote daily-20240115
   ```
6. **Verify data:**
   ```sql
   SELECT database, table, total_rows FROM system.tables;
   ```
7. **Update DNS/load balancer**

### Single Table Corruption

1. **Identify corrupted table:**
   ```sql
   SELECT * FROM system.parts WHERE table = 'events' AND active;
   ```
2. **Drop corrupted table:**
   ```sql
   DROP TABLE events;
   ```
3. **Restore from backup:**
   ```bash
   clickhouse-backup restore --table default.events daily-20240115
   ```

### Point-in-Time Recovery

For tables with timestamps:

```sql
-- Restore backup
RESTORE TABLE events AS events_backup FROM Disk('backups', 'daily-20240115');

-- Copy data up to specific time
INSERT INTO events
SELECT * FROM events_backup
WHERE event_time <= '2024-01-15 15:30:00';

-- Drop backup table
DROP TABLE events_backup;
```

## Best Practices

### 1. Test Restores Regularly

```bash
# Monthly restore test script
#!/bin/bash
BACKUP=$(clickhouse-backup list remote | head -1 | awk '{print $1}')
clickhouse-backup restore_remote --restore-database restore_test $BACKUP
clickhouse-client --query "SELECT count() FROM restore_test.events"
clickhouse-client --query "DROP DATABASE restore_test"
```

### 2. Monitor Backup Jobs

```bash
# Alert if backup older than 25 hours
LATEST=$(clickhouse-backup list remote | head -1 | awk '{print $4}')
if [[ $(date -d "$LATEST" +%s) -lt $(date -d "25 hours ago" +%s) ]]; then
    echo "ALERT: Backup is stale"
fi
```

### 3. Encrypt Backups

```yaml
# clickhouse-backup encryption
general:
  encryption_key: "32-byte-encryption-key-here!!!!!"

# Or use S3 server-side encryption
s3:
  sse: AES256
  # Or KMS
  sse_kms_key_id: arn:aws:kms:...
```

### 4. Document Recovery Procedures

Keep runbooks updated with:
- Backup locations and credentials
- Recovery time objectives (RTO)
- Recovery point objectives (RPO)
- Contact information for on-call

---

Regular, tested backups are essential for any ClickHouse deployment. Use clickhouse-backup for automated S3 backups, test restores monthly, and keep your disaster recovery runbooks current. The time to discover backup problems is during a drill, not during an actual disaster.
