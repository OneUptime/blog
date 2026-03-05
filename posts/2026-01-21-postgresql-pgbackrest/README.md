# How to Use pgBackRest for PostgreSQL Backups

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, pgBackRest, Backup, Recovery, PITR, Enterprise Backup

Description: A comprehensive guide to using pgBackRest for PostgreSQL backups, covering installation, configuration, backup types, retention policies, and point-in-time recovery.

---

pgBackRest is a reliable, feature-rich backup and restore solution for PostgreSQL. It supports parallel backup/restore, full/differential/incremental backups, and multiple repository backends. This guide covers complete pgBackRest setup and operations.

## Prerequisites

- PostgreSQL 10+ installed
- Sufficient storage for backups
- Network access to backup storage
- Root/sudo access for installation

## Why pgBackRest?

| Feature | pgBackRest | pg_dump | pg_basebackup |
|---------|------------|---------|---------------|
| Parallel backup | Yes | No | Limited |
| Incremental | Yes | No | No |
| Compression | Multiple | External | External |
| Encryption | Yes | No | No |
| Cloud storage | Yes | No | No |
| PITR | Yes | No | Yes |

## Installation

### Ubuntu/Debian

```bash
# Add PostgreSQL repository
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
sudo apt update

# Install pgBackRest
sudo apt install -y pgbackrest
```

### RHEL/CentOS

```bash
sudo dnf install -y pgbackrest
```

### Verify Installation

```bash
pgbackrest version
```

## Basic Configuration

### pgBackRest Configuration File

```ini
# /etc/pgbackrest/pgbackrest.conf

[global]
# Repository configuration
repo1-path=/var/lib/pgbackrest
repo1-retention-full=2
repo1-retention-diff=4

# Compression
compress-type=zst
compress-level=3

# Process settings
process-max=4

# Logging
log-level-console=info
log-level-file=detail
log-path=/var/log/pgbackrest

[main]
# PostgreSQL stanza
pg1-path=/var/lib/postgresql/16/main
pg1-port=5432
pg1-user=postgres
```

### PostgreSQL Configuration

```conf
# postgresql.conf

# Enable WAL archiving
archive_mode = on
archive_command = 'pgbackrest --stanza=main archive-push %p'

# WAL level for PITR
wal_level = replica

# Recommended settings
max_wal_senders = 3
```

### Create Directories

```bash
# Create pgBackRest directories
sudo mkdir -p /var/lib/pgbackrest
sudo mkdir -p /var/log/pgbackrest
sudo chown -R postgres:postgres /var/lib/pgbackrest
sudo chown -R postgres:postgres /var/log/pgbackrest
```

### Initialize Stanza

```bash
# Restart PostgreSQL to apply archive settings
sudo systemctl restart postgresql

# Create stanza
sudo -u postgres pgbackrest --stanza=main stanza-create

# Verify stanza
sudo -u postgres pgbackrest --stanza=main check
```

## Backup Operations

### Full Backup

```bash
# Run full backup
sudo -u postgres pgbackrest --stanza=main --type=full backup

# With progress output
sudo -u postgres pgbackrest --stanza=main --type=full backup --log-level-console=info
```

### Differential Backup

```bash
# Differential: Changes since last full backup
sudo -u postgres pgbackrest --stanza=main --type=diff backup
```

### Incremental Backup

```bash
# Incremental: Changes since last backup of any type
sudo -u postgres pgbackrest --stanza=main --type=incr backup
```

### Backup Information

```bash
# List backups
sudo -u postgres pgbackrest --stanza=main info

# Detailed information
sudo -u postgres pgbackrest --stanza=main info --output=json
```

## Retention Policies

### Configure Retention

```ini
# /etc/pgbackrest/pgbackrest.conf

[global]
# Keep 2 full backups
repo1-retention-full=2

# Keep 4 differential backups
repo1-retention-diff=4

# Keep 7 days of WAL
repo1-retention-archive=7

# Or use count-based archive retention
repo1-retention-archive-type=full
```

### Expire Old Backups

```bash
# Manual expiration (usually automatic)
sudo -u postgres pgbackrest --stanza=main expire
```

## Cloud Storage

### Amazon S3

