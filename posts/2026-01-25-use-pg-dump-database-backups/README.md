# How to Use pg_dump for Database Backups in PostgreSQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Database, Backup, pg_dump, Recovery, DevOps, Disaster Recovery

Description: Learn how to use pg_dump for PostgreSQL database backups. This guide covers backup formats, automation strategies, best practices, and recovery procedures for protecting your data.

---

pg_dump is PostgreSQL's built-in utility for creating database backups. It creates consistent snapshots of your database that can be restored to recover from disasters, migrate data, or clone databases for development. This guide covers everything you need to know about using pg_dump effectively.

---

## pg_dump Basics

### Simple Backup

```bash
# Basic backup to SQL file
pg_dump -h localhost -U postgres mydb > backup.sql

# With password (prompted)
pg_dump -h localhost -U postgres -W mydb > backup.sql

# Using connection string
pg_dump "postgresql://user:pass@localhost:5432/mydb" > backup.sql
```

### Restore from SQL Backup

```bash
# Restore to existing database
psql -h localhost -U postgres -d mydb < backup.sql

# Create database and restore
createdb -h localhost -U postgres newdb
psql -h localhost -U postgres -d newdb < backup.sql
```

---

## Backup Formats

pg_dump supports several output formats, each with different use cases:

```mermaid
graph TD
    A[pg_dump Formats] --> B[Plain SQL -Fp]
    A --> C[Custom -Fc]
    A --> D[Directory -Fd]
    A --> E[Tar -Ft]

    B --> B1[Human readable]
    B --> B2[Can edit with text editor]
    B --> B3[Restore with psql]

    C --> C1[Compressed by default]
    C --> C2[Selective restore]
    C --> C3[Restore with pg_restore]

    D --> D1[Parallel backup/restore]
    D --> D2[One file per table]
    D --> D3[Best for large databases]

    E --> E1[Single archive file]
    E --> E2[Portable]
    E --> E3[Less efficient than custom]
```

### Plain SQL Format (Default)

```bash
# Plain SQL - human readable, can be edited
pg_dump -F p -h localhost -U postgres mydb > backup.sql

# Compressed plain SQL
pg_dump -h localhost -U postgres mydb | gzip > backup.sql.gz

# Restore plain SQL
psql -d mydb < backup.sql

# Restore compressed
gunzip -c backup.sql.gz | psql -d mydb
```

### Custom Format (Recommended)

```bash
# Custom format - compressed, supports selective restore
pg_dump -F c -h localhost -U postgres mydb -f backup.dump

# Restore entire database
pg_restore -h localhost -U postgres -d mydb backup.dump

# Restore specific table only
pg_restore -h localhost -U postgres -d mydb -t users backup.dump

# List contents of backup
pg_restore -l backup.dump
```

### Directory Format (Best for Large Databases)

```bash
# Directory format - parallel backup and restore
pg_dump -F d -j 4 -h localhost -U postgres mydb -f backup_dir/

# Parallel restore (4 jobs)
pg_restore -F d -j 4 -h localhost -U postgres -d mydb backup_dir/
```

---

## Common pg_dump Options

### Data Selection

```bash
# Backup specific tables
pg_dump -t users -t orders mydb > tables_backup.sql

# Backup tables matching pattern
pg_dump -t 'user*' mydb > user_tables.sql

# Exclude specific tables
pg_dump -T audit_logs -T temp_data mydb > backup_no_logs.sql

# Backup specific schema
pg_dump -n public mydb > public_schema.sql

# Exclude schema
pg_dump -N pg_catalog mydb > backup.sql

# Schema only (no data)
pg_dump -s mydb > schema_only.sql

# Data only (no schema)
pg_dump -a mydb > data_only.sql
```

### Output Options

```bash
# Include CREATE DATABASE statement
pg_dump -C mydb > backup_with_create.sql

# Clean (DROP) before CREATE
pg_dump -c mydb > backup_clean.sql

# Use INSERT instead of COPY (slower but more compatible)
pg_dump --inserts mydb > backup_inserts.sql

# Include column names in INSERT statements
pg_dump --column-inserts mydb > backup_column_inserts.sql

# Disable triggers during restore (useful for foreign keys)
pg_dump --disable-triggers mydb > backup_notriggers.sql
```

---

## Automated Backup Scripts

### Daily Backup Script

