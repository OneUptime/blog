# How to Use pg_restore for Database Recovery in PostgreSQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Database, Backup, Recovery, pg_restore, Disaster Recovery, DevOps

Description: Learn how to use pg_restore for PostgreSQL database recovery. This guide covers restore options, selective recovery, troubleshooting, and best practices for disaster recovery.

---

pg_restore is PostgreSQL's utility for restoring databases from backups created with pg_dump in custom, directory, or tar format. Unlike plain SQL backups that are restored with psql, pg_restore offers powerful features like selective restoration, parallel processing, and better error handling. This guide covers everything you need to know about using pg_restore effectively.

---

## Basic pg_restore Usage

### Restore to Existing Database

```bash
# Restore custom format backup to existing database
pg_restore -h localhost -U postgres -d mydb backup.dump

# Restore directory format backup
pg_restore -h localhost -U postgres -d mydb backup_dir/

# Restore tar format backup
pg_restore -h localhost -U postgres -d mydb backup.tar
```

### Create Database and Restore

```bash
# Create database first
createdb -h localhost -U postgres newdb

# Then restore
pg_restore -h localhost -U postgres -d newdb backup.dump

# Or use -C flag to include CREATE DATABASE in restore
pg_restore -h localhost -U postgres -C -d postgres backup.dump
```

---

## Common pg_restore Options

### Connection Options

```bash
# Specify host, port, user
pg_restore -h dbserver.example.com -p 5432 -U admin -d mydb backup.dump

# Use connection string
pg_restore "host=localhost dbname=mydb user=postgres" backup.dump

# Prompt for password
pg_restore -W -d mydb backup.dump
```

### Restore Behavior Options

```bash
# Clean (drop) objects before recreating
pg_restore -c -d mydb backup.dump

# Create database before restore
pg_restore -C -d postgres backup.dump

# Use single transaction (rollback on error)
pg_restore --single-transaction -d mydb backup.dump

# Continue on errors
pg_restore --no-acl --no-owner -d mydb backup.dump 2>&1 | tee restore.log
```

### Parallel Restore

```bash
# Restore using 4 parallel jobs (much faster for large databases)
pg_restore -j 4 -d mydb backup.dump

# For directory format, parallelism is most effective
pg_restore -j 8 -F d -d mydb backup_dir/
```

---

## Selective Restoration

### List Backup Contents

```bash
# List all objects in backup
pg_restore -l backup.dump > toc.txt

# Example output:
# 1; 1262 16384 DATABASE - mydb postgres
# 2; 1259 16385 TABLE public users postgres
# 3; 1259 16390 TABLE public orders postgres
# 4; 1259 16395 SEQUENCE public users_id_seq postgres
```

### Restore Specific Objects

```bash
# Restore specific table
pg_restore -t users -d mydb backup.dump

# Restore multiple tables
pg_restore -t users -t orders -t products -d mydb backup.dump

# Restore specific schema
pg_restore -n public -d mydb backup.dump

# Restore table and its indexes
pg_restore -t users -I idx_users_email -d mydb backup.dump

# Restore function
pg_restore -P 'calculate_total(integer)' -d mydb backup.dump
```

### Using Table of Contents File

```bash
# Create TOC file
pg_restore -l backup.dump > toc.txt

# Edit toc.txt to comment out items you don't want
# Lines starting with ; are skipped
# ;1; 1262 16384 DATABASE - mydb postgres  <- Commented out

# Restore using modified TOC
pg_restore -L toc.txt -d mydb backup.dump
```

---

## Data Only vs Schema Only

### Schema Only Restore

```bash
# Restore only the schema (no data)
pg_restore -s -d mydb backup.dump

# Useful for:
# - Setting up test environments
# - Creating empty database with same structure
```

### Data Only Restore

```bash
# Restore only the data (tables must exist)
pg_restore -a -d mydb backup.dump

# Useful for:
# - Refreshing data in existing database
# - Partial data recovery
```

### Disable Triggers During Data Load

