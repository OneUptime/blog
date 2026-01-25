# How to Fix "cannot open tablespace" Errors in PostgreSQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Database, Troubleshooting, Tablespace, Storage, File System

Description: Learn how to diagnose and fix "cannot open tablespace" errors in PostgreSQL. This guide covers tablespace configuration, permission issues, and recovery procedures.

---

The "cannot open tablespace" error in PostgreSQL indicates that the database cannot access a tablespace directory. This can happen due to missing directories, permission problems, unmounted file systems, or corrupted symbolic links. This guide will help you diagnose and resolve these issues.

---

## Understanding the Error

When you see this error:

```
FATAL: could not open tablespace directory "pg_tblspc/16385": No such file or directory

ERROR: could not open file "pg_tblspc/16385/PG_14_202107181/16386/16387": Permission denied

PANIC: could not open tablespace directory "pg_tblspc/16385": Input/output error
```

It indicates one of these problems:
- The tablespace directory does not exist
- PostgreSQL does not have permission to access it
- The underlying storage is unavailable
- Symbolic links are broken

---

## Diagnosing the Issue

### List All Tablespaces

```sql
-- View tablespaces and their locations
SELECT
    spcname AS tablespace_name,
    pg_tablespace_location(oid) AS location,
    pg_size_pretty(pg_tablespace_size(oid)) AS size
FROM pg_tablespace;

-- Check tablespace OIDs
SELECT oid, spcname FROM pg_tablespace;
```

### Check Tablespace Directory Structure

```bash
# PostgreSQL stores tablespace symlinks here
ls -la $PGDATA/pg_tblspc/

# Example output:
# lrwxrwxrwx 1 postgres postgres 25 Jan 25 10:00 16385 -> /mnt/data/pg_tablespace

# Check if symlink target exists
readlink -f $PGDATA/pg_tblspc/16385
ls -la /mnt/data/pg_tablespace/
```

### Check Permissions

```bash
# Check ownership of tablespace directory
ls -la /mnt/data/pg_tablespace/

# Should be owned by postgres user
# drwx------ 3 postgres postgres 4096 Jan 25 10:00 pg_tablespace

# Check if mounted
df -h /mnt/data/
mount | grep /mnt/data
```

---

## Common Causes and Solutions

### Cause 1: Missing Tablespace Directory

The tablespace directory was deleted or never created.

```bash
# Check if directory exists
ls -la /path/to/tablespace/

# If missing, recreate it
sudo mkdir -p /path/to/tablespace
sudo chown postgres:postgres /path/to/tablespace
sudo chmod 700 /path/to/tablespace
```

### Cause 2: Broken Symbolic Link

```bash
# Check if symlink is valid
ls -la $PGDATA/pg_tblspc/16385

# If broken (shows red in ls), recreate it
sudo rm $PGDATA/pg_tblspc/16385
sudo ln -s /correct/path/to/tablespace $PGDATA/pg_tblspc/16385
sudo chown -h postgres:postgres $PGDATA/pg_tblspc/16385
```

### Cause 3: Permission Issues

```bash
# Fix directory permissions
sudo chown -R postgres:postgres /path/to/tablespace
sudo chmod 700 /path/to/tablespace

# Fix SELinux context if applicable
sudo restorecon -R /path/to/tablespace

# Or set PostgreSQL context manually
sudo semanage fcontext -a -t postgresql_db_t "/path/to/tablespace(/.*)?"
sudo restorecon -R /path/to/tablespace
```

### Cause 4: Unmounted File System

```bash
# Check if file system is mounted
df -h /mnt/data

# If not mounted, mount it
sudo mount /dev/sdb1 /mnt/data

# Add to fstab for automatic mounting
echo "/dev/sdb1 /mnt/data ext4 defaults 0 2" | sudo tee -a /etc/fstab
```

### Cause 5: Disk Failure

```bash
# Check disk health
sudo smartctl -a /dev/sdb

# Check for I/O errors
dmesg | grep -i error

# Check file system
sudo fsck -n /dev/sdb1
```

---

## Recovery Procedures

### Recover from Missing Tablespace

If the tablespace data is lost but the database can start:

```sql
-- Connect to database
-- Check which objects are in the missing tablespace
SELECT
    n.nspname AS schema,
    c.relname AS name,
    CASE c.relkind
        WHEN 'r' THEN 'table'
        WHEN 'i' THEN 'index'
        WHEN 't' THEN 'toast table'
    END AS type
FROM pg_class c
JOIN pg_namespace n ON c.relnamespace = n.oid
JOIN pg_tablespace t ON c.reltablespace = t.oid
WHERE t.spcname = 'missing_tablespace';
```

### Move Objects to Default Tablespace

```sql
-- Move table to default tablespace
ALTER TABLE mytable SET TABLESPACE pg_default;

-- Move index to default tablespace
ALTER INDEX myindex SET TABLESPACE pg_default;

-- Move all tables from one tablespace to another
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT c.relname, n.nspname
        FROM pg_class c
        JOIN pg_namespace n ON c.relnamespace = n.oid
        JOIN pg_tablespace t ON c.reltablespace = t.oid
        WHERE t.spcname = 'old_tablespace'
        AND c.relkind = 'r'
    LOOP
        EXECUTE format('ALTER TABLE %I.%I SET TABLESPACE pg_default', r.nspname, r.relname);
        RAISE NOTICE 'Moved table %.%', r.nspname, r.relname;
    END LOOP;
END $$;
```

