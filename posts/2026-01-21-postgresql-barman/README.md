# How to Use Barman for PostgreSQL Backup Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Barman, Backup, Recovery, PITR, Disaster Recovery

Description: A comprehensive guide to using Barman for PostgreSQL backup management, covering installation, configuration, backup strategies, catalog management, and disaster recovery procedures.

---

Barman (Backup and Recovery Manager) is an open-source administration tool for disaster recovery of PostgreSQL servers. It provides centralized backup management, retention policies, and point-in-time recovery capabilities. This guide covers complete Barman setup and operations.

## Prerequisites

- PostgreSQL 10+ on database server
- Dedicated Barman server (recommended)
- SSH access between servers
- Network connectivity for streaming replication

## Architecture Overview

```
                    +----------------+
                    |  Barman Server |
                    |                |
                    | - Backup Catalog
                    | - WAL Archive  |
                    +-------+--------+
                            |
              +-------------+-------------+
              |             |             |
        +-----v-----+ +-----v-----+ +-----v-----+
        |  PG Server| |  PG Server| |  PG Server|
        |  (primary)| |  (replica)| |  (standby)|
        +-----------+ +-----------+ +-----------+
```

## Installation

### On Barman Server

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y barman barman-cli

# RHEL/CentOS
sudo dnf install -y barman barman-cli

# Verify installation
barman --version
```

### On PostgreSQL Server

```bash
# Install barman-cli for WAL shipping
sudo apt install -y barman-cli

# Or RHEL/CentOS
sudo dnf install -y barman-cli
```

## SSH Configuration

### Generate SSH Keys

```bash
# On Barman server (as barman user)
sudo -u barman ssh-keygen -t ed25519 -N '' -f /var/lib/barman/.ssh/id_ed25519

# Copy to PostgreSQL server
sudo -u barman ssh-copy-id postgres@postgres-server

# Test connection
sudo -u barman ssh postgres@postgres-server 'echo OK'
```

### On PostgreSQL Server

```bash
# Generate key for postgres user
sudo -u postgres ssh-keygen -t ed25519 -N '' -f /var/lib/postgresql/.ssh/id_ed25519

# Copy to Barman server
sudo -u postgres ssh-copy-id barman@barman-server

# Test connection
sudo -u postgres ssh barman@barman-server 'echo OK'
```

## PostgreSQL Configuration

### On PostgreSQL Server

```conf
# postgresql.conf

# WAL level for PITR
wal_level = replica

# Enable archiving
archive_mode = on
archive_command = 'barman-wal-archive barman-server main %p'

# Or with SSH
archive_command = 'rsync -a %p barman@barman-server:/var/lib/barman/main/incoming/%f'

# Replication settings
max_wal_senders = 3
max_replication_slots = 3
```

### Create Replication User

```sql
-- Create user for streaming backup
CREATE USER barman WITH REPLICATION PASSWORD 'secure_password';

-- Grant access to monitoring functions
GRANT EXECUTE ON FUNCTION pg_start_backup(text, boolean, boolean) TO barman;
GRANT EXECUTE ON FUNCTION pg_stop_backup() TO barman;
GRANT EXECUTE ON FUNCTION pg_stop_backup(boolean, boolean) TO barman;
GRANT EXECUTE ON FUNCTION pg_switch_wal() TO barman;
GRANT EXECUTE ON FUNCTION pg_create_restore_point(text) TO barman;

-- PostgreSQL 15+
GRANT pg_read_all_settings TO barman;
GRANT pg_read_all_stats TO barman;
```

### Configure pg_hba.conf

```conf
# Allow barman connections
host    replication     barman          barman-server-ip/32     scram-sha-256
host    all             barman          barman-server-ip/32     scram-sha-256
```

### Create Replication Slot

```sql
SELECT pg_create_physical_replication_slot('barman');
```

## Barman Configuration

### Global Configuration

```ini
# /etc/barman.conf

[barman]
barman_home = /var/lib/barman
configuration_files_directory = /etc/barman.d
barman_user = barman
log_file = /var/log/barman/barman.log
log_level = INFO
compression = gzip
parallel_jobs = 4
network_compression = true
```

### Server Configuration

```ini
# /etc/barman.d/main.conf

[main]
description = "Main PostgreSQL Server"
ssh_command = ssh postgres@postgres-server
conninfo = host=postgres-server user=barman dbname=postgres
streaming_conninfo = host=postgres-server user=barman dbname=postgres
backup_method = postgres
streaming_archiver = on
slot_name = barman

