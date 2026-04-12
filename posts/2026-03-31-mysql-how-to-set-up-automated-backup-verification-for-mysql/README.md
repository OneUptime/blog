# How to Set Up Automated Backup Verification for MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Backup, Verification, Automation, Reliability

Description: Learn how to automate MySQL backup verification by restoring backups to a test instance, running integrity checks, and alerting on failures.

---

## Why Verify Backups

A backup that has never been tested is not a backup - it is a hope. Backup files can become corrupted, incomplete, or unrestorable due to bugs in the backup tool, storage failures, or configuration errors. Automated backup verification catches these issues before a real disaster occurs.

## Verification Architecture

A typical automated verification setup:

```text
1. Backup job runs (mysqldump or xtrabackup)
2. Backup file stored in S3 / NFS / local disk
3. Verification job (runs daily):
   a. Downloads latest backup
   b. Restores to a throwaway MySQL instance (Docker container)
   c. Runs integrity checks (mysqlcheck, row counts, application queries)
   d. Reports results and alerts on failure
4. Throwaway instance destroyed
```

## Step 1: Create the Backup

```bash
#!/bin/bash
DATE=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="/backups/all-databases-${DATE}.sql.gz"

mysqldump \
  -u root \
  -p${MYSQL_ROOT_PASSWORD} \
  --all-databases \
  --single-transaction \
  --flush-logs \
  --source-data=2 \
  | gzip > ${BACKUP_FILE}

aws s3 cp ${BACKUP_FILE} s3://my-mysql-backups/
echo "Backup complete: ${BACKUP_FILE}"
```

## Step 2: The Verification Script

```bash
#!/bin/bash
set -euo pipefail

BACKUP_BUCKET="s3://my-mysql-backups"
VERIFY_PORT=3307
VERIFY_CONTAINER="mysql-verify-$$"

# Download latest backup
LATEST_BACKUP=$(aws s3 ls ${BACKUP_BUCKET}/ | sort | tail -1 | awk '{print $4}')
aws s3 cp ${BACKUP_BUCKET}/${LATEST_BACKUP} /tmp/backup.sql.gz

echo "Verifying backup: ${LATEST_BACKUP}"

# Start a throwaway MySQL container
docker run -d \
  --name ${VERIFY_CONTAINER} \
  -p ${VERIFY_PORT}:3306 \
  -e MYSQL_ROOT_PASSWORD=verifypass \
  mysql:8.0

# Wait for MySQL to be ready
sleep 30
until docker exec ${VERIFY_CONTAINER} mysqladmin ping -h localhost -uroot -pverifypass --silent; do
  sleep 5
done

# Restore the backup
gunzip -c /tmp/backup.sql.gz | docker exec -i ${VERIFY_CONTAINER} \
  mysql -uroot -pverifypass

echo "Backup restored successfully"
```

## Step 3: Run Integrity Checks

```bash
# Check all tables for corruption
docker exec ${VERIFY_CONTAINER} \
  mysqlcheck -uroot -pverifypass --all-databases --check

# Check specific critical tables
docker exec ${VERIFY_CONTAINER} \
  mysql -uroot -pverifypass -e "
    SELECT COUNT(*) AS user_count FROM myapp.users;
    SELECT COUNT(*) AS order_count FROM myapp.orders;
    SELECT MAX(created_at) AS latest_order FROM myapp.orders;
  "
```

## Step 4: Run Application-Level Queries

Test that critical data is present and consistent:

```bash
EXPECTED_USERS=1000

ACTUAL_USERS=$(docker exec ${VERIFY_CONTAINER} \
  mysql -uroot -pverifypass -sN -e "SELECT COUNT(*) FROM myapp.users")

if [ "$ACTUAL_USERS" -lt "$EXPECTED_USERS" ]; then
  echo "FAIL: Expected at least ${EXPECTED_USERS} users, found ${ACTUAL_USERS}"
  exit 1
fi

echo "PASS: Found ${ACTUAL_USERS} users (expected >= ${EXPECTED_USERS})"
```

## Step 5: Cleanup and Report

```bash
# Cleanup
docker rm -f ${VERIFY_CONTAINER} || true
rm -f /tmp/backup.sql.gz

# Report success
echo "Backup verification PASSED for: ${LATEST_BACKUP}" | \
  mail -s "MySQL Backup Verification - PASSED" ops@example.com
```

## Step 6: Alert on Failure

Wrap the entire script in a trap for failures:

```bash
#!/bin/bash
set -euo pipefail

cleanup() {
  docker rm -f ${VERIFY_CONTAINER} 2>/dev/null || true
  rm -f /tmp/backup.sql.gz
}

handle_failure() {
  cleanup
  echo "ALERT: MySQL backup verification FAILED for ${LATEST_BACKUP}" | \
    mail -s "CRITICAL: MySQL Backup Verification FAILED" ops@example.com
  # Send to PagerDuty, Slack, etc.
  curl -X POST -H 'Content-Type: application/json' \
    https://hooks.slack.com/services/... \
    -d '{"text": "CRITICAL: MySQL backup verification failed!"}'
  exit 1
}

trap handle_failure ERR
trap cleanup EXIT
```

## Schedule with Cron

```bash
# Run verification daily at 6 AM
(crontab -l 2>/dev/null; echo "0 6 * * * /opt/scripts/verify-mysql-backup.sh >> /var/log/backup-verify.log 2>&1") | crontab -
```

## Track Verification History

```sql
CREATE TABLE backup_verifications (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  backup_filename VARCHAR(255),
  verified_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  status          ENUM('PASS', 'FAIL'),
  details         TEXT
);
```

## Summary

Automated MySQL backup verification restores each backup to a throwaway container, runs integrity checks, validates row counts, and alerts on failure. This process confirms that backups are actually restorable before a real disaster occurs. Schedule verification daily and track results in a log table to maintain a history of backup health over time.