### Drop Unusable Tablespace

```sql
-- First, move all objects out of the tablespace
-- Then drop it
DROP TABLESPACE IF EXISTS broken_tablespace;

-- If drop fails due to objects still referencing it:
-- Find and move/drop all objects first
SELECT
    c.relname,
    c.relkind,
    pg_size_pretty(pg_relation_size(c.oid))
FROM pg_class c
WHERE c.reltablespace = (SELECT oid FROM pg_tablespace WHERE spcname = 'broken_tablespace');
```

---

## Creating and Managing Tablespaces

### Create New Tablespace

```bash
# Create directory
sudo mkdir -p /mnt/fast_ssd/pg_data
sudo chown postgres:postgres /mnt/fast_ssd/pg_data
sudo chmod 700 /mnt/fast_ssd/pg_data
```

```sql
-- Create tablespace
CREATE TABLESPACE fast_storage LOCATION '/mnt/fast_ssd/pg_data';

-- Verify creation
SELECT * FROM pg_tablespace WHERE spcname = 'fast_storage';
```

### Move Database to Tablespace

```sql
-- Set default tablespace for a database
ALTER DATABASE mydb SET TABLESPACE fast_storage;

-- This requires exclusive lock and no active connections
-- You may need to disconnect all users first
```

### Move Individual Tables

```sql
-- Move specific table to faster storage
ALTER TABLE large_table SET TABLESPACE fast_storage;

-- Move index separately
ALTER INDEX large_table_pkey SET TABLESPACE fast_storage;
```

---

## Tablespace Maintenance

### Monitor Tablespace Usage

```sql
-- Check tablespace sizes
SELECT
    spcname,
    pg_tablespace_location(oid) AS location,
    pg_size_pretty(pg_tablespace_size(oid)) AS size
FROM pg_tablespace
ORDER BY pg_tablespace_size(oid) DESC;

-- Check objects in each tablespace
SELECT
    t.spcname AS tablespace,
    count(*) AS object_count,
    pg_size_pretty(sum(pg_relation_size(c.oid))) AS total_size
FROM pg_class c
JOIN pg_tablespace t ON c.reltablespace = t.oid OR (c.reltablespace = 0 AND t.spcname = 'pg_default')
WHERE c.relkind IN ('r', 'i')
GROUP BY t.spcname
ORDER BY sum(pg_relation_size(c.oid)) DESC;
```

### Verify Tablespace Health

```bash
#!/bin/bash
# check_tablespaces.sh

PGDATA="/var/lib/postgresql/14/main"

echo "Checking tablespace health..."

for link in "$PGDATA"/pg_tblspc/*; do
    if [ -L "$link" ]; then
        target=$(readlink -f "$link")
        oid=$(basename "$link")

        if [ -d "$target" ]; then
            # Check permissions
            if [ -w "$target" ]; then
                echo "OK: Tablespace $oid -> $target"
            else
                echo "ERROR: Tablespace $oid -> $target (not writable)"
            fi
        else
            echo "ERROR: Tablespace $oid -> $target (directory missing)"
        fi
    fi
done
```

---

## Preventing Tablespace Issues

### 1. Use Reliable Storage

```bash
# Check disk health regularly
sudo smartctl -a /dev/sdb

# Monitor for I/O errors
sudo grep -i "error\|fail" /var/log/syslog
```

### 2. Ensure Proper Mount Configuration

```bash
# Add to /etc/fstab for automatic mounting
/dev/sdb1 /mnt/tablespace ext4 defaults,nofail 0 2

# Use 'nofail' to prevent boot issues if disk is missing
```

### 3. Set Up Monitoring

```sql
-- Create monitoring view
CREATE VIEW tablespace_health AS
SELECT
    spcname,
    pg_tablespace_location(oid) AS location,
    pg_size_pretty(pg_tablespace_size(oid)) AS size,
    CASE
        WHEN pg_tablespace_size(oid) > 0 THEN 'OK'
        ELSE 'EMPTY or ERROR'
    END AS status
FROM pg_tablespace;
```

### 4. Document Tablespace Locations

Keep documentation of:
- All tablespace locations
- Which disks they reside on
- What data is stored in each
- Recovery procedures

---

## Best Practices

1. **Use pg_default for critical data** - The default tablespace is most reliable
2. **Monitor disk health** - Set up alerts for disk failures
3. **Test tablespace access regularly** - Verify directories are accessible
4. **Document dependencies** - Know which applications use which tablespaces
5. **Include tablespaces in backups** - pg_dump includes tablespace info
6. **Use separate disks carefully** - Benefits must outweigh complexity

---

## Conclusion

"Cannot open tablespace" errors usually indicate:

1. **Missing directory** - Recreate with correct permissions
2. **Broken symlink** - Fix or recreate the link
3. **Permission issues** - Set correct ownership and modes
4. **Unmounted storage** - Mount the file system
5. **Disk failure** - Replace disk and restore from backup

Regular monitoring and proper configuration can prevent most tablespace issues.

---

*Need to monitor your PostgreSQL tablespaces? [OneUptime](https://oneuptime.com) provides comprehensive storage monitoring including tablespace health, disk usage alerts, and I/O performance tracking.*
