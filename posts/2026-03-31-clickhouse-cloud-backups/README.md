# How to Configure ClickHouse Cloud Backups

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, ClickHouse Cloud, Backup, Restore, Disaster Recovery, Data Protection

Description: Learn how ClickHouse Cloud handles automated backups, how to restore from a backup, and how to configure backup retention for your services.

---

ClickHouse Cloud automatically backs up your data with no additional configuration required. Understanding how backups work, what the retention policy is, and how to trigger restores helps you plan your disaster recovery and compliance strategy.

## Automatic Backup Schedule

ClickHouse Cloud performs automated backups:
- **Default schedule**: One backup every 24 hours
- **Default retention**: 24 hours
- **Configurable backups**: Available on Scale and Enterprise tiers, where you can adjust retention, frequency, and start time

These are managed entirely by ClickHouse Cloud - you do not need to configure backup jobs. The Basic tier uses the default schedule and retention only.

## Viewing Available Backups

In the ClickHouse Cloud console:
1. Open your service
2. Click "Backups"
3. View the list of available restore points with timestamps and sizes

Via API:

```bash
curl --user "${KEY_ID}:${KEY_SECRET}" \
  https://api.clickhouse.cloud/v1/organizations/${ORG_ID}/services/${SERVICE_ID}/backups \
  | jq '.result[] | {id: .id, status: .status, startedAt: .startedAt, size: .sizeInBytes}'
```

## Restoring from a Backup

Restores create a **new service** - they do not overwrite your existing service. To restore, create a new service and pass the `backupId` as the initial state. The new service must use the same region and tier as the original:

```bash
curl -X POST \
  --user "${KEY_ID}:${KEY_SECRET}" \
  https://api.clickhouse.cloud/v1/organizations/${ORG_ID}/services \
  -H "Content-Type: application/json" \
  -d '{
    "name": "analytics-restored",
    "provider": "aws",
    "region": "us-east-1",
    "tier": "production",
    "backupId": "'"${BACKUP_ID}"'"
  }'
```

## Exporting Data as a Self-Managed Backup

For additional protection or to maintain your own backups:

```sql
-- Export to S3
INSERT INTO FUNCTION s3(
  's3://my-backups/clickhouse/events/2024-03-31.parquet',
  'KEY', 'SECRET',
  'Parquet'
)
SELECT * FROM analytics.events
WHERE event_date = today();
```

## Checking Backup Size

```sql
SELECT
    database,
    formatReadableSize(sum(bytes_on_disk)) AS total_size
FROM system.parts
WHERE active = 1
GROUP BY database;
```

## Point-in-Time Recovery

ClickHouse Cloud does not currently support arbitrary point-in-time recovery. Restores are to specific backup snapshots. For fine-grained PITR, maintain your own write-ahead log via Kafka or use the S3 export pattern above.

## Summary

ClickHouse Cloud handles automated daily backups with a 24-hour default retention, configurable on Scale and Enterprise tiers. Restore to a new service via the console or API by referencing a `backupId` when creating the service. Supplement managed backups with S3 exports for cross-account redundancy or longer retention.