```bash
# Disable triggers to avoid foreign key issues
pg_restore -a --disable-triggers -d mydb backup.dump

# Requires superuser or table owner privileges
```

---

## Handling Common Issues

### Permission Issues

```bash
# Restore without ownership information
pg_restore --no-owner -d mydb backup.dump

# Restore without privilege (GRANT) statements
pg_restore --no-acl -d mydb backup.dump

# Combined: Skip both ownership and privileges
pg_restore --no-owner --no-acl -d mydb backup.dump
```

### Missing Roles

```bash
# Error: role "original_owner" does not exist
# Solution 1: Create the role first
psql -U postgres -c "CREATE ROLE original_owner WITH LOGIN;"

# Solution 2: Skip ownership
pg_restore --no-owner -d mydb backup.dump

# Solution 3: Remap ownership
pg_restore --role=myuser -d mydb backup.dump
```

### Table Already Exists

```bash
# Drop objects before creating (clean restore)
pg_restore -c -d mydb backup.dump

# Or drop and recreate database
dropdb mydb
createdb mydb
pg_restore -d mydb backup.dump
```

### Foreign Key Violations

```bash
# Disable triggers during restore
pg_restore -a --disable-triggers -d mydb backup.dump

# Or use single transaction
pg_restore --single-transaction -d mydb backup.dump
```

---

## Restore Verification

### Check Restored Data

```sql
-- Compare row counts
SELECT
    schemaname,
    relname,
    n_live_tup AS row_count
FROM pg_stat_user_tables
ORDER BY schemaname, relname;

-- Check for missing tables
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Verify data integrity
SELECT COUNT(*) FROM users;
SELECT MAX(id) FROM orders;
```

### Automated Verification Script

```bash
#!/bin/bash
# verify_restore.sh

DB_NAME="$1"
EXPECTED_TABLES="users orders products customers"

echo "Verifying restore of $DB_NAME..."

for table in $EXPECTED_TABLES; do
    count=$(psql -U postgres -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM $table" 2>/dev/null)

    if [ $? -eq 0 ]; then
        echo "  $table: $count rows"
    else
        echo "  $table: MISSING or ERROR"
    fi
done

# Check for constraint violations
echo "Checking constraints..."
psql -U postgres -d "$DB_NAME" -c "
    SELECT conname, conrelid::regclass
    FROM pg_constraint
    WHERE NOT convalidated;
"
```

---

## Disaster Recovery Scenarios

### Full Database Recovery

```bash
#!/bin/bash
# full_recovery.sh

BACKUP_FILE="$1"
DB_NAME="${2:-restored_db}"
DB_USER="postgres"

echo "Starting full database recovery..."

# Drop existing database if it exists
dropdb --if-exists -U "$DB_USER" "$DB_NAME"

# Create new database
createdb -U "$DB_USER" "$DB_NAME"

# Restore with parallel jobs
pg_restore -j 4 -U "$DB_USER" -d "$DB_NAME" \
    --no-owner \
    --no-acl \
    --verbose \
    "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo "Recovery completed successfully"

    # Run ANALYZE to update statistics
    psql -U "$DB_USER" -d "$DB_NAME" -c "ANALYZE;"

    # Show database size
    psql -U "$DB_USER" -d "$DB_NAME" -c "
        SELECT pg_size_pretty(pg_database_size('$DB_NAME'));
    "
else
    echo "Recovery failed!"
    exit 1
fi
```

### Point-in-Time Recovery

For point-in-time recovery, you need both base backup and WAL archives:

```bash
# 1. Restore base backup
pg_restore -d mydb base_backup.dump

# 2. Apply WAL files up to target time
# Configure recovery.conf or postgresql.conf:
# restore_command = 'cp /archive/%f %p'
# recovery_target_time = '2026-01-25 10:30:00'

# 3. Start PostgreSQL - it will replay WAL to target time
```

### Selective Table Recovery