```bash
#!/bin/bash
# daily_backup.sh - Automated PostgreSQL backup script

# Configuration
DB_HOST="localhost"
DB_PORT="5432"
DB_USER="postgres"
DB_NAME="production_db"
BACKUP_DIR="/var/backups/postgresql"
RETENTION_DAYS=7

# Create timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.dump"

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

# Create backup
echo "Starting backup of $DB_NAME..."
pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" \
    -F c -Z 9 \
    -f "$BACKUP_FILE" \
    "$DB_NAME"

# Check if backup was successful
if [ $? -eq 0 ]; then
    echo "Backup completed: $BACKUP_FILE"
    echo "Size: $(du -h "$BACKUP_FILE" | cut -f1)"

    # Remove old backups
    echo "Removing backups older than $RETENTION_DAYS days..."
    find "$BACKUP_DIR" -name "${DB_NAME}_*.dump" -mtime +$RETENTION_DAYS -delete

    # List current backups
    echo "Current backups:"
    ls -lh "$BACKUP_DIR"/${DB_NAME}_*.dump
else
    echo "ERROR: Backup failed!"
    exit 1
fi
```

### Backup with Verification

```bash
#!/bin/bash
# backup_with_verify.sh

DB_NAME="mydb"
BACKUP_FILE="backup_$(date +%Y%m%d).dump"
VERIFY_DB="verify_${DB_NAME}"

# Create backup
pg_dump -F c -h localhost -U postgres "$DB_NAME" -f "$BACKUP_FILE"

# Verify backup by restoring to temporary database
echo "Verifying backup..."

# Create verification database
dropdb --if-exists -h localhost -U postgres "$VERIFY_DB"
createdb -h localhost -U postgres "$VERIFY_DB"

# Restore to verification database
pg_restore -h localhost -U postgres -d "$VERIFY_DB" "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    # Run a simple verification query
    ORIG_COUNT=$(psql -h localhost -U postgres -t -c "SELECT COUNT(*) FROM users" "$DB_NAME")
    VERIFY_COUNT=$(psql -h localhost -U postgres -t -c "SELECT COUNT(*) FROM users" "$VERIFY_DB")

    if [ "$ORIG_COUNT" = "$VERIFY_COUNT" ]; then
        echo "Backup verified successfully!"
        echo "Row counts match: $ORIG_COUNT"
    else
        echo "WARNING: Row counts differ! Original: $ORIG_COUNT, Restored: $VERIFY_COUNT"
    fi

    # Clean up verification database
    dropdb -h localhost -U postgres "$VERIFY_DB"
else
    echo "ERROR: Backup verification failed!"
    exit 1
fi
```

### Backup to S3

```bash
#!/bin/bash
# backup_to_s3.sh

DB_NAME="production"
S3_BUCKET="my-db-backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create backup and stream directly to S3
pg_dump -h localhost -U postgres -F c "$DB_NAME" | \
    aws s3 cp - "s3://${S3_BUCKET}/${DB_NAME}/${DB_NAME}_${TIMESTAMP}.dump"

if [ $? -eq 0 ]; then
    echo "Backup uploaded to S3: s3://${S3_BUCKET}/${DB_NAME}/${DB_NAME}_${TIMESTAMP}.dump"

    # Remove S3 backups older than 30 days
    aws s3 ls "s3://${S3_BUCKET}/${DB_NAME}/" | \
    while read -r line; do
        file_date=$(echo "$line" | awk '{print $1}')
        file_name=$(echo "$line" | awk '{print $4}')

        if [[ $(date -d "$file_date" +%s) -lt $(date -d "30 days ago" +%s) ]]; then
            aws s3 rm "s3://${S3_BUCKET}/${DB_NAME}/${file_name}"
            echo "Deleted old backup: $file_name"
        fi
    done
else
    echo "ERROR: Backup to S3 failed!"
    exit 1
fi
```

---

## pg_dumpall for Full Cluster Backup

```bash
# Backup all databases including globals (roles, tablespaces)
pg_dumpall -h localhost -U postgres > full_cluster_backup.sql

# Backup only global objects (roles, tablespaces)
pg_dumpall -h localhost -U postgres --globals-only > globals.sql

# Backup only roles
pg_dumpall -h localhost -U postgres --roles-only > roles.sql

# Restore full cluster
psql -h localhost -U postgres -f full_cluster_backup.sql postgres
```

---

## Handling Large Databases

### Parallel Backup

```bash
# Use directory format with parallel jobs
# -j specifies number of parallel jobs
pg_dump -F d -j 8 -h localhost -U postgres large_db -f backup_dir/

# Parallel restore
pg_restore -F d -j 8 -h localhost -U postgres -d large_db backup_dir/
```

### Compression Options

