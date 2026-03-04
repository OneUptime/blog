# How to Back Up and Restore PostgreSQL Databases on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, PostgreSQL, Backup, Restore, pg_dump, pg_basebackup

Description: Learn how to back up and restore PostgreSQL databases on RHEL using pg_dump for logical backups and pg_basebackup for physical backups.

---

Regular backups are critical for any PostgreSQL database. RHEL provides two main backup methods: logical backups with pg_dump (exports SQL) and physical backups with pg_basebackup (copies data files). Each has different use cases.

## Logical Backups with pg_dump

### Back Up a Single Database

```bash
# Dump a single database to a SQL file
sudo -u postgres pg_dump myappdb > /backup/myappdb_$(date +%Y%m%d).sql

# Dump in custom format (compressed, supports parallel restore)
sudo -u postgres pg_dump -Fc myappdb > /backup/myappdb_$(date +%Y%m%d).dump

# Dump in directory format (supports parallel dump and restore)
sudo -u postgres pg_dump -Fd -j 4 myappdb -f /backup/myappdb_$(date +%Y%m%d)/
# -j 4 uses 4 parallel jobs
```

### Back Up All Databases

```bash
# Dump all databases including roles and tablespaces
sudo -u postgres pg_dumpall > /backup/all_databases_$(date +%Y%m%d).sql

# Dump only global objects (roles, tablespaces)
sudo -u postgres pg_dumpall --globals-only > /backup/globals_$(date +%Y%m%d).sql
```

### Back Up a Single Table

```bash
# Dump a specific table
sudo -u postgres pg_dump -t mytable myappdb > /backup/mytable.sql

# Dump schema only (no data)
sudo -u postgres pg_dump --schema-only myappdb > /backup/schema.sql

# Dump data only (no DDL)
sudo -u postgres pg_dump --data-only myappdb > /backup/data.sql
```

## Restore from Logical Backups

```bash
# Restore from a plain SQL file
sudo -u postgres psql myappdb < /backup/myappdb_20250115.sql

# Restore from custom format
sudo -u postgres pg_restore -d myappdb /backup/myappdb_20250115.dump

# Restore with parallel jobs for faster restores
sudo -u postgres pg_restore -d myappdb -j 4 /backup/myappdb_20250115.dump

# Create a new database and restore into it
sudo -u postgres createdb newdb
sudo -u postgres pg_restore -d newdb /backup/myappdb_20250115.dump

# Restore all databases from pg_dumpall output
sudo -u postgres psql -f /backup/all_databases_20250115.sql
```

## Physical Backups with pg_basebackup

Physical backups copy the entire data directory and are faster for large databases.

```bash
# Create a base backup
sudo -u postgres pg_basebackup \
    -D /backup/basebackup_$(date +%Y%m%d) \
    -Ft -z -Xs -P

# Flags explained:
# -D : destination directory
# -Ft : tar format
# -z : compress with gzip
# -Xs : stream WAL during backup (no gaps)
# -P : show progress
```

## Restore from a Physical Backup

```bash
# Stop PostgreSQL
sudo systemctl stop postgresql

# Remove existing data
sudo rm -rf /var/lib/pgsql/data/*

# Extract the base backup
sudo -u postgres tar xzf /backup/basebackup_20250115/base.tar.gz \
    -C /var/lib/pgsql/data/

# Extract the WAL files
sudo -u postgres tar xzf /backup/basebackup_20250115/pg_wal.tar.gz \
    -C /var/lib/pgsql/data/pg_wal/

# Start PostgreSQL
sudo systemctl start postgresql
```

## Verify Backups

```bash
# Verify a custom-format dump
sudo -u postgres pg_restore --list /backup/myappdb_20250115.dump

# Check the backup file size
ls -lh /backup/

# Test restore to a temporary database
sudo -u postgres createdb test_restore
sudo -u postgres pg_restore -d test_restore /backup/myappdb_20250115.dump
sudo -u postgres dropdb test_restore
```

Always test your restore procedure regularly. A backup you have never restored is a backup you cannot trust.
