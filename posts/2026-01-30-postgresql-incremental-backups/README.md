# How to Build PostgreSQL Incremental Backups

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: PostgreSQL, Incremental Backup, WAL, pgBackRest

Description: Learn to implement incremental backups with WAL archiving, pgBackRest, and block-level incremental strategies for efficient database backup.

---

## Introduction

Full database backups are essential but can become impractical as your PostgreSQL database grows. A 500GB database backed up daily means transferring 3.5TB weekly - consuming bandwidth, storage, and time. Incremental backups solve this by capturing only the changes since the last backup, dramatically reducing resource usage while maintaining complete recoverability.

This guide walks you through implementing incremental backups using Write-Ahead Logging (WAL) archiving and pgBackRest - the industry-standard tool for PostgreSQL backup management.

## Understanding Incremental Backup Architecture

Before diving into implementation, let's understand how PostgreSQL's backup mechanisms work together.

```mermaid
flowchart TB
    subgraph PostgreSQL["PostgreSQL Server"]
        DB[(Database)]
        WAL[WAL Files]
        DB -->|Transactions| WAL
    end

    subgraph Backup_Process["Backup Strategy"]
        FB[Full Backup]
        IB1[Incremental 1]
        IB2[Incremental 2]
        IB3[Incremental 3]
        WAL_Archive[WAL Archive]
    end

    subgraph Storage["Backup Storage"]
        Local[Local Storage]
        S3[S3/Cloud Storage]
    end

    DB -->|Weekly| FB
    DB -->|Daily| IB1
    DB -->|Daily| IB2
    DB -->|Daily| IB3
    WAL -->|Continuous| WAL_Archive

    FB --> Local
    IB1 --> Local
    IB2 --> Local
    IB3 --> Local
    WAL_Archive --> Local
    Local -->|Sync| S3
```

### Key Concepts

- **Full Backup**: A complete copy of your database at a specific point in time
- **Incremental Backup**: Contains only data that changed since the last backup (full or incremental)
- **Differential Backup**: Contains all changes since the last full backup
- **WAL (Write-Ahead Logging)**: Transaction logs that record every change to the database

## Part 1: Setting Up WAL Archiving

WAL archiving is the foundation of PostgreSQL's Point-in-Time Recovery (PITR) and incremental backup strategies.

### Step 1: Configure postgresql.conf

Edit your PostgreSQL configuration file to enable WAL archiving:

```bash
# Location varies by installation
# Common paths:
# /etc/postgresql/16/main/postgresql.conf (Debian/Ubuntu)
# /var/lib/pgsql/16/data/postgresql.conf (RHEL/CentOS)

sudo nano /etc/postgresql/16/main/postgresql.conf
```

Add or modify these settings:

```ini
# Enable WAL archiving
wal_level = replica
archive_mode = on
archive_command = 'test ! -f /var/lib/postgresql/wal_archive/%f && cp %p /var/lib/postgresql/wal_archive/%f'
archive_timeout = 300

# WAL settings for better performance
max_wal_size = 2GB
min_wal_size = 1GB
wal_keep_size = 1GB
```

**Parameter Explanation:**

| Parameter | Value | Purpose |
|-----------|-------|---------|
| `wal_level` | replica | Enables WAL data needed for replication and PITR |
| `archive_mode` | on | Activates WAL archiving |
| `archive_command` | (see above) | Command executed to archive each WAL segment |
| `archive_timeout` | 300 | Forces WAL switch every 5 minutes even without activity |

### Step 2: Create Archive Directory

```bash
# Create the WAL archive directory
sudo mkdir -p /var/lib/postgresql/wal_archive

# Set proper ownership
sudo chown postgres:postgres /var/lib/postgresql/wal_archive

# Set secure permissions
sudo chmod 700 /var/lib/postgresql/wal_archive
```

### Step 3: Restart PostgreSQL

```bash
sudo systemctl restart postgresql
```

### Step 4: Verify WAL Archiving

```sql
-- Connect to PostgreSQL
psql -U postgres

-- Check archive status
SELECT * FROM pg_stat_archiver;

-- Force a WAL switch to test archiving
SELECT pg_switch_wal();
```

Verify files are appearing in the archive directory:

```bash
ls -la /var/lib/postgresql/wal_archive/
```

## Part 2: Installing and Configuring pgBackRest

pgBackRest is a powerful backup solution that provides true incremental backups at the block level, compression, encryption, and parallel operations.

