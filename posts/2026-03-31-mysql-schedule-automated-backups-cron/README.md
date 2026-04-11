# How to Schedule Automated MySQL Backups with Cron

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Backup, Cron, Automation, Linux

Description: Learn how to schedule automated MySQL backups using cron jobs with mysqldump, including secure credential storage and backup rotation.

---

Manual backups are unreliable - production databases need automated, scheduled backups that run consistently. Linux cron is the standard tool for scheduling recurring tasks, and combined with `mysqldump`, it provides a solid automated backup solution. This guide covers creating a backup script, storing credentials securely, and configuring cron to run it automatically.

## Creating the Backup Script

Create a backup script at `/usr/local/bin/mysql_backup.sh`:

```bash
#!/bin/bash
set -o pipefail

# Configuration
BACKUP_DIR="/backup/mysql"
RETENTION_DAYS=7
DATE=$(date +%Y%m%d_%H%M%S)
LOG_FILE="/var/log/mysql_backup.log"
BACKUP_STATUS=0

# Create backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}"

# Log start
echo "[${DATE}] Starting MySQL backup" >> "${LOG_FILE}"

# Get list of databases (excluding system databases)
DATABASES=$(mysql --defaults-file=/etc/mysql/backup.cnf \
  -e "SELECT schema_name FROM information_schema.schemata
      WHERE schema_name NOT IN
      ('information_schema','performance_schema','sys','mysql');" \
  --silent --skip-column-names 2>>"${LOG_FILE}")

# Back up each database
for DB in $DATABASES; do
  OUTPUT_FILE="${BACKUP_DIR}/${DB}_${DATE}.sql.gz"

  mysqldump --defaults-file=/etc/mysql/backup.cnf \
    --single-transaction \
    --quick \
    --routines \
    --events \
    "${DB}" 2>>"${LOG_FILE}" \
    | gzip > "${OUTPUT_FILE}"

  if [ $? -eq 0 ]; then
    echo "[${DATE}] Backed up: ${DB} -> ${OUTPUT_FILE}" >> "${LOG_FILE}"
  else
    echo "[${DATE}] ERROR: Failed to back up ${DB}" >> "${LOG_FILE}"
    BACKUP_STATUS=1
  fi
done

# Remove backups older than retention period
find "${BACKUP_DIR}" -name "*.sql.gz" \
  -mtime +${RETENTION_DAYS} -delete

echo "[${DATE}] Backup complete. Old backups removed." >> "${LOG_FILE}"
```

Make the script executable:

```bash
chmod 750 /usr/local/bin/mysql_backup.sh
chown root:root /usr/local/bin/mysql_backup.sh
```

## Storing Credentials Securely

Never put passwords in cron commands or scripts directly. Use a MySQL options file:

```bash
# Create /etc/mysql/backup.cnf
cat > /etc/mysql/backup.cnf << 'EOF'
[client]
user=backup_user
password=BackupPassword!
host=localhost
EOF

chmod 600 /etc/mysql/backup.cnf
chown mysql:mysql /etc/mysql/backup.cnf
```

Create a dedicated backup user with minimal privileges:

```sql
CREATE USER 'backup_user'@'localhost'
  IDENTIFIED BY 'BackupPassword!';

GRANT SELECT, SHOW VIEW, RELOAD, REPLICATION CLIENT,
      LOCK TABLES, EVENT, TRIGGER
  ON *.* TO 'backup_user'@'localhost';

FLUSH PRIVILEGES;
```

## Configuring the Cron Job

Edit the crontab for the root user:

```bash
crontab -e
```

Add the backup schedule:

```text
# Daily backup at 2:00 AM
0 2 * * * /usr/local/bin/mysql_backup.sh

# Weekly full backup on Sunday at 1:00 AM
0 1 * * 0 /usr/local/bin/mysql_backup_weekly.sh
```

## Verifying the Cron Job

```bash
# List current cron jobs
crontab -l

# Check cron is running
systemctl status cron

# Test the script manually
/usr/local/bin/mysql_backup.sh

# Check the log
tail -20 /var/log/mysql_backup.log
```

## Backup Rotation with find

```bash
# Remove daily backups older than 7 days
find /backup/mysql -name "*.sql.gz" -mtime +7 -delete

# Remove weekly backups older than 4 weeks
find /backup/mysql/weekly -name "*.sql.gz" -mtime +28 -delete
```

## Sending Backup Notifications

Add email notification to the script:

```bash
# At the end of the backup script
if [ $BACKUP_STATUS -eq 0 ]; then
  echo "MySQL backup completed successfully at $(date)" \
    | mail -s "MySQL Backup OK - $(hostname)" admin@example.com
else
  echo "MySQL backup FAILED at $(date)" \
    | mail -s "ALERT: MySQL Backup Failed - $(hostname)" admin@example.com
fi
```

## Summary

Automated MySQL backups with cron require a well-structured backup script, secure credential storage in a MySQL options file, a dedicated low-privilege backup user, and a cron schedule. Always implement backup rotation to prevent disk fill-up, log backup outcomes, and monitor the log file regularly. Test restoration from automated backups periodically to verify they are valid.