```bash
# Maximum compression (slower, smaller file)
pg_dump -F c -Z 9 -h localhost -U postgres mydb -f backup.dump

# No compression (faster, larger file)
pg_dump -F c -Z 0 -h localhost -U postgres mydb -f backup.dump

# External compression with pigz (parallel gzip)
pg_dump -F p -h localhost -U postgres mydb | pigz -p 4 > backup.sql.gz

# Restore with pigz
pigz -dc backup.sql.gz | psql -h localhost -U postgres -d mydb
```

### Splitting Large Backups

```bash
# Split backup into 1GB chunks
pg_dump -F p -h localhost -U postgres mydb | split -b 1G - backup_part_

# Restore from split files
cat backup_part_* | psql -h localhost -U postgres -d mydb
```

---

## Recovery Scenarios

### Point-in-Time Recovery Setup

```bash
# Enable archiving in postgresql.conf
# archive_mode = on
# archive_command = 'cp %p /var/lib/postgresql/archive/%f'

# Create base backup
pg_basebackup -h localhost -U postgres -D /var/lib/postgresql/backup \
    -Fp -Xs -P

# For point-in-time recovery, you also need WAL archives
# This allows recovery to any point in time
```

### Restore Specific Objects

```bash
# List contents of backup
pg_restore -l backup.dump > toc.txt

# Edit toc.txt to comment out items you don't want
# Then restore with modified TOC
pg_restore -L toc.txt -d mydb backup.dump

# Restore single table
pg_restore -t users -d mydb backup.dump

# Restore single function
pg_restore -P 'my_function(integer)' -d mydb backup.dump
```

---

## Best Practices

### Security

```bash
# Use .pgpass file for credentials
# ~/.pgpass format: hostname:port:database:username:password
echo "localhost:5432:mydb:backup_user:secret123" >> ~/.pgpass
chmod 600 ~/.pgpass

# Now pg_dump works without password prompt
pg_dump -h localhost -U backup_user mydb > backup.sql

# Use environment variables
export PGPASSWORD='secret123'
pg_dump -h localhost -U backup_user mydb > backup.sql
unset PGPASSWORD
```

### Monitoring Backups

```sql
-- Create backup log table
CREATE TABLE backup_log (
    id SERIAL PRIMARY KEY,
    backup_type VARCHAR(50),
    database_name VARCHAR(100),
    backup_file VARCHAR(255),
    backup_size_bytes BIGINT,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    status VARCHAR(20),
    error_message TEXT
);

-- Query backup history
SELECT
    database_name,
    backup_type,
    pg_size_pretty(backup_size_bytes) AS size,
    completed_at - started_at AS duration,
    status
FROM backup_log
WHERE started_at > NOW() - INTERVAL '7 days'
ORDER BY started_at DESC;
```

### Testing Restores

```bash
# Always test your backups!
# Script to restore to a test environment

TEST_DB="test_restore_$(date +%Y%m%d)"
BACKUP_FILE="/backups/latest.dump"

# Create test database
createdb -h localhost -U postgres "$TEST_DB"

# Restore
pg_restore -h localhost -U postgres -d "$TEST_DB" "$BACKUP_FILE"

# Run verification queries
psql -h localhost -U postgres -d "$TEST_DB" <<EOF
SELECT COUNT(*) AS user_count FROM users;
SELECT COUNT(*) AS order_count FROM orders;
SELECT MAX(created_at) AS latest_data FROM events;
EOF

# Clean up
dropdb -h localhost -U postgres "$TEST_DB"
```

---

## Quick Reference

| Task | Command |
|------|---------|
| Simple backup | `pg_dump mydb > backup.sql` |
| Compressed backup | `pg_dump -Fc mydb > backup.dump` |
| Parallel backup | `pg_dump -Fd -j4 mydb -f backup_dir` |
| Schema only | `pg_dump -s mydb > schema.sql` |
| Data only | `pg_dump -a mydb > data.sql` |
| Single table | `pg_dump -t users mydb > users.sql` |
| Restore SQL | `psql -d mydb < backup.sql` |
| Restore custom | `pg_restore -d mydb backup.dump` |
| All databases | `pg_dumpall > all_dbs.sql` |

---

## Conclusion

pg_dump is an essential tool for PostgreSQL database protection. Key takeaways:

- **Use custom format (-Fc)** for most backups due to compression and flexibility
- **Use directory format (-Fd)** with parallel jobs for large databases
- **Automate backups** with cron and retention policies
- **Always verify backups** by testing restores
- **Store backups offsite** (S3, remote servers) for disaster recovery

Regular, tested backups are your best protection against data loss.

---

*Need to monitor your PostgreSQL backups? [OneUptime](https://oneuptime.com) provides comprehensive backup monitoring with alerts for failed backups, size anomalies, and missed schedules.*
