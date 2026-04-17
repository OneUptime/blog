# How to Migrate Between ClickHouse Cloud Regions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, ClickHouse Cloud, Migration, Region, Backup, Disaster Recovery

Description: Learn how to migrate a ClickHouse Cloud service from one region to another using backups, exports, and the ClickHouse Cloud backup restore capabilities.

---

Moving a ClickHouse Cloud service to a different region requires exporting your data and importing it into a new service in the target region. ClickHouse Cloud does not currently support live cross-region migration, so planning for downtime or a cut-over window is necessary.

## Migration Strategy Overview

```text
1. Create new service in target region
2. Export schema from source service
3. Migrate data (backup restore or live replication)
4. Validate data in target service
5. Update application connection strings
6. Decommission source service
```

## Step 1 - Create Target Service

```bash
curl -X POST https://api.clickhouse.cloud/v1/organizations/${ORG_ID}/services \
  -H "Authorization: Bearer ${CLICKHOUSE_API_KEY}" \
  -d '{
    "name": "analytics-eu",
    "provider": "aws",
    "region": "eu-west-1",
    "tier": "production",
    "minTotalMemoryGb": 24,
    "maxTotalMemoryGb": 96
  }'
```

## Step 2 - Export Schema

```bash
clickhouse client --host source.clickhouse.cloud --port 9440 \
  --user default --password "$SOURCE_PASS" --secure \
  --query "SHOW CREATE TABLE analytics.events" \
  > events_schema.sql
```

Export all tables:

```bash
clickhouse client --host source.clickhouse.cloud --port 9440 \
  --user default --password "$SOURCE_PASS" --secure \
  --query "SELECT create_table_query || ';'
           FROM system.tables
           WHERE database NOT IN ('system', 'INFORMATION_SCHEMA', 'information_schema')
             AND engine NOT IN ('View', 'MaterializedView')
           FORMAT TabSeparatedRaw" \
  > full_schema.sql
```

## Step 3 - Migrate Data via S3

Export data from source:

```sql
INSERT INTO FUNCTION s3(
  's3://migration-bucket/events/data.parquet',
  'AWS_KEY', 'AWS_SECRET',
  'Parquet'
)
SELECT * FROM analytics.events;
```

Import into target:

```sql
INSERT INTO analytics.events
SELECT * FROM s3(
  's3://migration-bucket/events/data.parquet',
  'AWS_KEY', 'AWS_SECRET',
  'Parquet'
);
```

## Step 4 - Validate Row Counts

```bash
# Source
clickhouse client --host source.clickhouse.cloud --port 9440 --secure \
  --query "SELECT count() FROM analytics.events"

# Target
clickhouse client --host target.clickhouse.cloud --port 9440 --secure \
  --query "SELECT count() FROM analytics.events"
```

## Step 5 - Update Connection Strings

Update your application configuration with the new service hostname. ClickHouse Cloud hostnames are stable per service - they do not change after creation.

## Minimizing Downtime

For near-zero downtime migration:
1. Set up replication via Kafka or a change data capture tool
2. Let the target catch up to the source
3. Stop writes to source, verify sync, switch over

## Summary

Migrating between ClickHouse Cloud regions involves creating a new service, exporting schema and data via S3 or backup, validating integrity, and updating connection strings. Plan for a maintenance window or use a Kafka-based streaming approach for near-zero-downtime migrations.
