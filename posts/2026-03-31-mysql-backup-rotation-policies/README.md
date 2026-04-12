# How to Implement MySQL Backup Rotation Policies

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Backup, Retention

Description: Learn how to implement MySQL backup rotation policies using grandfather-father-son retention, automated deletion scripts, and cloud lifecycle rules.

---

Backup rotation defines how long each backup is retained before deletion. Without a rotation policy, backup storage grows indefinitely. A well-designed rotation policy balances storage cost against recovery point coverage, ensuring you can recover from recent mistakes while keeping long-term restore points.

## Grandfather-Father-Son (GFS) Rotation

GFS is the most common rotation scheme for database backups. It maintains three retention tiers:

- **Daily (Son)**: kept for 7 days - for recovering recent accidental changes
- **Weekly (Father)**: kept for 4 weeks - for recovering from issues found later
- **Monthly (Grandfather)**: kept for 12 months - for compliance and long-term recovery

## Naming Convention

Include the backup type in the filename to simplify rotation logic:

```text
myapp_db-daily-2026-03-31.sql.gz
myapp_db-weekly-2026-03-23.sql.gz
myapp_db-monthly-2026-03-01.sql.gz
```

## Backup Script with GFS Logic

```bash
#!/bin/bash
DB="myapp_db"
BACKUP_DIR="/backups/mysql"
DATE=$(date +%F)
DOW=$(date +%u)   # 1=Monday, 7=Sunday
DOM=$(date +%d)   # Day of month

mkdir -p "$BACKUP_DIR/daily" "$BACKUP_DIR/weekly" "$BACKUP_DIR/monthly"

# Create daily backup
mysqldump \
  --single-transaction --routines --triggers --events \
  "$DB" | gzip > "$BACKUP_DIR/daily/$DB-daily-$DATE.sql.gz"

# Promote to weekly on Sunday
if [ "$DOW" -eq 7 ]; then
  cp "$BACKUP_DIR/daily/$DB-daily-$DATE.sql.gz" \
     "$BACKUP_DIR/weekly/$DB-weekly-$DATE.sql.gz"
fi

# Promote to monthly on the 1st
if [ "$DOM" -eq "01" ]; then
  cp "$BACKUP_DIR/daily/$DB-daily-$DATE.sql.gz" \
     "$BACKUP_DIR/monthly/$DB-monthly-$DATE.sql.gz"
fi

# Rotate: delete old backups
find "$BACKUP_DIR/daily"   -name "*.sql.gz" -mtime +7  -delete
find "$BACKUP_DIR/weekly"  -name "*.sql.gz" -mtime +28 -delete
find "$BACKUP_DIR/monthly" -name "*.sql.gz" -mtime +365 -delete

echo "Backup completed: $DATE"
```

## S3 Lifecycle Policies for Cloud Rotation

Use AWS S3 lifecycle rules to automate retention without running deletion scripts:

```json
{
  "Rules": [
    {
      "ID": "daily-rotation",
      "Filter": {"Prefix": "daily/"},
      "Status": "Enabled",
      "Expiration": {"Days": 7}
    },
    {
      "ID": "weekly-rotation",
      "Filter": {"Prefix": "weekly/"},
      "Status": "Enabled",
      "Expiration": {"Days": 28}
    },
    {
      "ID": "monthly-rotation",
      "Filter": {"Prefix": "monthly/"},
      "Status": "Enabled",
      "Transitions": [
        {"Days": 30, "StorageClass": "STANDARD_IA"},
        {"Days": 90, "StorageClass": "GLACIER"}
      ],
      "Expiration": {"Days": 365}
    }
  ]
}
```

Apply with:

```bash
aws s3api put-bucket-lifecycle-configuration \
  --bucket myapp-mysql-backups \
  --lifecycle-configuration file://lifecycle.json
```

## Tracking the Backup Inventory

Maintain a simple inventory log to monitor which backups exist:

```bash
# List all backups with sizes and ages
aws s3 ls s3://myapp-mysql-backups/ --recursive --human-readable | \
  sort -k1,2 | tail -20
```

## Verifying Rotation is Working

Check that old files are being removed as expected:

```bash
# Local check
ls -lh /backups/mysql/daily/ | wc -l  # Should not exceed 8

# S3 check
aws s3 ls s3://myapp-mysql-backups/daily/ | wc -l
```

## Summary

MySQL backup rotation policies use the GFS scheme to keep daily backups for 7 days, weekly for 4 weeks, and monthly for 12 months. Implement rotation with shell scripts and `find -delete` for local storage, and S3 lifecycle rules for cloud storage. Both approaches automate retention without manual cleanup.
