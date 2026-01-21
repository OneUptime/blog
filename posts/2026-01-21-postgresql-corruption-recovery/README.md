# How to Recover from PostgreSQL Corruption

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Data Recovery, Corruption, Disaster Recovery, pg_resetwal

Description: A guide to detecting and recovering from PostgreSQL data corruption, covering diagnostic tools and recovery procedures.

---

Data corruption can occur due to hardware failures, bugs, or improper shutdowns. This guide covers detection and recovery.

## Detecting Corruption

### Check Data Checksums

```bash
# Check if checksums enabled
sudo -u postgres psql -c "SHOW data_checksums;"

# Verify checksums (offline)
pg_checksums -D /var/lib/postgresql/16/main --check
```

### amcheck Extension

```sql
CREATE EXTENSION amcheck;

-- Check B-tree index integrity
SELECT bt_index_check('idx_users_email');

-- Check with parent verification (slower)
SELECT bt_index_check('idx_users_email', true);

-- Check all indexes
SELECT bt_index_check(c.oid)
FROM pg_index i
JOIN pg_class c ON c.oid = i.indexrelid
WHERE c.relkind = 'i';
```

### Check for Errors

```bash
# Check PostgreSQL logs for errors
grep -i "error\|corrupt\|invalid\|checksum" /var/log/postgresql/*.log
```

## Recovery Procedures

### From Backup (Safest)

```bash
# Stop PostgreSQL
sudo systemctl stop postgresql

# Restore from backup
pg_restore -d myapp /path/to/backup.dump

# Or use PITR
sudo -u postgres pgbackrest --stanza=main restore
```

### Reindex Corrupted Indexes

```sql
-- Reindex specific index
REINDEX INDEX CONCURRENTLY idx_users_email;

-- Reindex entire table
REINDEX TABLE CONCURRENTLY users;

-- Reindex entire database
REINDEX DATABASE CONCURRENTLY myapp;
```

### Reset WAL (Last Resort)

```bash
# WARNING: Data loss possible!
# Only use when PostgreSQL won't start

# Stop PostgreSQL
sudo systemctl stop postgresql

# Reset WAL
sudo -u postgres pg_resetwal -D /var/lib/postgresql/16/main

# Start PostgreSQL
sudo systemctl start postgresql
```

### Dump and Restore

```bash
# If database is readable but corrupted
pg_dump -Fc myapp > backup_before_fix.dump

# Create new database
createdb myapp_new

# Restore
pg_restore -d myapp_new backup_before_fix.dump
```

## Single Table Recovery

```sql
-- Dump table from corrupted database
COPY (SELECT * FROM users WHERE ctid IS NOT NULL) TO '/tmp/users.csv' CSV;

-- Create new table
CREATE TABLE users_new (LIKE users INCLUDING ALL);

-- Import data
COPY users_new FROM '/tmp/users.csv' CSV;

-- Swap tables
ALTER TABLE users RENAME TO users_old;
ALTER TABLE users_new RENAME TO users;
```

## Prevention

### Enable Checksums

```bash
# New cluster
initdb --data-checksums -D /var/lib/postgresql/16/main

# Existing cluster (PostgreSQL 12+)
pg_checksums --enable -D /var/lib/postgresql/16/main
```

### Regular Verification

```bash
# Scheduled verification
0 3 * * 0 postgres pg_checksums -D /var/lib/postgresql/16/main --check >> /var/log/pg_checksum.log 2>&1
```

## Best Practices

1. **Enable checksums** - Detect corruption early
2. **Regular backups** - Multiple restore points
3. **Test restores** - Verify backups work
4. **Monitor logs** - Catch errors early
5. **Use ECC RAM** - Prevent memory errors
6. **Reliable storage** - RAID, checksummed filesystems

## Conclusion

Prevent corruption with checksums and reliable hardware. When corruption occurs, restore from backup when possible. Use recovery tools like pg_resetwal only as a last resort.