### Why pgBackRest?

```mermaid
flowchart LR
    subgraph Features["pgBackRest Features"]
        direction TB
        F1[Block-Level Incremental]
        F2[Parallel Backup/Restore]
        F3[Compression - LZ4/ZSTD]
        F4[Encryption - AES-256]
        F5[Multiple Repositories]
        F6[Delta Restore]
    end

    subgraph Benefits["Benefits"]
        direction TB
        B1[90%+ Storage Reduction]
        B2[Faster Backups]
        B3[Secure Data]
        B4[Flexible Storage]
    end

    F1 --> B1
    F2 --> B2
    F3 --> B1
    F4 --> B3
    F5 --> B4
    F6 --> B2
```

### Step 1: Install pgBackRest

**Debian/Ubuntu:**

```bash
# Add PostgreSQL APT repository if not already added
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -

# Install pgBackRest
sudo apt update
sudo apt install pgbackrest -y
```

**RHEL/CentOS:**

```bash
# Install from PostgreSQL repository
sudo dnf install pgbackrest -y
```

### Step 2: Create pgBackRest Configuration

```bash
# Create configuration directory
sudo mkdir -p /etc/pgbackrest
sudo mkdir -p /var/log/pgbackrest
sudo mkdir -p /var/lib/pgbackrest

# Set ownership
sudo chown -R postgres:postgres /var/log/pgbackrest
sudo chown -R postgres:postgres /var/lib/pgbackrest
```

Create the main configuration file:

```bash
sudo nano /etc/pgbackrest/pgbackrest.conf
```

Add the following configuration:

```ini
[global]
# Repository settings
repo1-path=/var/lib/pgbackrest
repo1-retention-full=2
repo1-retention-diff=7
repo1-retention-incr=14

# Compression settings
compress-type=lz4
compress-level=6

# Parallel processing
process-max=4

# Logging
log-level-console=info
log-level-file=detail
log-path=/var/log/pgbackrest

# Performance tuning
buffer-size=64MB
delta=y

[main]
# PostgreSQL connection
pg1-path=/var/lib/postgresql/16/main

# Use Unix socket for local connection
pg1-socket-path=/var/run/postgresql
pg1-port=5432
```

**Configuration Breakdown:**

| Section | Parameter | Description |
|---------|-----------|-------------|
| `[global]` | `repo1-path` | Local backup storage location |
| | `repo1-retention-full` | Keep 2 full backups |
| | `repo1-retention-diff` | Keep 7 differential backups |
| | `repo1-retention-incr` | Keep 14 incremental backups |
| | `compress-type` | Use LZ4 for fast compression |
| | `process-max` | Use 4 parallel processes |
| `[main]` | `pg1-path` | PostgreSQL data directory |

### Step 3: Update PostgreSQL for pgBackRest

Modify `postgresql.conf` to use pgBackRest for WAL archiving:

```ini
# WAL archiving with pgBackRest
archive_mode = on
archive_command = 'pgbackrest --stanza=main archive-push %p'

# Ensure proper WAL level
wal_level = replica
```

### Step 4: Create and Verify Stanza

A stanza is pgBackRest's term for a backup configuration. Initialize it:

```bash
# Switch to postgres user
sudo -u postgres pgbackrest --stanza=main stanza-create

# Verify the configuration
sudo -u postgres pgbackrest --stanza=main check
```

Expected output:

```
P00   INFO: check command begin
P00   INFO: check repo1 (path)
P00   INFO: switch wal not performed because this is a new stanza
P00   INFO: check command end: completed successfully
```

## Part 3: Implementing Backup Strategy

Now let's implement a comprehensive backup strategy with full, differential, and incremental backups.

### Backup Type Comparison

```mermaid
gantt
    title Backup Storage Over Time
    dateFormat  YYYY-MM-DD
    section Full Backup
    Sunday Full (100GB)     :f1, 2024-01-07, 1d
    Sunday Full (100GB)     :f2, 2024-01-14, 1d
    section Differential
    Mon Diff (5GB)          :d1, 2024-01-08, 1d
    Tue Diff (10GB)         :d2, 2024-01-09, 1d
    Wed Diff (15GB)         :d3, 2024-01-10, 1d
    section Incremental
    Thu Incr (2GB)          :i1, 2024-01-11, 1d
    Fri Incr (2GB)          :i2, 2024-01-12, 1d
    Sat Incr (2GB)          :i3, 2024-01-13, 1d
```

