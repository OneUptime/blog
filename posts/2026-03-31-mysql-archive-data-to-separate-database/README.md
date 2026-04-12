# How to Archive Data to a Separate MySQL Database

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Archive, Data Management, Replication, Storage

Description: Archive old MySQL data to a separate database to keep your operational database lean while preserving historical records for reporting and compliance.

---

## Why Archive to a Separate Database

Keeping years of historical data in your operational database slows queries, inflates backups, and increases storage costs. Archiving old data to a separate database - optimized for reads rather than transactional workloads - keeps your production database lean while preserving the data for reporting, compliance, and historical analysis.

## Architecture Overview

```text
Production DB (primary.mysql.example.com)
  - orders (last 90 days of active data)
  - order_items (last 90 days)

Archive DB (archive.mysql.example.com)
  - orders_archive (all orders older than 90 days)
  - order_items_archive (all order items older than 90 days)
```

## Setting Up the Archive Database

Create the archive database and tables (typically with the same schema):

```sql
-- On archive.mysql.example.com
CREATE DATABASE orders_archive CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE orders_archive.orders (
  id         BIGINT       NOT NULL,
  user_id    BIGINT       NOT NULL,
  total      DECIMAL(10,2) NOT NULL,
  status     VARCHAR(20)  NOT NULL,
  created_at DATETIME     NOT NULL,
  archived_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id, created_at)
)
ENGINE=InnoDB
PARTITION BY RANGE (YEAR(created_at)) (
  PARTITION p2024 VALUES LESS THAN (2025),
  PARTITION p2025 VALUES LESS THAN (2026),
  PARTITION p2026 VALUES LESS THAN (2027)
);
```

## Archival Script

Create a script that moves data in batches to avoid locking:

```bash
#!/bin/bash
# archive_orders.sh

PROD_HOST="primary.mysql.example.com"
ARCH_HOST="archive.mysql.example.com"
DB_USER="archive_user"
DB_PASS="${DB_PASSWORD}"
BATCH_SIZE=1000
CUTOFF_DATE=$(date -d '90 days ago' '+%Y-%m-%d')

echo "Archiving orders older than $CUTOFF_DATE"

# Get minimum ID to start archiving
MIN_ID=$(mysql -h "$PROD_HOST" -u "$DB_USER" -p"$DB_PASS" myapp -sNe \
  "SELECT MIN(id) FROM orders WHERE created_at < '$CUTOFF_DATE'")

MAX_ID=$(mysql -h "$PROD_HOST" -u "$DB_USER" -p"$DB_PASS" myapp -sNe \
  "SELECT MAX(id) FROM orders WHERE created_at < '$CUTOFF_DATE'")

echo "Archiving orders from ID $MIN_ID to $MAX_ID"

CURRENT_ID=$MIN_ID
while [ "$CURRENT_ID" -le "$MAX_ID" ]; do
  NEXT_ID=$((CURRENT_ID + BATCH_SIZE))

  # Export batch from production
  mysql -h "$PROD_HOST" -u "$DB_USER" -p"$DB_PASS" myapp -sNe "
    SELECT id, user_id, total, status, created_at
    FROM orders
    WHERE id >= $CURRENT_ID AND id < $NEXT_ID
      AND created_at < '$CUTOFF_DATE';
  " | mysql -h "$ARCH_HOST" -u "$DB_USER" -p"$DB_PASS" --local-infile orders_archive -e "
    LOAD DATA LOCAL INFILE '/dev/stdin' IGNORE INTO TABLE orders
    FIELDS TERMINATED BY '\t'
    (id, user_id, total, status, created_at);
  "

  # Alternative: use mysqldump and pipe to archive
  # mysqldump -h "$PROD_HOST" -u "$DB_USER" -p"$DB_PASS" myapp orders \
  #   --where="id >= $CURRENT_ID AND id < $NEXT_ID AND created_at < '$CUTOFF_DATE'" \
  #   --no-create-info | mysql -h "$ARCH_HOST" -u "$DB_USER" -p"$DB_PASS" orders_archive

  # Verify rows were inserted before deleting
  ARCHIVED=$(mysql -h "$ARCH_HOST" -u "$DB_USER" -p"$DB_PASS" orders_archive -sNe \
    "SELECT COUNT(*) FROM orders WHERE id >= $CURRENT_ID AND id < $NEXT_ID")

  ORIGINAL=$(mysql -h "$PROD_HOST" -u "$DB_USER" -p"$DB_PASS" myapp -sNe \
    "SELECT COUNT(*) FROM orders WHERE id >= $CURRENT_ID AND id < $NEXT_ID AND created_at < '$CUTOFF_DATE'")

  if [ "$ARCHIVED" -eq "$ORIGINAL" ]; then
    mysql -h "$PROD_HOST" -u "$DB_USER" -p"$DB_PASS" myapp -e "
      DELETE FROM orders WHERE id >= $CURRENT_ID AND id < $NEXT_ID
        AND created_at < '$CUTOFF_DATE';
    "
    echo "Archived and deleted batch $CURRENT_ID - $NEXT_ID ($ORIGINAL rows)"
  else
    echo "ERROR: Archive count mismatch for batch $CURRENT_ID - $NEXT_ID. Stopping."
    exit 1
  fi

  CURRENT_ID=$NEXT_ID
  sleep 0.2
done
```

## Scheduling the Archival Job

```yaml
# kubernetes/cronjob-mysql-archive.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: mysql-archive-orders
spec:
  schedule: "0 1 * * 0"  # Weekly on Sunday at 01:00 UTC
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: Never
          containers:
            - name: archiver
              image: mysql:8.0
              command: ["/scripts/archive_orders.sh"]
              env:
                - name: DB_PASSWORD
                  valueFrom:
                    secretKeyRef:
                      name: mysql-archive-credentials
                      key: password
```

## Summary

Archiving MySQL data to a separate database preserves historical records while keeping the operational database lean. The key safety mechanism is verifying row counts in the archive before deleting from production. Partitioned archive tables allow efficient queries by date range, and batch processing with short pauses prevents the archive job from impacting production performance.