```bash
#!/bin/bash
# recover_table.sh

BACKUP_FILE="$1"
TABLE_NAME="$2"
DB_NAME="$3"

echo "Recovering table $TABLE_NAME from $BACKUP_FILE"

# Create temporary database
createdb -U postgres "${DB_NAME}_recovery"

# Restore only the target table
pg_restore -U postgres -d "${DB_NAME}_recovery" \
    -t "$TABLE_NAME" \
    --no-owner \
    "$BACKUP_FILE"

# Copy data to production database
psql -U postgres -d "$DB_NAME" -c "
    TRUNCATE TABLE $TABLE_NAME;
"

pg_dump -U postgres -t "$TABLE_NAME" "${DB_NAME}_recovery" | \
    psql -U postgres -d "$DB_NAME"

# Clean up
dropdb -U postgres "${DB_NAME}_recovery"

echo "Table $TABLE_NAME recovered"
```

---

## Performance Optimization

### Optimize Restore Speed

```bash
# Use maximum parallel jobs (match CPU cores)
pg_restore -j 8 -d mydb backup.dump

# Disable synchronous commit during restore
psql -U postgres -d mydb -c "ALTER SYSTEM SET synchronous_commit = off;"
pg_restore -d mydb backup.dump
psql -U postgres -d mydb -c "ALTER SYSTEM SET synchronous_commit = on;"
psql -U postgres -c "SELECT pg_reload_conf();"

# Increase maintenance_work_mem
psql -U postgres -d mydb -c "SET maintenance_work_mem = '2GB';"
```

### Post-Restore Optimization

```sql
-- Update statistics after restore
ANALYZE;

-- Rebuild indexes if needed
REINDEX DATABASE mydb;

-- Reset sequences to correct values
SELECT setval(pg_get_serial_sequence('users', 'id'), COALESCE(MAX(id), 0) + 1, false)
FROM users;
```

---

## Best Practices

### 1. Test Restores Regularly

```bash
# Monthly restore test
#!/bin/bash
TEST_DB="restore_test_$(date +%Y%m%d)"
BACKUP_FILE="/backups/latest.dump"

createdb -U postgres "$TEST_DB"
pg_restore -d "$TEST_DB" --no-owner "$BACKUP_FILE"

# Run verification
./verify_restore.sh "$TEST_DB"

# Clean up
dropdb -U postgres "$TEST_DB"
```

### 2. Document Recovery Procedures

Keep runbooks with:
- Location of backups
- Recovery commands
- Verification steps
- Expected recovery times

### 3. Monitor Restore Progress

```bash
# For large restores, monitor progress
pg_restore -v -d mydb backup.dump 2>&1 | tee restore.log &

# Monitor in another terminal
tail -f restore.log
```

### 4. Keep Multiple Backup Copies

- Daily backups retained for 7 days
- Weekly backups retained for 4 weeks
- Monthly backups retained for 12 months

---

## Quick Reference

| Task | Command |
|------|---------|
| Basic restore | `pg_restore -d mydb backup.dump` |
| Parallel restore | `pg_restore -j 4 -d mydb backup.dump` |
| Clean restore | `pg_restore -c -d mydb backup.dump` |
| Single table | `pg_restore -t users -d mydb backup.dump` |
| Schema only | `pg_restore -s -d mydb backup.dump` |
| Data only | `pg_restore -a -d mydb backup.dump` |
| Skip ownership | `pg_restore --no-owner -d mydb backup.dump` |
| List contents | `pg_restore -l backup.dump` |

---

## Conclusion

pg_restore is essential for PostgreSQL disaster recovery:

- **Use parallel restore** (`-j`) for faster recovery of large databases
- **Test restores regularly** to ensure backups are valid
- **Use selective restore** to recover specific tables or schemas
- **Handle permissions** with `--no-owner` and `--no-acl` when needed
- **Verify restored data** to confirm successful recovery

A tested backup and restore procedure is critical for any production database.

---

*Need to monitor your PostgreSQL backups and recovery? [OneUptime](https://oneuptime.com) provides comprehensive backup monitoring including restore testing, recovery time tracking, and disaster recovery alerts.*
