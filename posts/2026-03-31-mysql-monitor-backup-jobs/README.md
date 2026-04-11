# How to Monitor MySQL Backup Jobs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Backup, Monitoring

Description: Learn how to monitor MySQL backup jobs by tracking job status in a table, sending alerts on failure, and integrating with monitoring tools for visibility.

---

Backup jobs that fail silently are more dangerous than having no backup at all - they create a false sense of security. Monitoring MySQL backup jobs means tracking success and failure, alerting on anomalies, and verifying that backups are growing as expected.

## Backup Status Tracking Table

Log every backup attempt to a dedicated table:

```sql
CREATE TABLE backup_log (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  backup_type ENUM('full', 'incremental', 'binlog') NOT NULL,
  started_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finished_at DATETIME NULL,
  status      ENUM('running', 'success', 'failed') NOT NULL DEFAULT 'running',
  file_path   VARCHAR(500) NULL,
  file_size_bytes BIGINT UNSIGNED NULL,
  error_message   TEXT NULL,
  duration_seconds INT UNSIGNED NULL
);
```

## Logging from Backup Scripts

Update the log table at the start and end of each backup:

```bash
#!/bin/bash
set -o pipefail
DB="myapp_db"
DATE=$(date +%F)
OUTPUT_FILE="/backups/mysql/$DB-$DATE.sql.gz"

# Insert start record and capture the ID
LOG_ID=$(mysql -e "
  INSERT INTO myapp_monitoring.backup_log (backup_type, status)
  VALUES ('full', 'running');
  SELECT LAST_INSERT_ID();
" --skip-column-names 2>/dev/null | tail -1)

START_TS=$(date +%s)

# Run backup
if mysqldump \
     --single-transaction --routines --triggers --events \
     "$DB" | gzip > "$OUTPUT_FILE"; then
  END_TS=$(date +%s)
  FILE_SIZE=$(stat -c%s "$OUTPUT_FILE")
  DURATION=$((END_TS - START_TS))

  mysql -e "
    UPDATE myapp_monitoring.backup_log
    SET status='success',
        finished_at=NOW(),
        file_path='$OUTPUT_FILE',
        file_size_bytes=$FILE_SIZE,
        duration_seconds=$DURATION
    WHERE id=$LOG_ID;
  "
else
  mysql -e "
    UPDATE myapp_monitoring.backup_log
    SET status='failed',
        finished_at=NOW(),
        error_message='mysqldump exited with non-zero status'
    WHERE id=$LOG_ID;
  "
  exit 1
fi
```

## Alert on Backup Failure

Send an alert immediately when a backup fails. Using curl with a webhook:

```bash
# Add to the failure block in the script
send_alert() {
  curl -s -X POST \
    -H 'Content-type: application/json' \
    --data "{\"text\": \"MySQL backup FAILED on $(hostname) at $(date). File: $OUTPUT_FILE\"}" \
    https://hooks.slack.com/services/YOUR/WEBHOOK/URL
}
```

## Detecting Missing Backups

A backup job that never ran (cron misconfiguration, server down) leaves no failure entry. Query for expected backups that did not arrive:

```sql
-- Alert if no successful full backup in the last 26 hours
SELECT
  CASE
    WHEN COUNT(*) = 0 THEN 'ALERT: No backup completed in 26 hours'
    ELSE 'OK'
  END AS backup_status
FROM backup_log
WHERE backup_type = 'full'
  AND status = 'success'
  AND finished_at > NOW() - INTERVAL 26 HOUR;
```

Run this as a scheduled check via cron or a monitoring tool.

## Checking Backup File Size Trend

A backup that is significantly smaller than usual may indicate data loss or a partial dump:

```sql
SELECT
  DATE(finished_at) AS backup_date,
  file_size_bytes,
  ROUND(file_size_bytes / 1024 / 1024, 1) AS size_mb,
  ROUND(100.0 * (file_size_bytes - LAG(file_size_bytes) OVER (ORDER BY finished_at)) /
    NULLIF(LAG(file_size_bytes) OVER (ORDER BY finished_at), 0), 1) AS pct_change
FROM backup_log
WHERE backup_type = 'full' AND status = 'success'
ORDER BY finished_at DESC
LIMIT 14;
```

A sudden drop of more than 20% warrants investigation.

## Prometheus Metrics via Node Exporter Textfile

Export backup metrics for Prometheus scraping:

```bash
# Write metrics after each backup
cat > /var/lib/node_exporter/mysql_backup.prom << EOF
# HELP mysql_last_backup_timestamp Unix timestamp of last successful backup
# TYPE mysql_last_backup_timestamp gauge
mysql_last_backup_timestamp $(date +%s)

# HELP mysql_last_backup_size_bytes Size of last backup in bytes
# TYPE mysql_last_backup_size_bytes gauge
mysql_last_backup_size_bytes $FILE_SIZE
EOF
```

## Summary

Monitoring MySQL backup jobs requires logging every attempt to a status table, sending immediate alerts on failures, running scheduled checks for missing backups, and tracking file size trends to detect anomalies. Integrating backup metrics with Prometheus or your existing monitoring stack provides centralized visibility.
