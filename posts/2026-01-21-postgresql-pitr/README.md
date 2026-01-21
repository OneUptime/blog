# How to Restore PostgreSQL to a Point in Time

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, PITR, Point-in-Time Recovery, Disaster Recovery, WAL, Backup

Description: A comprehensive guide to PostgreSQL point-in-time recovery (PITR), covering recovery prerequisites, configuration, target options, and step-by-step recovery procedures.

---

Point-in-time recovery (PITR) allows you to restore a PostgreSQL database to any specific moment - recovering from accidental data deletion, application bugs, or data corruption. This guide covers complete PITR procedures.

## Prerequisites

- Base backup taken before the target recovery point
- WAL archives from backup time to recovery target
- Sufficient disk space for recovery
- Understanding of your recovery target

## PITR Requirements

```
Recovery requires:

1. Base Backup (pg_basebackup)
   |
   v
2. WAL Archives (from backup to target time)
   |
   v
3. Recovery Target (time, XID, LSN, or restore point)
   |
   v
4. Recovered Database
```

## Preparation Steps

### Step 1: Identify Recovery Target

```sql
-- Find the time you want to recover to
-- Example: Just before accidental DELETE
-- "DELETE happened at 2025-01-21 14:35:00"
-- Recovery target: 2025-01-21 14:34:59
```

### Step 2: Locate Required Backups

```bash
# List available base backups
ls -la /var/lib/postgresql/backup/

# For pgBackRest
pgbackrest --stanza=main info

# For Barman
barman list-backup main

# Identify backup taken BEFORE your recovery target
```

### Step 3: Verify WAL Archives

```bash
# Check WAL archive has files from backup to target time
ls -la /var/lib/postgresql/archive/ | head -20

# Find WAL file for specific time (approximate)
# WAL files are named: TIMELINE + LSN
```

## Recovery Procedure

### Step 1: Stop PostgreSQL

```bash
# Stop the database server
sudo systemctl stop postgresql

# Verify it's stopped
pg_isready -h localhost
# Should return: no response
```

### Step 2: Backup Current Data (Safety)

```bash
# Create backup of current (corrupted/damaged) data
sudo mv /var/lib/postgresql/16/main /var/lib/postgresql/16/main.old

# Or if space is limited, at minimum backup pg_wal
sudo cp -r /var/lib/postgresql/16/main/pg_wal /var/lib/postgresql/16/pg_wal_backup
```

### Step 3: Restore Base Backup

```bash
# Create new data directory
sudo mkdir -p /var/lib/postgresql/16/main
sudo chown postgres:postgres /var/lib/postgresql/16/main

# Restore from tar backup
sudo -u postgres tar -xzf /var/lib/postgresql/backup/base_20250120.tar.gz \
    -C /var/lib/postgresql/16/main

# Or copy from backup directory
sudo -u postgres cp -r /var/lib/postgresql/backup/base_20250120/* \
    /var/lib/postgresql/16/main/
```

### Step 4: Create Recovery Signal

```bash
# PostgreSQL 12+: Create recovery.signal file
sudo -u postgres touch /var/lib/postgresql/16/main/recovery.signal

# This tells PostgreSQL to start in recovery mode
```

### Step 5: Configure Recovery

```bash
# Edit postgresql.conf for recovery settings
sudo -u postgres nano /var/lib/postgresql/16/main/postgresql.conf
```

Add recovery settings:

```conf
# postgresql.conf - Recovery settings

# Command to retrieve archived WAL files
restore_command = 'cp /var/lib/postgresql/archive/%f %p'

# Recovery target - choose ONE:

# Option 1: Recover to specific time
recovery_target_time = '2025-01-21 14:34:59'

# Option 2: Recover to specific transaction ID
# recovery_target_xid = '12345678'

# Option 3: Recover to specific LSN
# recovery_target_lsn = '0/1234567'

# Option 4: Recover to named restore point
# recovery_target_name = 'before_migration'

# Option 5: Recover to end of available WAL
# recovery_target = 'immediate'

# What to do after reaching target
recovery_target_action = 'promote'  # or 'pause' or 'shutdown'

# Recovery timeline
recovery_target_timeline = 'latest'

# Include or exclude target
recovery_target_inclusive = false  # Stop just before target
```

### Step 6: Start Recovery

```bash
# Start PostgreSQL - it will enter recovery mode
sudo systemctl start postgresql

# Watch recovery progress
tail -f /var/log/postgresql/postgresql-16-main.log

# Or
sudo -u postgres pg_controldata /var/lib/postgresql/16/main | grep state
```

### Step 7: Verify Recovery

```sql
-- Connect and verify data
psql -U postgres -d mydb

-- Check your data is correct
SELECT * FROM important_table WHERE id = 12345;

-- Check recovery timestamp
SELECT pg_last_xact_replay_timestamp();
```

### Step 8: Finalize Recovery

If `recovery_target_action = 'pause'`:

```sql
-- Review the recovery state
SELECT pg_is_in_recovery();  -- Should be true

-- If satisfied, promote to normal operation
SELECT pg_wal_replay_resume();  -- Continue WAL replay
-- Or
SELECT pg_promote();  -- Promote immediately
```

If `recovery_target_action = 'promote'`:

```sql
-- Server should already be promoted
SELECT pg_is_in_recovery();  -- Should be false

-- Verify you can write
CREATE TABLE recovery_test (id int);
DROP TABLE recovery_test;
```

## Recovery Target Options

### Time-Based Recovery

```conf
# Recover to specific timestamp
recovery_target_time = '2025-01-21 14:34:59.000000+00'

# Use timezone
recovery_target_time = '2025-01-21 14:34:59 America/New_York'
```