# Backup settings
backup_directory = /var/lib/barman/main

# Retention policy
retention_policy = RECOVERY WINDOW OF 7 DAYS
wal_retention_policy = main
minimum_redundancy = 1

# Parallel backup
parallel_jobs = 4

# Reuse backup for incremental
reuse_backup = link
```

### Create Directories

```bash
# Create server directory
sudo -u barman mkdir -p /var/lib/barman/main
```

## Initialize and Verify

### Check Configuration

```bash
# Check all servers
sudo -u barman barman check all

# Check specific server
sudo -u barman barman check main

# Should show all OK:
# Server main:
#   PostgreSQL: OK
#   superuser or standard user with backup privileges: OK
#   wal_level: OK
#   directories: OK
#   retention policy settings: OK
#   backup maximum age: OK
#   compression settings: OK
#   WAL archive: OK
#   ...
```

### Receive WAL

```bash
# Start receiving WAL (continuous)
sudo -u barman barman receive-wal main

# Or switch WAL to test
sudo -u barman barman switch-wal main
```

### Cron Setup

```bash
# /etc/cron.d/barman

# Run maintenance every minute
* * * * * barman /usr/bin/barman cron

# Daily backup at 1 AM
0 1 * * * barman /usr/bin/barman backup main
```

## Backup Operations

### Create Backup

```bash
# Full backup
sudo -u barman barman backup main

# With wait for WAL
sudo -u barman barman backup main --wait

# Immediate checkpoint
sudo -u barman barman backup main --immediate-checkpoint
```

### List Backups

```bash
# List all backups
sudo -u barman barman list-backup main

# Detailed backup info
sudo -u barman barman show-backup main latest

# JSON output
sudo -u barman barman list-backup main --format=json
```

### Backup Information

```bash
# Show server status
sudo -u barman barman status main

# Show backup details
sudo -u barman barman show-backup main 20250121T010000

# Output:
# Backup 20250121T010000:
#   Server Name            : main
#   Status                 : DONE
#   PostgreSQL Version     : 160000
#   PGDATA directory       : /var/lib/postgresql/16/main
#   Base backup size       : 1.5 GiB
#   WAL size               : 128.0 MiB
#   Timeline               : 1
#   Begin LSN              : 0/3000028
#   End LSN                : 0/5000000
#   ...
```

## Retention Policies

### Configure Retention

```ini
# /etc/barman.d/main.conf

# Recovery window (keep backups for N days)
retention_policy = RECOVERY WINDOW OF 7 DAYS

# Or redundancy (keep N backups)
retention_policy = REDUNDANCY 3

# Minimum redundancy (never delete below this)
minimum_redundancy = 1
```

### Apply Retention

```bash
# Check what would be deleted
sudo -u barman barman delete main --dry-run

# Delete expired backups
sudo -u barman barman delete main oldest

# Run maintenance (includes retention)
sudo -u barman barman cron
```

## Recovery Operations

### List Recovery Targets

```bash
# List available recovery targets
sudo -u barman barman list-backup main

# Get WAL range
sudo -u barman barman show-backup main latest
```

### Full Recovery

```bash
# Recover to original location (on PostgreSQL server)
sudo -u barman barman recover main latest /var/lib/postgresql/16/main \
    --remote-ssh-command "ssh postgres@postgres-server"

# Recover to different host
sudo -u barman barman recover main latest /var/lib/postgresql/16/main \
    --remote-ssh-command "ssh postgres@new-server"
```

### Point-in-Time Recovery

```bash
# Recover to specific time
sudo -u barman barman recover main latest /var/lib/postgresql/16/main \
    --target-time "2025-01-21 14:30:00" \
    --remote-ssh-command "ssh postgres@postgres-server"

# Recover to specific transaction
sudo -u barman barman recover main latest /var/lib/postgresql/16/main \
    --target-xid 12345678 \
    --remote-ssh-command "ssh postgres@postgres-server"

# Recover to specific LSN
sudo -u barman barman recover main latest /var/lib/postgresql/16/main \
    --target-lsn "0/1234567" \
    --remote-ssh-command "ssh postgres@postgres-server"
```

### Recovery Options

```bash
# Recovery with standby mode
sudo -u barman barman recover main latest /var/lib/postgresql/16/main \
    --standby-mode \
    --remote-ssh-command "ssh postgres@new-standby"

# Get WAL from Barman
sudo -u barman barman recover main latest /var/lib/postgresql/16/main \
    --get-wal \
    --remote-ssh-command "ssh postgres@postgres-server"