```ini
# /etc/pgbackrest/pgbackrest.conf

[global]
repo1-type=s3
repo1-s3-bucket=my-backup-bucket
repo1-s3-region=us-east-1
repo1-s3-endpoint=s3.amazonaws.com
repo1-s3-key=AKIAIOSFODNN7EXAMPLE
repo1-s3-key-secret=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
repo1-path=/postgres-backups
repo1-retention-full=4
```

### Google Cloud Storage

```ini
[global]
repo1-type=gcs
repo1-gcs-bucket=my-backup-bucket
repo1-gcs-key=/path/to/service-account.json
repo1-path=/postgres-backups
```

### Azure Blob Storage

```ini
[global]
repo1-type=azure
repo1-azure-container=postgres-backups
repo1-azure-account=myaccount
repo1-azure-key=base64-encoded-key
repo1-path=/
```

### Multiple Repositories

```ini
[global]
# Local repository
repo1-path=/var/lib/pgbackrest
repo1-retention-full=2

# S3 repository
repo2-type=s3
repo2-s3-bucket=my-backup-bucket
repo2-s3-region=us-east-1
repo2-path=/postgres-backups
repo2-retention-full=4

# Backup to both repositories
repo-hardlink=y
```

```bash
# Backup to specific repository
sudo -u postgres pgbackrest --stanza=main --repo=1 --type=full backup
sudo -u postgres pgbackrest --stanza=main --repo=2 --type=full backup
```

## Encryption

### Configure Encryption

```ini
# /etc/pgbackrest/pgbackrest.conf

[global]
# Repository encryption
repo1-cipher-type=aes-256-cbc
repo1-cipher-pass=your-secure-passphrase
```

### Generate Cipher Key

```bash
# Generate random passphrase
openssl rand -base64 48
```

## Restore Operations

### Full Restore

```bash
# Stop PostgreSQL
sudo systemctl stop postgresql

# Remove existing data
sudo -u postgres rm -rf /var/lib/postgresql/16/main/*

# Restore
sudo -u postgres pgbackrest --stanza=main restore

# Start PostgreSQL
sudo systemctl start postgresql
```

### Point-in-Time Recovery

```bash
# Restore to specific time
sudo -u postgres pgbackrest --stanza=main \
    --type=time \
    --target="2025-01-21 14:30:00" \
    restore

# Restore to specific transaction
sudo -u postgres pgbackrest --stanza=main \
    --type=xid \
    --target="12345678" \
    restore

# Restore to specific LSN
sudo -u postgres pgbackrest --stanza=main \
    --type=lsn \
    --target="0/1234567" \
    restore
```

### Selective Restore

```bash
# Restore specific database
sudo -u postgres pgbackrest --stanza=main \
    --db-include=mydb \
    restore

# Restore to different location
sudo -u postgres pgbackrest --stanza=main \
    --pg1-path=/var/lib/postgresql/restore \
    restore
```

### Delta Restore

```bash
# Restore only changed files (faster)
sudo -u postgres pgbackrest --stanza=main \
    --delta \
    restore
```

## Parallel Operations

### Configure Parallelism

```ini
# /etc/pgbackrest/pgbackrest.conf

[global]
# Parallel backup/restore processes
process-max=4

# Parallel compression
compress-type=zst
compress-level=3
```

### Monitor Progress

```bash
# Backup with progress
sudo -u postgres pgbackrest --stanza=main backup \
    --type=full \
    --log-level-console=info

# Check backup status
sudo -u postgres pgbackrest --stanza=main info
```

## Scheduling Backups

### Cron Configuration

```bash
# /etc/cron.d/pgbackrest

# Full backup weekly on Sunday at 2 AM
0 2 * * 0 postgres pgbackrest --stanza=main --type=full backup >> /var/log/pgbackrest/cron.log 2>&1

# Differential backup daily at 2 AM (except Sunday)
0 2 * * 1-6 postgres pgbackrest --stanza=main --type=diff backup >> /var/log/pgbackrest/cron.log 2>&1

# Incremental backup every 6 hours
0 */6 * * * postgres pgbackrest --stanza=main --type=incr backup >> /var/log/pgbackrest/cron.log 2>&1
```

### Systemd Timer

