# How to Configure Automated Database Backups with pg_dump and Cron on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, PostgreSQL, pg_dump, Cron, Backup, Automation, Database

Description: Automate PostgreSQL database backups on RHEL using pg_dump and cron jobs with retention policies, compression, and email notifications.

---

Manual backups are unreliable because someone will eventually forget. Automating PostgreSQL backups with pg_dump and cron on RHEL ensures consistent, scheduled backups without human intervention.

## Create a Backup Directory

```bash
# Create the backup directory
sudo mkdir -p /backup/postgresql
sudo chown postgres:postgres /backup/postgresql
```

## Create a Backup Script

```bash
sudo tee /usr/local/bin/pg_backup.sh << 'SCRIPT'
#!/bin/bash
# PostgreSQL automated backup script
# Run as the postgres user

# Configuration
BACKUP_DIR="/backup/postgresql"
RETENTION_DAYS=14
DATE=$(date +%Y%m%d_%H%M%S)
LOG_FILE="/var/log/pg_backup.log"

# List of databases to back up (or use "all" for everything)
DATABASES="myappdb analyticsdb"

# Start logging
echo "=== Backup started at $(date) ===" >> "$LOG_FILE"

# Back up each database
for DB in $DATABASES; do
    BACKUP_FILE="${BACKUP_DIR}/${DB}_${DATE}.dump"

    # Dump in custom format (compressed by default)
    pg_dump -Fc "$DB" -f "$BACKUP_FILE" 2>> "$LOG_FILE"

    if [ $? -eq 0 ]; then
        SIZE=$(du -h "$BACKUP_FILE" | awk '{print $1}')
        echo "SUCCESS: ${DB} backed up to ${BACKUP_FILE} (${SIZE})" >> "$LOG_FILE"
    else
        echo "ERROR: Failed to back up ${DB}" >> "$LOG_FILE"
    fi
done

# Back up global objects (roles, tablespaces)
pg_dumpall --globals-only -f "${BACKUP_DIR}/globals_${DATE}.sql" 2>> "$LOG_FILE"

# Clean up old backups
find "$BACKUP_DIR" -name "*.dump" -mtime +${RETENTION_DAYS} -delete
find "$BACKUP_DIR" -name "globals_*.sql" -mtime +${RETENTION_DAYS} -delete

DELETED=$(find "$BACKUP_DIR" -name "*.dump" -mtime +${RETENTION_DAYS} | wc -l)
echo "Cleaned up backups older than ${RETENTION_DAYS} days" >> "$LOG_FILE"

echo "=== Backup completed at $(date) ===" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"
SCRIPT

sudo chmod +x /usr/local/bin/pg_backup.sh
sudo chown postgres:postgres /usr/local/bin/pg_backup.sh
```

## Create a Cron Job

```bash
# Create a cron job to run daily at 2:00 AM
sudo tee /etc/cron.d/pg_backup << 'EOF'
# PostgreSQL daily backup at 2:00 AM
0 2 * * * postgres /usr/local/bin/pg_backup.sh
EOF

# Verify the cron job is scheduled
sudo crontab -u postgres -l
```

## Add Password Authentication for Scripts

To avoid password prompts in automated scripts, use a `.pgpass` file:

```bash
# Create .pgpass for the postgres user
sudo -u postgres tee ~postgres/.pgpass << 'EOF'
localhost:5432:*:postgres:your_postgres_password
EOF

# Set correct permissions (required by PostgreSQL)
sudo chmod 600 ~postgres/.pgpass
sudo chown postgres:postgres ~postgres/.pgpass
```

## Add Email Notification

```bash
# Enhanced backup script with email alerts
sudo tee /usr/local/bin/pg_backup_notify.sh << 'SCRIPT'
#!/bin/bash
BACKUP_DIR="/backup/postgresql"
RETENTION_DAYS=14
DATE=$(date +%Y%m%d_%H%M%S)
ERRORS=0
REPORT=""

for DB in myappdb analyticsdb; do
    BACKUP_FILE="${BACKUP_DIR}/${DB}_${DATE}.dump"
    pg_dump -Fc "$DB" -f "$BACKUP_FILE" 2>/tmp/pg_backup_err.txt

    if [ $? -eq 0 ]; then
        SIZE=$(du -h "$BACKUP_FILE" | awk '{print $1}')
        REPORT="${REPORT}OK: ${DB} (${SIZE})\n"
    else
        ERRORS=$((ERRORS + 1))
        REPORT="${REPORT}FAIL: ${DB} - $(cat /tmp/pg_backup_err.txt)\n"
    fi
done

# Clean up old backups
find "$BACKUP_DIR" -name "*.dump" -mtime +${RETENTION_DAYS} -delete

# Send notification
if [ $ERRORS -gt 0 ]; then
    echo -e "PostgreSQL Backup Report - ERRORS\n\n${REPORT}" | \
        mail -s "[ALERT] PostgreSQL backup failed on $(hostname)" admin@example.com
else
    echo -e "PostgreSQL Backup Report - SUCCESS\n\n${REPORT}" | \
        mail -s "PostgreSQL backup OK on $(hostname)" admin@example.com
fi
SCRIPT

sudo chmod +x /usr/local/bin/pg_backup_notify.sh
sudo chown postgres:postgres /usr/local/bin/pg_backup_notify.sh
```

## Verify Backups

```bash
# List current backups
ls -lh /backup/postgresql/

# Test restoring a backup to verify integrity
sudo -u postgres createdb test_restore
sudo -u postgres pg_restore -d test_restore /backup/postgresql/myappdb_20250115_020000.dump
sudo -u postgres dropdb test_restore

# Check backup log
cat /var/log/pg_backup.log
```

## Set Up Log Rotation for Backup Logs

```bash
sudo tee /etc/logrotate.d/pg_backup << 'EOF'
/var/log/pg_backup.log {
    weekly
    rotate 8
    compress
    missingok
    notifempty
}
EOF
```

Automated backups with retention, verification, and notifications form the foundation of a reliable disaster recovery strategy for PostgreSQL on RHEL.
