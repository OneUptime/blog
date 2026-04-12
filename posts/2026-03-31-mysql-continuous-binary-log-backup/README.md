# How to Implement Continuous Binary Log Backup for MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Backup, Binary Log

Description: Learn how to implement continuous binary log backup for MySQL using mysqlbinlog streaming, enabling point-in-time recovery between full backup windows.

---

Full backups run on a schedule (nightly, hourly), which means you can only restore to a point when that backup was taken. Binary log backup fills the gap by continuously capturing every committed transaction, enabling point-in-time recovery (PITR) to any moment between full backups.

## Prerequisites

Binary logging must be enabled in `my.cnf`:

```ini
[mysqld]
log_bin = /var/log/mysql/mysql-bin
binlog_format = ROW
sync_binlog = 1
expire_logs_days = 7
```

Verify binary logging is active:

```sql
SHOW VARIABLES LIKE 'log_bin';
SHOW BINARY LOGS;
```

## Continuous Streaming with mysqlbinlog

`mysqlbinlog` supports a `--read-from-remote-server` mode that streams binary logs in real time:

```bash
#!/bin/bash
MYSQL_HOST="127.0.0.1"
MYSQL_USER="backup_user"
MYSQL_PASS="secret"
BINLOG_DIR="/backups/binlogs"
START_FILE="mysql-bin.000001"

mkdir -p "$BINLOG_DIR"

mysqlbinlog \
  --read-from-remote-server \
  --host="$MYSQL_HOST" \
  --user="$MYSQL_USER" \
  --password="$MYSQL_PASS" \
  --raw \
  --stop-never \
  --to-last-log \
  --result-file="$BINLOG_DIR/" \
  "$START_FILE"
```

The `--stop-never` flag keeps the process running indefinitely, streaming each new binary log file as it is created. `--raw` writes binary log files directly rather than SQL text.

## Creating a Dedicated Backup User

```sql
CREATE USER 'backup_user'@'%' IDENTIFIED BY 'strong_password';
GRANT REPLICATION SLAVE ON *.* TO 'backup_user'@'%';
FLUSH PRIVILEGES;
```

## Uploading Binary Logs to S3

Run a background process to upload completed binary log files:

```bash
#!/bin/bash
BINLOG_DIR="/backups/binlogs"
S3_BUCKET="s3://myapp-mysql-binlogs"

# Upload all completed binlog files (not the active one)
ACTIVE_BINLOG=$(mysql -e "SHOW MASTER STATUS\G" | grep File | awk '{print $2}')

for f in "$BINLOG_DIR"/mysql-bin.*; do
  FILENAME=$(basename "$f")
  if [ "$FILENAME" != "$ACTIVE_BINLOG" ]; then
    aws s3 cp "$f" "$S3_BUCKET/$FILENAME" --sse AES256 && rm -f "$f"
  fi
done
```

## Point-in-Time Recovery

To restore to a specific timestamp, combine the last full backup with binary logs up to that moment:

```bash
# Step 1: Restore from the last full backup
gunzip < /backups/mysql/myapp_db-2026-03-30.sql.gz | mysql myapp_db

# Step 2: Download binary logs from S3
aws s3 sync s3://myapp-mysql-binlogs/ /tmp/binlogs/ \
  --exclude "*" --include "mysql-bin.0001*"

# Step 3: Apply binary logs up to the target time
mysqlbinlog \
  --stop-datetime="2026-03-31 14:30:00" \
  /tmp/binlogs/mysql-bin.000100 \
  /tmp/binlogs/mysql-bin.000101 | mysql myapp_db
```

## Monitoring the Streaming Process

Ensure the streaming process stays alive with a systemd service:

```ini
[Unit]
Description=MySQL Binary Log Streamer
After=network.target

[Service]
ExecStart=/opt/scripts/stream-binlogs.sh
Restart=always
RestartSec=10
User=mysql

[Install]
WantedBy=multi-user.target
```

## Summary

Continuous binary log backup for MySQL uses `mysqlbinlog --stop-never` to stream binary logs in real time to a local directory, which is then uploaded to cloud storage. Combined with periodic full backups, this enables point-in-time recovery to any moment between backup windows.