### Full Backup

Create a complete backup of your database:

```bash
# Perform full backup
sudo -u postgres pgbackrest --stanza=main --type=full backup

# View backup info
sudo -u postgres pgbackrest --stanza=main info
```

Output example:

```
stanza: main
    status: ok
    cipher: none

    db (current)
        wal archive min/max (16): 000000010000000000000001/000000010000000000000003

        full backup: 20240115-120000F
            timestamp start/stop: 2024-01-15 12:00:00 / 2024-01-15 12:15:32
            wal start/stop: 000000010000000000000002 / 000000010000000000000002
            database size: 100GB, database backup size: 100GB
            repo1: backup set size: 25GB, backup size: 25GB
```

### Differential Backup

Captures all changes since the last full backup:

```bash
# Perform differential backup
sudo -u postgres pgbackrest --stanza=main --type=diff backup
```

### Incremental Backup

Captures only changes since the last backup (any type):

```bash
# Perform incremental backup
sudo -u postgres pgbackrest --stanza=main --type=incr backup
```

### Automated Backup Schedule

Create a comprehensive backup script:

```bash
sudo nano /usr/local/bin/pg-backup.sh
```

```bash
#!/bin/bash
#
# PostgreSQL Automated Backup Script using pgBackRest
#

set -euo pipefail

# Configuration
STANZA="main"
LOG_FILE="/var/log/pgbackrest/backup-$(date +%Y%m%d).log"
SLACK_WEBHOOK="${SLACK_WEBHOOK:-}"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Send notification
notify() {
    local status=$1
    local message=$2

    if [[ -n "$SLACK_WEBHOOK" ]]; then
        curl -s -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"PostgreSQL Backup [$status]: $message\"}" \
            "$SLACK_WEBHOOK"
    fi
}

# Determine backup type based on day
get_backup_type() {
    local day_of_week=$(date +%u)

    case $day_of_week in
        7) echo "full" ;;      # Sunday - Full backup
        3) echo "diff" ;;      # Wednesday - Differential
        *) echo "incr" ;;      # Other days - Incremental
    esac
}

# Main backup function
perform_backup() {
    local backup_type=$(get_backup_type)

    log "Starting $backup_type backup for stanza: $STANZA"

    # Execute backup
    if pgbackrest --stanza="$STANZA" --type="$backup_type" backup 2>&1 | tee -a "$LOG_FILE"; then
        log "Backup completed successfully"
        notify "SUCCESS" "$backup_type backup completed"
    else
        log "Backup failed!"
        notify "FAILURE" "$backup_type backup failed - check logs"
        exit 1
    fi

    # Show backup info
    pgbackrest --stanza="$STANZA" info | tee -a "$LOG_FILE"
}

# Cleanup old backups based on retention
cleanup_expired() {
    log "Running backup expiration"
    pgbackrest --stanza="$STANZA" expire 2>&1 | tee -a "$LOG_FILE"
}

# Health check
verify_backup() {
    log "Verifying latest backup"
    pgbackrest --stanza="$STANZA" check 2>&1 | tee -a "$LOG_FILE"
}

# Main execution
main() {
    log "========== Backup Job Started =========="

    perform_backup
    cleanup_expired
    verify_backup

    log "========== Backup Job Completed =========="
}

main "$@"
```

Make the script executable and schedule it:

```bash
# Make executable
sudo chmod +x /usr/local/bin/pg-backup.sh

# Add to crontab (as postgres user)
sudo -u postgres crontab -e
```

Add the following cron entries:

```cron
# PostgreSQL Backup Schedule
# Full backup every Sunday at 2:00 AM
0 2 * * 0 /usr/local/bin/pg-backup.sh >> /var/log/pgbackrest/cron.log 2>&1

# Differential backup every Wednesday at 2:00 AM
0 2 * * 3 /usr/local/bin/pg-backup.sh >> /var/log/pgbackrest/cron.log 2>&1

# Incremental backup Mon, Tue, Thu, Fri, Sat at 2:00 AM
0 2 * * 1,2,4,5,6 /usr/local/bin/pg-backup.sh >> /var/log/pgbackrest/cron.log 2>&1
```

## Part 4: Delta Backups and Block-Level Efficiency

pgBackRest's delta feature provides significant efficiency gains by comparing file checksums and only backing up changed blocks.

### How Delta Backups Work

