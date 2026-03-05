# How to Back Up PostgreSQL with pg_dump

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Backup, pg_dump, Disaster Recovery, Database Administration

Description: A comprehensive guide to backing up PostgreSQL databases with pg_dump, covering backup formats, compression, automation, and restoration procedures.

---

pg_dump is PostgreSQL's built-in tool for creating logical backups. It creates consistent backups even while the database is in use. This guide covers all aspects of using pg_dump for reliable database backups.

## Prerequisites

- PostgreSQL client tools installed
- Access to the database
- Sufficient disk space for backups
- Understanding of backup requirements

## Basic pg_dump Usage

### Simple Backup

```bash
# Backup single database
pg_dump mydb > backup.sql

# Backup with connection parameters
pg_dump -h localhost -p 5432 -U myuser mydb > backup.sql

# Using connection string
pg_dump "postgresql://user:password@host:5432/mydb" > backup.sql
```

### Common Options

| Option | Description |
|--------|-------------|
| `-h` | Database host |
| `-p` | Database port |
| `-U` | Username |
| `-d` | Database name |
| `-F` | Output format (p, c, d, t) |
| `-f` | Output file |
| `-j` | Parallel jobs |
| `-Z` | Compression level |

## Backup Formats

### Plain SQL (-Fp)

```bash
# Plain SQL format (default)
pg_dump -Fp mydb > backup.sql

# Readable, can be edited
# Restore with psql
psql mydb < backup.sql
```

### Custom Format (-Fc)

```bash
# Custom format (compressed, flexible)
pg_dump -Fc mydb > backup.dump

# Supports selective restore
# Restore with pg_restore
pg_restore -d mydb backup.dump
```

### Directory Format (-Fd)

```bash
# Directory format (parallel backup/restore)
pg_dump -Fd -j 4 mydb -f backup_dir/

# Creates directory with multiple files
# Supports parallel restore
pg_restore -j 4 -d mydb backup_dir/
```

### Tar Format (-Ft)

```bash
# Tar format
pg_dump -Ft mydb > backup.tar

# Standard tar archive
pg_restore -d mydb backup.tar
```

## Selective Backups

### Specific Tables

```bash
# Single table
pg_dump -t users mydb > users.sql

# Multiple tables
pg_dump -t users -t orders -t products mydb > tables.sql

# Tables matching pattern
pg_dump -t 'sales_*' mydb > sales_tables.sql
```

### Exclude Tables

```bash
# Exclude specific tables
pg_dump -T logs -T audit_trail mydb > backup.sql

# Exclude pattern
pg_dump -T '*_log' -T '*_archive' mydb > backup.sql
```

### Schema Only

```bash
# Schema without data
pg_dump --schema-only mydb > schema.sql

# Data only
pg_dump --data-only mydb > data.sql
```

### Specific Schemas

```bash
# Single schema
pg_dump -n public mydb > public_schema.sql

# Multiple schemas
pg_dump -n public -n analytics mydb > schemas.sql

# Exclude schema
pg_dump -N temp_schema mydb > backup.sql
```

## Compression

### Built-in Compression

```bash
# Compress with gzip (custom format)
pg_dump -Fc -Z 9 mydb > backup.dump

# Compression levels 0-9
# 0 = no compression
# 9 = maximum compression
```

### External Compression

```bash
# Pipe to gzip
pg_dump mydb | gzip > backup.sql.gz

# Pipe to bzip2
pg_dump mydb | bzip2 > backup.sql.bz2

# Pipe to zstd (fast)
pg_dump mydb | zstd > backup.sql.zst

# Parallel compression with pigz
pg_dump mydb | pigz > backup.sql.gz
```

## Backup All Databases

### pg_dumpall

```bash
# Backup all databases including globals
pg_dumpall > all_databases.sql

# Globals only (roles, tablespaces)
pg_dumpall --globals-only > globals.sql

# Roles only
pg_dumpall --roles-only > roles.sql
```

## Restoration

### Restore from Plain SQL

```bash
# Basic restore
psql mydb < backup.sql

# Create database first
createdb mydb
psql mydb < backup.sql

# With error handling
psql -v ON_ERROR_STOP=1 mydb < backup.sql
```

### Restore with pg_restore

```bash
# Basic restore
pg_restore -d mydb backup.dump

# Create database and restore
pg_restore -C -d postgres backup.dump

# Parallel restore
pg_restore -j 4 -d mydb backup.dump

# Clean (drop objects before restore)
pg_restore -c -d mydb backup.dump

# Schema only
pg_restore --schema-only -d mydb backup.dump

# Data only
pg_restore --data-only -d mydb backup.dump
```

### Selective Restore

```bash
# List contents
pg_restore -l backup.dump > toc.txt

# Edit toc.txt to select objects
# Restore selected objects
pg_restore -L toc.txt -d mydb backup.dump

# Specific table
pg_restore -t users -d mydb backup.dump

# Specific schema
pg_restore -n public -d mydb backup.dump
```

## Automation Scripts

### Daily Backup Script