```

## Multiple Servers

### Add Additional Server

```ini
# /etc/barman.d/secondary.conf

[secondary]
description = "Secondary PostgreSQL Server"
ssh_command = ssh postgres@secondary-server
conninfo = host=secondary-server user=barman dbname=postgres
streaming_conninfo = host=secondary-server user=barman dbname=postgres
backup_method = postgres
streaming_archiver = on
slot_name = barman_secondary
retention_policy = RECOVERY WINDOW OF 14 DAYS
```

### Manage All Servers

```bash
# Check all servers
sudo -u barman barman check all

# Backup all servers
sudo -u barman barman backup all

# List backups for all servers
sudo -u barman barman list-backup all
```

## Monitoring

### Status Commands

```bash
# Server status
sudo -u barman barman status main

# Replication status
sudo -u barman barman replication-status main

# Diagnose issues
sudo -u barman barman diagnose
```

### Monitoring Script

```bash
#!/bin/bash
# /usr/local/bin/check_barman.sh

SERVER=$1
MAX_AGE_HOURS=24

# Check backup status
BACKUP_INFO=$(sudo -u barman barman show-backup $SERVER latest 2>/dev/null)

if [ -z "$BACKUP_INFO" ]; then
    echo "CRITICAL: No backups found for $SERVER"
    exit 2
fi

# Check backup age
BACKUP_TIME=$(echo "$BACKUP_INFO" | grep "End Time" | awk '{print $4, $5}')
BACKUP_EPOCH=$(date -d "$BACKUP_TIME" +%s)
NOW_EPOCH=$(date +%s)
AGE_HOURS=$(( (NOW_EPOCH - BACKUP_EPOCH) / 3600 ))

if [ $AGE_HOURS -gt $MAX_AGE_HOURS ]; then
    echo "WARNING: Last backup is ${AGE_HOURS} hours old"
    exit 1
fi

# Check server status
CHECK_RESULT=$(sudo -u barman barman check $SERVER 2>&1)
FAILED=$(echo "$CHECK_RESULT" | grep -c "FAILED")

if [ $FAILED -gt 0 ]; then
    echo "CRITICAL: Barman check failed"
    echo "$CHECK_RESULT"
    exit 2
fi

echo "OK: Last backup ${AGE_HOURS} hours ago"
exit 0
```

### Nagios/Icinga Integration

```bash
# Use barman check with nagios output
sudo -u barman barman check main --nagios
```

## Parallel Backup and Recovery

### Configure Parallelism

```ini
# /etc/barman.d/main.conf

# Parallel backup
parallel_jobs = 4

# Network compression
network_compression = true
```

### Parallel Recovery

```bash
# Recovery with parallel jobs
sudo -u barman barman recover main latest /var/lib/postgresql/16/main \
    --jobs 4 \
    --remote-ssh-command "ssh postgres@postgres-server"
```

## Troubleshooting

### Common Issues

```bash
# Check SSH connectivity
sudo -u barman ssh postgres@postgres-server 'echo OK'

# Check PostgreSQL connectivity
sudo -u barman psql -h postgres-server -U barman -d postgres -c "SELECT 1"

# Check streaming
sudo -u barman barman receive-wal --test main

# Check WAL archive
sudo -u barman barman switch-wal --archive main
```

### Debug Mode

```bash
# Run with debug output
sudo -u barman barman -d backup main

# Check logs
tail -f /var/log/barman/barman.log
```

### Reset WAL Receive

```bash
# If WAL receiving gets stuck
sudo -u barman barman receive-wal --reset main
sudo -u barman barman receive-wal main
```

## Best Practices

1. **Separate Barman server** - Dedicated backup infrastructure
2. **Test recoveries** - Regular restore testing
3. **Monitor backup age** - Alert on stale backups
4. **Use streaming** - Lower RPO than archive-only
5. **Enable compression** - Save storage space
6. **Minimum redundancy** - Never go below 1 backup
7. **Document procedures** - Clear recovery runbooks

## Conclusion

Barman provides comprehensive PostgreSQL backup management:

1. **Centralized management** - Single point for all servers
2. **Multiple backup methods** - rsync and streaming
3. **Point-in-time recovery** - Precise data restoration
4. **Retention policies** - Automated backup lifecycle
5. **Parallel operations** - Fast backup and recovery

Combined with proper monitoring and testing, Barman ensures reliable PostgreSQL disaster recovery.
