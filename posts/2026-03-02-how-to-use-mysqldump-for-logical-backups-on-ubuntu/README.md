# How to Use mysqldump for Logical Backups on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, MySQL, Database, Backup

Description: Create logical database backups using mysqldump on Ubuntu, with options for single databases, full server backups, compression, and automated scheduling.

---

mysqldump creates logical backups by exporting database contents as SQL statements. The resulting file contains `CREATE TABLE` and `INSERT` statements that recreate the database from scratch. Logical backups are portable across MySQL versions, readable with a text editor, and easy to restore selectively. The trade-off is that they are slower to create and restore than physical backups for large databases.

## Basic mysqldump Syntax

```bash
# Basic syntax
mysqldump [options] [database_name] [table_name] > output.sql

# Backup a single database
mysqldump -u root -p myapp_db > myapp_db_backup.sql

# Backup with password in command (insecure, avoid in scripts)
mysqldump -u root -pMyPassword myapp_db > backup.sql
```

## Setting Up a Backup User

Instead of using root for backups, create a dedicated backup user with minimal required privileges:

```sql
-- Create backup user
CREATE USER 'backup'@'localhost' IDENTIFIED BY 'backup-password-here';

-- Grant necessary privileges for backing up all databases
GRANT SELECT, SHOW VIEW, RELOAD, LOCK TABLES, EVENT, TRIGGER,
    REPLICATION CLIENT ON *.* TO 'backup'@'localhost';

-- For dumping specific databases only
-- GRANT SELECT, SHOW VIEW, LOCK TABLES, TRIGGER ON myapp_db.* TO 'backup'@'localhost';

FLUSH PRIVILEGES;
```

Create a MySQL option file to avoid putting the password in scripts:

```bash
cat > /etc/mysql/backup.cnf << 'EOF'
[client]
user=backup
password=backup-password-here
host=localhost
EOF
sudo chmod 600 /etc/mysql/backup.cnf
sudo chown root:root /etc/mysql/backup.cnf
```

Now use it in mysqldump:

```bash
mysqldump --defaults-file=/etc/mysql/backup.cnf myapp_db > backup.sql
```

## Common Backup Scenarios

### Backup a Single Database

```bash
# Basic backup
mysqldump --defaults-file=/etc/mysql/backup.cnf \
    myapp_db > /backup/myapp_db_$(date +%Y%m%d).sql

# Include the CREATE DATABASE statement (useful for full restore)
mysqldump --defaults-file=/etc/mysql/backup.cnf \
    --databases myapp_db > /backup/myapp_db_$(date +%Y%m%d).sql

# Add database creation and use statements to the dump
mysqldump --defaults-file=/etc/mysql/backup.cnf \
    --add-drop-database --databases myapp_db > /backup/myapp_db.sql
```

### Backup All Databases

```bash
# Back up everything
mysqldump --defaults-file=/etc/mysql/backup.cnf \
    --all-databases > /backup/all_databases_$(date +%Y%m%d).sql

# All databases with flush privileges (recommended for full server backup)
mysqldump --defaults-file=/etc/mysql/backup.cnf \
    --all-databases \
    --flush-privileges \
    --routines \
    --events \
    --triggers \
    > /backup/full_backup_$(date +%Y%m%d).sql
```

### Backup Specific Tables

```bash
# Backup only specific tables from a database
mysqldump --defaults-file=/etc/mysql/backup.cnf \
    myapp_db users orders payments > /backup/critical_tables.sql

# Backup table structure only (no data)
mysqldump --defaults-file=/etc/mysql/backup.cnf \
    --no-data myapp_db > /backup/schema_only.sql

# Backup data only (no CREATE TABLE statements)
mysqldump --defaults-file=/etc/mysql/backup.cnf \
    --no-create-info myapp_db > /backup/data_only.sql
```

## Important mysqldump Options

```bash
mysqldump \
    --defaults-file=/etc/mysql/backup.cnf \
    --single-transaction \    # Consistent snapshot for InnoDB (no table locks)
    --routines \              # Include stored procedures and functions
    --triggers \              # Include triggers
    --events \                # Include scheduled events
    --hex-blob \              # BLOB data as hex (avoids binary encoding issues)
    --add-drop-table \        # Add DROP TABLE before CREATE TABLE
    --extended-insert \       # Multiple rows per INSERT statement (faster restore)
    --quick \                 # Fetch rows one at a time (reduces memory usage for large tables)
    --compress \              # Compress client-server communication
    myapp_db > backup.sql
```

