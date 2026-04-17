# How to Automate ClickHouse Backup Verification

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Backup, Verification, Automation, Data Integrity

Description: Automate ClickHouse backup verification by restoring to a test instance and running row count checks so you can trust your backups before you need them.

---

## Backups Without Verification Are Worthless

Taking a backup is only half the job. Without verification, you discover a corrupt backup exactly when you need it most - during a disaster. Automated verification closes this gap by proactively restoring and validating backups on a schedule.

## ClickHouse Backup Methods

ClickHouse supports several backup approaches:

- `BACKUP TABLE` / `BACKUP DATABASE` SQL commands
- `clickhouse-backup` open-source tool
- Filesystem snapshots of the data directory

This guide focuses on the `BACKUP`/`RESTORE` SQL commands available in ClickHouse 22.8+.

## Creating a Backup

```sql
BACKUP DATABASE analytics
TO S3('https://s3.amazonaws.com/my-backups/analytics/2026-03-31', 'ACCESS_KEY', 'SECRET_KEY');
```

## Automated Verification Script

The verification script restores the backup to a staging ClickHouse instance and checks row counts against the production instance:

```bash
#!/bin/bash
set -e
DATE=$(date +%Y-%m-%d)
BACKUP_PATH="s3://my-backups/analytics/${DATE}"
STAGING_HOST="ch-staging.internal"
PROD_HOST="ch-prod.internal"

# Restore to staging
clickhouse-client --host "${STAGING_HOST}" --query "
  RESTORE DATABASE analytics
  FROM S3('https://s3.amazonaws.com/my-backups/analytics/${DATE}', 'ACCESS_KEY', 'SECRET_KEY')
  SETTINGS allow_non_empty_tables = true;
"

# Compare row counts for each table
for TABLE in events users sessions; do
  PROD_COUNT=$(clickhouse-client --host "${PROD_HOST}" \
    --query "SELECT count() FROM analytics.${TABLE}" --format TSVRaw)
  STAGING_COUNT=$(clickhouse-client --host "${STAGING_HOST}" \
    --query "SELECT count() FROM analytics.${TABLE}" --format TSVRaw)

  echo "Table: ${TABLE} | Prod: ${PROD_COUNT} | Backup: ${STAGING_COUNT}"

  if [ "${STAGING_COUNT}" -lt $((PROD_COUNT * 95 / 100)) ]; then
    echo "FAIL: ${TABLE} row count too low in backup" >&2
    exit 1
  fi
done

echo "Backup verification PASSED for ${DATE}"
```

## Checking Checksum Integrity

For extra confidence, compare checksums of key columns:

```sql
SELECT
    table,
    sum(data_compressed_bytes) AS compressed,
    sum(data_uncompressed_bytes) AS uncompressed
FROM system.parts
WHERE database = 'analytics' AND active
GROUP BY table
ORDER BY table;
```

Run this on both production and the restored staging instance and compare results.

## Scheduling and Alerting

Run the verification job nightly via cron and alert on failures:

```bash
# /etc/cron.d/clickhouse-backup-verify
0 3 * * * root /opt/scripts/verify_backup.sh >> /var/log/ch_backup_verify.log 2>&1 || \
  curl -X POST https://oneuptime.example.com/api/alert \
    -d '{"severity":"critical","message":"ClickHouse backup verification failed"}'
```

## Summary

Automating ClickHouse backup verification by restoring to a staging instance and comparing row counts gives you continuous confidence that your backups are valid and can be used when a real restore is needed.