```mermaid
flowchart TB
    subgraph Source["Source Database Files"]
        SF1[Table A - 10GB]
        SF2[Table B - 5GB]
        SF3[Table C - 2GB]
    end

    subgraph Delta_Process["Delta Comparison"]
        DC[Checksum Comparison]
        CB[Changed Blocks Only]
    end

    subgraph Backup["Backup Result"]
        BF1[Table A Changes - 500MB]
        BF2[Table B - No Changes]
        BF3[Table C Changes - 100MB]
    end

    SF1 -->|Compare| DC
    SF2 -->|Compare| DC
    SF3 -->|Compare| DC

    DC --> CB
    CB --> BF1
    CB --> BF3

    style BF2 fill:#90EE90
```

### Enable Delta Restore

Delta restore only restores files that differ from those in the backup:

```ini
# In pgbackrest.conf
[global]
delta=y
```

### Manual Delta Restore

```bash
# Restore with delta - only copies changed files
sudo -u postgres pgbackrest --stanza=main --delta restore
```

## Part 5: Configuring Retention Policies

Proper retention policies balance storage costs with recovery requirements.

### Understanding Retention Types

```mermaid
flowchart LR
    subgraph Retention["Retention Policy"]
        Full[Full Retention: 2]
        Diff[Diff Retention: 7]
        Incr[Incr Retention: 14]
        Archive[Archive Retention: full]
    end

    subgraph Timeline["Backup Timeline"]
        W1[Week 1 Full]
        W1D[Week 1 Diffs]
        W1I[Week 1 Incrs]
        W2[Week 2 Full]
        W2D[Week 2 Diffs]
        W2I[Week 2 Incrs]
    end

    Full --> W1
    Full --> W2
    Diff --> W1D
    Diff --> W2D
    Incr --> W1I
    Incr --> W2I
```

### Advanced Retention Configuration

```ini
[global]
# Backup retention
repo1-retention-full=4           # Keep 4 full backups
repo1-retention-full-type=count  # Count-based retention

repo1-retention-diff=14          # Keep 14 differential backups

# Archive retention
repo1-retention-archive=2        # Keep archives for 2 full backups
repo1-retention-archive-type=full

# Time-based retention alternative
# repo1-retention-full=30
# repo1-retention-full-type=time  # Keep full backups for 30 days
```

### Multi-Repository Configuration

For disaster recovery, configure multiple repositories:

```ini
[global]
# Local repository
repo1-path=/var/lib/pgbackrest
repo1-retention-full=2
repo1-retention-diff=7

# S3 repository for offsite backup
repo2-type=s3
repo2-path=/pgbackrest
repo2-s3-bucket=my-postgres-backups
repo2-s3-endpoint=s3.amazonaws.com
repo2-s3-region=us-east-1
repo2-s3-key=AKIAIOSFODNN7EXAMPLE
repo2-s3-key-secret=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
repo2-retention-full=4
repo2-retention-archive=2

# Encryption for S3 repository
repo2-cipher-type=aes-256-cbc
repo2-cipher-pass=your-secure-encryption-passphrase
```

### Backup to Both Repositories

```bash
# Backup to all repositories
sudo -u postgres pgbackrest --stanza=main --type=full backup

# Backup to specific repository only
sudo -u postgres pgbackrest --stanza=main --type=full --repo=2 backup
```

## Part 6: Restoration Procedures

Understanding restoration is critical - backups are only valuable if you can restore them.

### Restoration Workflow

```mermaid
flowchart TB
    Start[Disaster Occurs] --> Stop[Stop PostgreSQL]
    Stop --> Clear[Clear Data Directory]
    Clear --> Restore{Restore Type?}

    Restore -->|Full| FR[Restore Full Backup]
    Restore -->|PITR| PITR[Restore to Point in Time]
    Restore -->|Specific| SB[Restore Specific Backup]

    FR --> StartPG[Start PostgreSQL]
    PITR --> StartPG
    SB --> StartPG

    StartPG --> Verify[Verify Data Integrity]
    Verify --> Done[Recovery Complete]
```

### Full Restore

```bash
# Stop PostgreSQL
sudo systemctl stop postgresql

# Clear data directory (be careful!)
sudo -u postgres rm -rf /var/lib/postgresql/16/main/*

# Restore latest backup
sudo -u postgres pgbackrest --stanza=main restore

# Start PostgreSQL
sudo systemctl start postgresql

# Verify restoration
sudo -u postgres psql -c "SELECT pg_is_in_recovery();"
```

### Point-in-Time Recovery (PITR)