The `--single-transaction` flag is critical for InnoDB tables. It takes a consistent snapshot without locking tables, so the backup does not block your application. Never use this with MyISAM - use `--lock-tables` instead.

## Compressed Backups

SQL dump files compress extremely well. Pipe through gzip to save disk space:

```bash
# Create compressed backup
mysqldump --defaults-file=/etc/mysql/backup.cnf \
    --single-transaction \
    --routines --triggers --events \
    myapp_db | gzip > /backup/myapp_db_$(date +%Y%m%d_%H%M%S).sql.gz

# Even better compression with xz (slower but smaller)
mysqldump --defaults-file=/etc/mysql/backup.cnf myapp_db | \
    xz -9 > /backup/myapp_db_$(date +%Y%m%d).sql.xz

# Check the compressed file size
ls -lh /backup/*.sql.gz
```

## Restoring from a mysqldump Backup

```bash
# Restore to an existing database
mysql --defaults-file=/etc/mysql/backup.cnf myapp_db < /backup/myapp_db.sql

# Restore compressed backup directly
zcat /backup/myapp_db.sql.gz | mysql -u root -p myapp_db

# Restore all databases from a full dump
mysql -u root -p < /backup/all_databases.sql

# Create database first if it doesn't exist
mysql -u root -p -e "CREATE DATABASE myapp_db CHARACTER SET utf8mb4;"
mysql -u root -p myapp_db < /backup/myapp_db.sql
```

Monitor restore progress for large backups:

```bash
# Show progress with pv
sudo apt install pv -y
pv /backup/myapp_db.sql | mysql -u root -p myapp_db
```

## Automated Backup Script

Create a production-ready backup script:

```bash
sudo nano /usr/local/bin/mysql-backup.sh
```

```bash
#!/bin/bash
# MySQL Logical Backup Script
# Backs up all databases individually for selective restore

# Configuration
BACKUP_DIR="/backup/mysql"
DEFAULTS_FILE="/etc/mysql/backup.cnf"
RETENTION_DAYS=7
DATE=$(date +%Y%m%d_%H%M%S)
LOG_FILE="/var/log/mysql-backup.log"

# Ensure backup directory exists
mkdir -p "${BACKUP_DIR}/${DATE}"

# Log function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "Starting MySQL backup"

# Get list of databases (exclude system databases)
DATABASES=$(mysql --defaults-file="$DEFAULTS_FILE" \
    -e "SHOW DATABASES;" \
    | grep -Ev "^(Database|information_schema|performance_schema|sys)$")

# Back up each database separately
for DB in $DATABASES; do
    log "Backing up database: $DB"

    mysqldump \
        --defaults-file="$DEFAULTS_FILE" \
        --single-transaction \
        --routines \
        --triggers \
        --events \
        --hex-blob \
        --quick \
        "$DB" | gzip > "${BACKUP_DIR}/${DATE}/${DB}.sql.gz"

    if [ $? -eq 0 ]; then
        log "Successfully backed up $DB ($(du -sh "${BACKUP_DIR}/${DATE}/${DB}.sql.gz" | cut -f1))"
    else
        log "ERROR: Failed to backup $DB"
    fi
done

# Remove backups older than retention period
find "$BACKUP_DIR" -maxdepth 1 -type d -mtime "+$RETENTION_DAYS" -exec rm -rf {} \;
log "Removed backups older than $RETENTION_DAYS days"

log "Backup complete. Files in ${BACKUP_DIR}/${DATE}"
```

```bash
sudo chmod +x /usr/local/bin/mysql-backup.sh

# Test the script
sudo /usr/local/bin/mysql-backup.sh

# Schedule daily at 2 AM
echo "0 2 * * * root /usr/local/bin/mysql-backup.sh" | sudo tee /etc/cron.d/mysql-backup
```

## Verifying Backup Integrity

Always verify backups can be read after creation:

```bash
# Verify a compressed backup is readable
zcat /backup/mysql/latest/*.sql.gz | wc -l

# Test restore to a separate test database
mysql -u root -p -e "CREATE DATABASE test_restore;"
zcat /backup/mysql/latest/myapp_db.sql.gz | mysql -u root -p test_restore
mysql -u root -p -e "SHOW TABLES FROM test_restore;"
mysql -u root -p -e "DROP DATABASE test_restore;"

# Check for errors in the dump
zgrep -i "error\|warning\|failed" /backup/mysql/latest/myapp_db.sql.gz
```

mysqldump is a reliable, well-understood backup method. For databases under 10GB, it provides a good balance of simplicity and recoverability. For larger databases, consider xtrabackup for faster physical backups.
