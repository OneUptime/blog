# How to Back Up MySQL and PostgreSQL Databases Automatically on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Backup, MySQL, PostgreSQL, Database

Description: Learn how to automate MySQL and PostgreSQL database backups on Ubuntu using dump tools, compression, rotation policies, and cron scheduling.

---

Database backups require a different approach than filesystem backups. You cannot simply copy database files while the server is running - the data may be in an inconsistent state mid-write. Both MySQL and PostgreSQL provide dedicated dump utilities that create consistent, logical backups you can restore from regardless of the underlying storage format.

## MySQL/MariaDB Backups

### Using mysqldump

`mysqldump` is the standard tool for MySQL and MariaDB logical backups. It produces SQL files that recreate your databases from scratch.

```bash
# Basic single database dump
mysqldump -u root -p database_name > /backup/database_name.sql

# Dump all databases
mysqldump -u root -p --all-databases > /backup/all-databases.sql

# Dump with compression
mysqldump -u root -p database_name | gzip > /backup/database_name-$(date +%Y%m%d).sql.gz
```

For automated backups, avoid interactive password prompts by using a MySQL options file:

```bash
# Create a .my.cnf file for root
sudo nano /root/.my.cnf
```

```ini
[mysqldump]
user=backup_user
password=your-backup-password
host=localhost
```

```bash
# Secure the file - only root should read it
sudo chmod 600 /root/.my.cnf
```

Create a dedicated backup user with minimal privileges:

```sql
-- In MySQL/MariaDB
CREATE USER 'backup_user'@'localhost' IDENTIFIED BY 'strong-password-here';
GRANT SELECT, SHOW VIEW, RELOAD, REPLICATION CLIENT, EVENT, TRIGGER ON *.* TO 'backup_user'@'localhost';
FLUSH PRIVILEGES;
```

### MySQL Backup Script

```bash
sudo nano /usr/local/bin/mysql-backup.sh
```

```bash
#!/bin/bash
# MySQL/MariaDB automated backup script
# Backs up all databases individually for selective restore

set -euo pipefail

# Configuration
BACKUP_DIR="/var/backups/mysql"
KEEP_DAYS=30
LOG_FILE="/var/log/mysql-backup.log"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"; }

mkdir -p "$BACKUP_DIR"

DATE=$(date +%Y%m%d-%H%M%S)

log "Starting MySQL backup"

# Get list of all databases, excluding system databases
DATABASES=$(mysql -e "SHOW DATABASES;" | grep -Ev "^(Database|information_schema|performance_schema|sys)$")

for DB in $DATABASES; do
    FILENAME="$BACKUP_DIR/${DB}_${DATE}.sql.gz"
    log "Backing up database: $DB"

    # Dump with common options for consistency:
    # --single-transaction: consistent dump without locking (InnoDB)
    # --routines: include stored procedures
    # --triggers: include triggers
    # --events: include scheduled events
    mysqldump \
        --single-transaction \
        --routines \
        --triggers \
        --events \
        --databases "$DB" | gzip > "$FILENAME"

    log "Saved: $FILENAME ($(du -sh "$FILENAME" | cut -f1))"
done

# Dump global MySQL settings (grants, plugins)
log "Backing up MySQL grants"
mysql -e "SHOW GRANTS;" > "$BACKUP_DIR/mysql-grants_${DATE}.sql" 2>/dev/null || true

# Remove old backups
log "Removing backups older than $KEEP_DAYS days"
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +"$KEEP_DAYS" -delete
find "$BACKUP_DIR" -name "*.sql" -mtime +"$KEEP_DAYS" -delete

log "MySQL backup complete"
```

```bash
sudo chmod +x /usr/local/bin/mysql-backup.sh
```

### Restoring a MySQL Database

```bash
# Restore a single database
gunzip -c /var/backups/mysql/myapp_20260302-020000.sql.gz | mysql -u root -p myapp

# Create database first if it doesn't exist
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS myapp;"
gunzip -c /var/backups/mysql/myapp_20260302-020000.sql.gz | mysql -u root -p myapp

# Restore all databases from an all-databases dump
gunzip -c /var/backups/mysql/all-databases_20260302.sql.gz | mysql -u root -p
```

## PostgreSQL Backups

### Using pg_dump and pg_dumpall

PostgreSQL provides `pg_dump` for individual databases and `pg_dumpall` for the entire cluster including roles and tablespaces.

```bash
# Dump a single database as SQL
sudo -u postgres pg_dump myapp > /backup/myapp.sql

# Dump in custom format (compressed, allows selective restore)
sudo -u postgres pg_dump -Fc myapp > /backup/myapp.dump

# Dump in directory format (parallel restore support)
sudo -u postgres pg_dump -Fd myapp -f /backup/myapp-dir/

# Dump all databases and global objects (roles, tablespaces)
sudo -u postgres pg_dumpall > /backup/postgresql-all.sql
```

Set up password-less authentication using a `.pgpass` file:

```bash
# Create .pgpass for root
sudo -u postgres nano ~/.pgpass
```

```text
# hostname:port:database:username:password
localhost:5432:*:backup_role:your-password-here
```

```bash
sudo chmod 600 /var/lib/postgresql/.pgpass
```

Create a PostgreSQL backup role:

```sql
-- In PostgreSQL
CREATE ROLE backup_role WITH LOGIN PASSWORD 'strong-password-here';
GRANT CONNECT ON DATABASE myapp TO backup_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO backup_role;
-- For pg_dump to work fully, the role needs to be superuser or pg_read_all_data
GRANT pg_read_all_data TO backup_role;
```

### PostgreSQL Backup Script

```bash
sudo nano /usr/local/bin/postgres-backup.sh
```

```bash
#!/bin/bash
# PostgreSQL automated backup script
# Creates custom-format dumps of all user databases

set -euo pipefail

# Configuration
BACKUP_DIR="/var/backups/postgresql"
KEEP_DAYS=30
LOG_FILE="/var/log/postgresql-backup.log"
PG_USER="postgres"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"; }

mkdir -p "$BACKUP_DIR"
DATE=$(date +%Y%m%d-%H%M%S)

log "Starting PostgreSQL backup"

# Get list of user databases (exclude template and postgres default)
DATABASES=$(sudo -u "$PG_USER" psql -t -c "SELECT datname FROM pg_database WHERE datistemplate = false AND datname NOT IN ('postgres');" | tr -d ' ')

for DB in $DATABASES; do
    [ -z "$DB" ] && continue  # Skip empty lines

    FILENAME="$BACKUP_DIR/${DB}_${DATE}.dump"
    log "Backing up database: $DB"

    # Custom format: compressed by default, supports parallel restore
    sudo -u "$PG_USER" pg_dump \
        --format=custom \
        --compress=9 \
        --verbose \
        "$DB" > "$FILENAME"

    log "Saved: $FILENAME ($(du -sh "$FILENAME" | cut -f1))"
done

# Backup global objects: roles, tablespaces, passwords
log "Backing up global PostgreSQL objects"
sudo -u "$PG_USER" pg_dumpall \
    --globals-only \
    > "$BACKUP_DIR/postgresql-globals_${DATE}.sql"

log "Removing backups older than $KEEP_DAYS days"
find "$BACKUP_DIR" -name "*.dump" -mtime +"$KEEP_DAYS" -delete
find "$BACKUP_DIR" -name "*.sql" -mtime +"$KEEP_DAYS" -delete

log "PostgreSQL backup complete"
```

```bash
sudo chmod +x /usr/local/bin/postgres-backup.sh
```

### Restoring a PostgreSQL Database

```bash
# Restore from custom format dump
sudo -u postgres pg_restore \
  --create \
  --clean \
  --if-exists \
  --no-owner \
  --dbname=postgres \
  /var/backups/postgresql/myapp_20260302-020000.dump

# Restore to a specific database
sudo -u postgres pg_restore \
  --no-owner \
  --role=myapp_user \
  --dbname=myapp \
  /var/backups/postgresql/myapp_20260302-020000.dump

# Parallel restore (faster for large databases)
sudo -u postgres pg_restore \
  --jobs=4 \
  --no-owner \
  --dbname=myapp \
  /var/backups/postgresql/myapp_20260302-020000.dump

# Restore from SQL format
sudo -u postgres psql myapp < /var/backups/postgresql/myapp_20260302.sql
```

## Scheduling Both Backup Scripts

```bash
sudo crontab -e
```

```bash
# MySQL backup at 1 AM daily
0 1 * * * /usr/local/bin/mysql-backup.sh

# PostgreSQL backup at 1:30 AM daily
30 1 * * * /usr/local/bin/postgres-backup.sh
```

## Monitoring Backup Success

Add email alerts for backup failures:

```bash
# Install mailutils for sending email
sudo apt install mailutils

# Modify backup scripts to send alert on failure
# Add to the top of each script after set -euo pipefail:
trap 'echo "Backup failed at line $LINENO" | mail -s "ALERT: MySQL Backup Failed on $(hostname)" admin@example.com' ERR
```

Alternatively, check backup files in a monitoring script:

```bash
cat > /usr/local/bin/check-db-backups.sh << 'EOF'
#!/bin/bash
# Check that backup files were created within the last 25 hours

MAX_AGE=90000  # 25 hours in seconds

check_backup() {
    local dir=$1
    local pattern=$2
    local service=$3

    # Find newest file matching pattern
    newest=$(find "$dir" -name "$pattern" -newer /tmp -printf '%T@\n' 2>/dev/null | sort -n | tail -1)

    if [ -z "$newest" ]; then
        echo "WARNING: No recent $service backups found in $dir"
        return 1
    fi

    age=$(($(date +%s) - ${newest%.*}))
    if [ "$age" -gt "$MAX_AGE" ]; then
        echo "WARNING: Last $service backup is $(($age / 3600)) hours old"
        return 1
    fi

    echo "OK: $service backup is current"
}

check_backup /var/backups/mysql "*.sql.gz" "MySQL"
check_backup /var/backups/postgresql "*.dump" "PostgreSQL"
EOF
chmod +x /usr/local/bin/check-db-backups.sh
```

## Offsite Backup Strategy

After creating local dumps, sync them to a remote location:

```bash
# Sync to remote server
rsync -avz /var/backups/mysql/ user@backup-server:/offsite/mysql/
rsync -avz /var/backups/postgresql/ user@backup-server:/offsite/postgresql/

# Or sync to S3-compatible storage using rclone
rclone sync /var/backups/mysql remote:bucket/mysql-backups
```

Regular database backups are non-negotiable for production systems. Test your restore procedures periodically to confirm that the dumps are valid and you know exactly what steps to follow when you need to recover data under pressure.