```ini
# /etc/systemd/system/pgbackrest-full.timer
[Unit]
Description=pgBackRest Full Backup Timer

[Timer]
OnCalendar=Sun *-*-* 02:00:00
Persistent=true

[Install]
WantedBy=timers.target
```

```ini
# /etc/systemd/system/pgbackrest-full.service
[Unit]
Description=pgBackRest Full Backup

[Service]
Type=oneshot
User=postgres
ExecStart=/usr/bin/pgbackrest --stanza=main --type=full backup
```

```bash
sudo systemctl enable pgbackrest-full.timer
sudo systemctl start pgbackrest-full.timer
```

## Monitoring

### Check Backup Health

```bash
# Verify backup integrity
sudo -u postgres pgbackrest --stanza=main check

# Detailed backup info
sudo -u postgres pgbackrest --stanza=main info --output=json | jq
```

### Monitoring Script

```bash
#!/bin/bash
# /usr/local/bin/check_pgbackrest.sh

STANZA="main"
MAX_AGE_HOURS=24

# Get last backup time
LAST_BACKUP=$(sudo -u postgres pgbackrest --stanza=$STANZA info --output=json | \
    jq -r '.[0].backup[-1].timestamp.stop')

if [ -z "$LAST_BACKUP" ]; then
    echo "CRITICAL: No backups found"
    exit 2
fi

# Calculate age
LAST_BACKUP_EPOCH=$(date -d "$LAST_BACKUP" +%s)
NOW_EPOCH=$(date +%s)
AGE_HOURS=$(( (NOW_EPOCH - LAST_BACKUP_EPOCH) / 3600 ))

if [ $AGE_HOURS -gt $MAX_AGE_HOURS ]; then
    echo "WARNING: Last backup is ${AGE_HOURS} hours old"
    exit 1
fi

echo "OK: Last backup ${AGE_HOURS} hours ago"
exit 0
```

### Prometheus Metrics

```yaml
# Custom exporter query
- name: pgbackrest_last_full_backup_age_seconds
  query: |
    SELECT EXTRACT(EPOCH FROM (NOW() - last_backup_time))
    FROM (SELECT MAX(stop_time) as last_backup_time FROM pgbackrest.backup WHERE type='full') t
```

## Disaster Recovery

### Remote Backup Server

```ini
# On backup server: /etc/pgbackrest/pgbackrest.conf
[global]
repo1-path=/var/lib/pgbackrest

[main]
pg1-host=postgres-server
pg1-path=/var/lib/postgresql/16/main
pg1-port=5432
```

### Cross-Site Replication

```ini
# Primary site configuration
[global]
repo1-path=/var/lib/pgbackrest
repo2-type=s3
repo2-s3-bucket=dr-backup-bucket
repo2-s3-region=us-west-2
repo2-path=/postgres-dr
```

## Troubleshooting

### Common Issues

```bash
# Check configuration
sudo -u postgres pgbackrest --stanza=main info

# Verify WAL archiving
sudo -u postgres pgbackrest --stanza=main archive-get \
    000000010000000000000001 /tmp/test-wal

# Force stanza upgrade after PostgreSQL upgrade
sudo -u postgres pgbackrest --stanza=main stanza-upgrade
```

### Debug Mode

```bash
# Run with debug logging
sudo -u postgres pgbackrest --stanza=main \
    --log-level-console=debug \
    backup
```

### Log Analysis

```bash
# View backup logs
tail -f /var/log/pgbackrest/main-backup.log

# Search for errors
grep -i error /var/log/pgbackrest/*.log
```

## Best Practices

1. **Test restores regularly** - Verify backups are usable
2. **Use multiple repositories** - Local and cloud
3. **Enable encryption** - Protect sensitive data
4. **Monitor backup age** - Alert on stale backups
5. **Parallel operations** - Use multiple processes
6. **Retention policies** - Balance storage vs recovery needs
7. **Document procedures** - Clear restore runbooks

## Conclusion

pgBackRest provides enterprise-grade PostgreSQL backup:

1. **Multiple backup types** - Full, differential, incremental
2. **Cloud storage support** - S3, GCS, Azure
3. **Encryption** - Secure backups at rest
4. **Parallel operations** - Fast backup and restore
5. **Point-in-time recovery** - Precise data recovery

Combine with proper monitoring and testing for a reliable backup strategy.