Restore to a specific timestamp:

```bash
# Stop PostgreSQL
sudo systemctl stop postgresql

# Clear data directory
sudo -u postgres rm -rf /var/lib/postgresql/16/main/*

# Restore to specific point in time
sudo -u postgres pgbackrest --stanza=main \
    --type=time \
    --target="2024-01-15 14:30:00" \
    --target-action=promote \
    restore

# Start PostgreSQL
sudo systemctl start postgresql
```

### Restore Specific Backup Set

```bash
# List available backups
sudo -u postgres pgbackrest --stanza=main info

# Restore specific backup
sudo -u postgres pgbackrest --stanza=main \
    --set=20240115-120000F \
    restore
```

### Restore to Different Server

```bash
# On the target server, restore from remote repository
pgbackrest --stanza=main \
    --repo1-path=/backup/pgbackrest \
    --pg1-path=/var/lib/postgresql/16/main \
    restore
```

### Selective Database Restore

Restore only specific databases:

```bash
# Restore only specific database
sudo -u postgres pgbackrest --stanza=main \
    --db-include=myapp_production \
    restore
```

## Part 7: Monitoring and Verification

Regular monitoring ensures your backup system is working correctly.

### Backup Verification Script

```bash
#!/bin/bash
#
# PostgreSQL Backup Verification Script
#

STANZA="main"
ALERT_EMAIL="dba@company.com"

# Check backup age
check_backup_age() {
    local max_age_hours=26  # Alert if backup older than 26 hours

    local last_backup=$(pgbackrest --stanza="$STANZA" info --output=json | \
        jq -r '.[0].backup[-1].timestamp.stop')

    local last_backup_epoch=$(date -d "$last_backup" +%s)
    local current_epoch=$(date +%s)
    local age_hours=$(( (current_epoch - last_backup_epoch) / 3600 ))

    if [[ $age_hours -gt $max_age_hours ]]; then
        echo "WARNING: Last backup is $age_hours hours old"
        return 1
    fi

    echo "OK: Last backup is $age_hours hours old"
    return 0
}

# Check WAL archiving
check_wal_archive() {
    local result=$(psql -U postgres -t -c \
        "SELECT archived_count, failed_count FROM pg_stat_archiver;")

    local archived=$(echo "$result" | awk '{print $1}')
    local failed=$(echo "$result" | awk '{print $3}')

    if [[ $failed -gt 0 ]]; then
        echo "WARNING: $failed WAL archives failed"
        return 1
    fi

    echo "OK: $archived WAL files archived, $failed failures"
    return 0
}

# Verify backup integrity
verify_backup_integrity() {
    echo "Verifying backup integrity..."

    if pgbackrest --stanza="$STANZA" verify; then
        echo "OK: Backup verification passed"
        return 0
    else
        echo "ERROR: Backup verification failed"
        return 1
    fi
}

# Check repository disk space
check_disk_space() {
    local repo_path="/var/lib/pgbackrest"
    local threshold=80

    local usage=$(df "$repo_path" | tail -1 | awk '{print $5}' | tr -d '%')

    if [[ $usage -gt $threshold ]]; then
        echo "WARNING: Repository disk usage at $usage%"
        return 1
    fi

    echo "OK: Repository disk usage at $usage%"
    return 0
}

# Main monitoring function
main() {
    local status=0

    echo "========== PostgreSQL Backup Health Check =========="
    echo "Date: $(date)"
    echo ""

    check_backup_age || status=1
    check_wal_archive || status=1
    check_disk_space || status=1

    echo ""
    echo "Running backup verification..."
    verify_backup_integrity || status=1

    echo ""
    if [[ $status -eq 0 ]]; then
        echo "Overall Status: HEALTHY"
    else
        echo "Overall Status: WARNING - Review issues above"
        # Send alert email
        echo "Backup health check failed" | mail -s "PostgreSQL Backup Alert" "$ALERT_EMAIL"
    fi

    return $status
}

main "$@"
```

### Prometheus Metrics Integration

Create a script to expose backup metrics:

```bash
#!/bin/bash
#
# Export pgBackRest metrics for Prometheus
#

METRICS_FILE="/var/lib/node_exporter/pgbackrest.prom"
STANZA="main"

# Get backup info as JSON
backup_info=$(pgbackrest --stanza="$STANZA" info --output=json)

# Extract metrics
last_full_backup=$(echo "$backup_info" | jq -r '
    [.[0].backup[] | select(.type=="full")] | last | .timestamp.stop // "1970-01-01 00:00:00"
')
last_full_epoch=$(date -d "$last_full_backup" +%s 2>/dev/null || echo 0)

last_backup=$(echo "$backup_info" | jq -r '.[0].backup[-1].timestamp.stop // "1970-01-01 00:00:00"')
last_backup_epoch=$(date -d "$last_backup" +%s 2>/dev/null || echo 0)

backup_count=$(echo "$backup_info" | jq '.[0].backup | length')

repo_size=$(echo "$backup_info" | jq '.[0].backup | map(.info.repository.size) | add // 0')

# Write metrics
cat > "$METRICS_FILE" << EOF
# HELP pgbackrest_last_full_backup_timestamp Timestamp of last full backup
# TYPE pgbackrest_last_full_backup_timestamp gauge
pgbackrest_last_full_backup_timestamp{stanza="$STANZA"} $last_full_epoch

# HELP pgbackrest_last_backup_timestamp Timestamp of last backup
# TYPE pgbackrest_last_backup_timestamp gauge
pgbackrest_last_backup_timestamp{stanza="$STANZA"} $last_backup_epoch

# HELP pgbackrest_backup_count Total number of backups
# TYPE pgbackrest_backup_count gauge
pgbackrest_backup_count{stanza="$STANZA"} $backup_count

# HELP pgbackrest_repo_size_bytes Total repository size in bytes
# TYPE pgbackrest_repo_size_bytes gauge
pgbackrest_repo_size_bytes{stanza="$STANZA"} $repo_size
EOF

echo "Metrics exported to $METRICS_FILE"
```

## Part 8: Best Practices and Optimization

### Performance Tuning

```ini
[global]
# Parallel processing - adjust based on CPU cores
process-max=4

# Buffer size for large databases
buffer-size=64MB

# Compression - balance speed vs size
compress-type=lz4      # Fast compression
compress-level=6       # Moderate compression ratio

# For maximum compression (slower)
# compress-type=zstd
# compress-level=9

# Network settings for remote repositories
protocol-timeout=3600
io-timeout=900
```

### Security Best Practices

1. **Enable Encryption**

```ini
[global]
repo1-cipher-type=aes-256-cbc
repo1-cipher-pass=use-a-long-secure-passphrase-here
```

2. **Secure File Permissions**

```bash
# Configuration file
sudo chmod 640 /etc/pgbackrest/pgbackrest.conf
sudo chown postgres:postgres /etc/pgbackrest/pgbackrest.conf

# Repository directory
sudo chmod 700 /var/lib/pgbackrest
sudo chown postgres:postgres /var/lib/pgbackrest
```

3. **Use IAM Roles for S3** (instead of static credentials)

```ini
[global]
repo1-s3-key-type=auto  # Use IAM role
```

### Troubleshooting Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Archive command fails | Permission denied | Check directory ownership and permissions |
| Backup hangs | Lock contention | Check for existing backup processes |
| Restore fails | Insufficient space | Clear space or use --delta |
| Slow backup | Too few processes | Increase process-max |
| Connection refused | Socket path wrong | Verify pg1-socket-path setting |

### Debug Commands

```bash
# Verbose backup with debug output
pgbackrest --stanza=main --type=full --log-level-console=debug backup

# Check configuration
pgbackrest --stanza=main info

# Verify repository integrity
pgbackrest --stanza=main verify

# List WAL archive status
pgbackrest --stanza=main archive-get --list
```

## Conclusion

Implementing PostgreSQL incremental backups with pgBackRest provides a robust, efficient, and scalable backup solution. Key takeaways:

1. **WAL archiving** is the foundation - enable it first
2. **pgBackRest** provides true block-level incremental backups with significant storage savings
3. **Multiple backup types** (full, differential, incremental) balance recovery speed with storage efficiency
4. **Retention policies** should align with your RPO/RTO requirements
5. **Regular testing** of restoration procedures is essential
6. **Monitoring and verification** ensure backups are actually working

By following this guide, you'll have a production-ready backup system that can handle databases of any size while minimizing storage costs and backup windows.

## Further Reading

- [pgBackRest Official Documentation](https://pgbackrest.org/)
- [PostgreSQL Continuous Archiving and PITR](https://www.postgresql.org/docs/current/continuous-archiving.html)
- [PostgreSQL WAL Configuration](https://www.postgresql.org/docs/current/wal-configuration.html)