### Transaction ID Recovery

```sql
-- First, find the XID you want to recover to
-- This requires having logged transaction IDs

-- On a test restore, find transactions around your target time
SELECT xmin, xmax, * FROM pg_class LIMIT 10;
```

```conf
# Recover to specific transaction
recovery_target_xid = '12345678'
```

### LSN Recovery

```sql
-- Find LSN from logs or WAL file names
-- LSN format: segment/offset, e.g., 0/1234567
```

```conf
# Recover to specific LSN
recovery_target_lsn = '0/1234567'
```

### Named Restore Point

```sql
-- Create restore points before critical operations
SELECT pg_create_restore_point('before_migration');

-- Later, recover to this point
```

```conf
# Recover to named restore point
recovery_target_name = 'before_migration'
```

## Using pgBackRest for PITR

```bash
# Stop PostgreSQL
sudo systemctl stop postgresql

# Recover to specific time
sudo -u postgres pgbackrest --stanza=main \
    --type=time \
    --target="2025-01-21 14:34:59" \
    --target-action=promote \
    restore

# Start PostgreSQL
sudo systemctl start postgresql
```

## Using Barman for PITR

```bash
# Recover to specific time
sudo -u barman barman recover main latest /var/lib/postgresql/16/main \
    --target-time "2025-01-21 14:34:59" \
    --remote-ssh-command "ssh postgres@db-server"

# Start PostgreSQL on recovered server
ssh postgres@db-server "sudo systemctl start postgresql"
```

## Recovery to a Separate Server

### Step 1: Prepare Target Server

```bash
# On new server
sudo systemctl stop postgresql
sudo rm -rf /var/lib/postgresql/16/main/*
```

### Step 2: Copy Base Backup

```bash
# Copy from backup server
scp -r backup-server:/var/lib/postgresql/backup/base_20250120/* \
    /var/lib/postgresql/16/main/

# Or restore from S3
aws s3 sync s3://my-bucket/backups/base_20250120/ /var/lib/postgresql/16/main/
```

### Step 3: Setup WAL Access

```conf
# postgresql.conf - restore_command options

# From local archive
restore_command = 'cp /path/to/archive/%f %p'

# From remote server
restore_command = 'scp archive-server:/archive/%f %p'

# From S3
restore_command = 'aws s3 cp s3://my-bucket/archive/%f %p'

# Using pgBackRest
restore_command = 'pgbackrest --stanza=main archive-get %f %p'
```

### Step 4: Configure and Start

```bash
# Create recovery.signal
touch /var/lib/postgresql/16/main/recovery.signal

# Configure recovery target
# Edit postgresql.conf

# Start recovery
sudo systemctl start postgresql
```

## Testing PITR

### Regular Testing Script

```bash
#!/bin/bash
# test_pitr.sh

TEST_DIR="/tmp/pitr_test_$$"
TEST_DB="pitr_test"

echo "Creating test environment..."
mkdir -p $TEST_DIR

# Restore backup
pg_basebackup -D $TEST_DIR/data -Ft -z -P

# Extract
tar -xzf $TEST_DIR/data/base.tar.gz -C $TEST_DIR/data/

# Configure for recovery test
cat >> $TEST_DIR/data/postgresql.conf << EOF
port = 5433
restore_command = 'cp /var/lib/postgresql/archive/%f %p'
recovery_target_time = '$(date -d "1 hour ago" "+%Y-%m-%d %H:%M:%S")'
recovery_target_action = 'promote'
EOF

touch $TEST_DIR/data/recovery.signal

# Start test instance
pg_ctl -D $TEST_DIR/data start -o "-p 5433"

# Wait for recovery
sleep 30

# Verify
psql -p 5433 -c "SELECT pg_is_in_recovery();"

# Cleanup
pg_ctl -D $TEST_DIR/data stop
rm -rf $TEST_DIR

echo "PITR test completed"
```

## Troubleshooting

### Recovery Not Starting

```bash
# Check PostgreSQL logs
tail -f /var/log/postgresql/postgresql-16-main.log

# Common issues:
# - Missing recovery.signal
# - Invalid restore_command
# - Insufficient WAL files
```

### WAL Files Not Found

```bash
# Verify WAL exists
ls -la /var/lib/postgresql/archive/

# Check restore_command works
sudo -u postgres sh -c 'cp /var/lib/postgresql/archive/000000010000000000000001 /tmp/test'

# Check permissions
ls -la /var/lib/postgresql/archive/000000010000000000000001
```

### Recovery Past Target

```conf
# Use recovery_target_inclusive = false
# to stop BEFORE the target, not after

recovery_target_time = '2025-01-21 14:34:59'
recovery_target_inclusive = false
```

### Wrong Timeline

```conf
# Specify timeline explicitly
recovery_target_timeline = '1'

# Or use latest to follow timeline switches
recovery_target_timeline = 'latest'
```

## Best Practices

1. **Regular backup testing** - Test PITR monthly
2. **Monitor WAL archiving** - Ensure no gaps
3. **Document recovery procedures** - Clear runbooks
4. **Know your RPO** - Understand data loss window
5. **Practice recovery** - Reduce MTTR through familiarity
6. **Use restore points** - Create before major changes
7. **Keep backups secure** - Encrypt and protect

## Conclusion

PostgreSQL PITR enables precise disaster recovery:

1. **Flexible targets** - Time, XID, LSN, or named points
2. **Minimal data loss** - Recover to seconds before incident
3. **Multiple tools** - Native, pgBackRest, or Barman
4. **Testable** - Verify recovery procedures regularly

Combining PITR with proper backup strategies ensures you can recover from virtually any data disaster.