```bash
#!/bin/bash
# daily_backup.sh

set -e

# Configuration
DB_HOST="localhost"
DB_PORT="5432"
DB_USER="postgres"
DB_NAME="myapp"
BACKUP_DIR="/var/backups/postgresql"
RETENTION_DAYS=7

# Create timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.dump"

# Create backup directory
mkdir -p "${BACKUP_DIR}"

# Perform backup
echo "Starting backup of ${DB_NAME}..."
PGPASSWORD="${DB_PASSWORD}" pg_dump \
    -h "${DB_HOST}" \
    -p "${DB_PORT}" \
    -U "${DB_USER}" \
    -Fc \
    -Z 9 \
    "${DB_NAME}" > "${BACKUP_FILE}"

# Verify backup
if [ -f "${BACKUP_FILE}" ]; then
    SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
    echo "Backup completed: ${BACKUP_FILE} (${SIZE})"
else
    echo "ERROR: Backup failed!"
    exit 1
fi

# Cleanup old backups
echo "Cleaning up backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -name "${DB_NAME}_*.dump" -mtime +${RETENTION_DAYS} -delete

echo "Backup completed successfully!"
```

### Multi-Database Backup

```bash
#!/bin/bash
# backup_all_databases.sh

set -e

BACKUP_DIR="/var/backups/postgresql"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Get list of databases
DATABASES=$(psql -t -c "SELECT datname FROM pg_database WHERE datname NOT IN ('template0', 'template1', 'postgres')")

for DB in ${DATABASES}; do
    echo "Backing up ${DB}..."
    pg_dump -Fc -Z 9 "${DB}" > "${BACKUP_DIR}/${DB}_${TIMESTAMP}.dump"
done

# Backup globals
pg_dumpall --globals-only > "${BACKUP_DIR}/globals_${TIMESTAMP}.sql"

echo "All backups completed!"
```

### Cron Configuration

```bash
# Edit crontab
crontab -e

# Daily backup at 2 AM
0 2 * * * /usr/local/bin/daily_backup.sh >> /var/log/pg_backup.log 2>&1

# Weekly full backup Sunday at 1 AM
0 1 * * 0 /usr/local/bin/weekly_backup.sh >> /var/log/pg_backup.log 2>&1
```

## Remote Backups

### Backup to Remote Server

```bash
# SSH tunnel
pg_dump -h localhost -p 5432 mydb | ssh user@backup-server "cat > /backups/mydb.sql"

# With compression
pg_dump mydb | gzip | ssh user@backup-server "cat > /backups/mydb.sql.gz"
```

### Backup to S3

```bash
# Using AWS CLI
pg_dump -Fc mydb | aws s3 cp - s3://my-bucket/backups/mydb_$(date +%Y%m%d).dump

# With compression
pg_dump mydb | gzip | aws s3 cp - s3://my-bucket/backups/mydb_$(date +%Y%m%d).sql.gz
```

## Testing Backups

### Verify Backup

```bash
# List contents of backup
pg_restore -l backup.dump

# Test restore to different database
createdb mydb_test
pg_restore -d mydb_test backup.dump

# Verify data
psql mydb_test -c "SELECT COUNT(*) FROM users;"

# Clean up
dropdb mydb_test
```

### Automated Verification

```bash
#!/bin/bash
# verify_backup.sh

BACKUP_FILE=$1
TEST_DB="backup_test_$$"

# Create test database
createdb ${TEST_DB}

# Restore backup
if pg_restore -d ${TEST_DB} ${BACKUP_FILE} 2>/dev/null; then
    echo "Backup verified successfully: ${BACKUP_FILE}"
    RESULT=0
else
    echo "ERROR: Backup verification failed: ${BACKUP_FILE}"
    RESULT=1
fi

# Cleanup
dropdb ${TEST_DB}

exit ${RESULT}
```

## Best Practices

### Backup Strategy

1. **Daily incremental** or full backups
2. **Weekly full backups** retained longer
3. **Test restores** regularly
4. **Multiple backup locations** (local + remote)
5. **Monitor backup success**

### Performance Tips

```bash
# Use parallel backup for large databases
pg_dump -Fd -j 4 mydb -f backup_dir/

# Exclude large tables that can be regenerated
pg_dump -T large_cache_table mydb > backup.sql

# Separate schema and data for flexibility
pg_dump --schema-only mydb > schema.sql
pg_dump --data-only mydb > data.sql
```

### Security

```bash
# Use .pgpass file for passwords
# ~/.pgpass format: hostname:port:database:username:password
chmod 600 ~/.pgpass

# Encrypt backups
pg_dump mydb | gpg --encrypt -r backup@company.com > backup.sql.gpg
```

## Conclusion

pg_dump provides flexible PostgreSQL backup capabilities:

1. **Multiple formats** for different use cases
2. **Selective backup** of tables and schemas
3. **Compression** for storage efficiency
4. **Parallel operation** for large databases
5. **Easy automation** with scripting

Combine pg_dump with proper retention policies and regular testing for a reliable backup strategy.
