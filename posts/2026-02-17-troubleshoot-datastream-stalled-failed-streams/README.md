# How to Troubleshoot Datastream Stalled or Failed Streams

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Datastream, Troubleshooting, CDC, Debugging, Cloud Monitoring, BigQuery

Description: A practical troubleshooting guide for diagnosing and fixing stalled or failed Google Cloud Datastream CDC streams in production environments.

---

You check your analytics dashboard and the numbers look off. A quick glance at your Datastream console reveals the stream is in an error state, or worse, it shows as running but data stopped flowing 3 hours ago. Stalled and failed streams are the most common operational headache with Datastream, and knowing how to diagnose and fix them quickly is essential for anyone running CDC pipelines in production.

This guide is organized by symptom, so you can jump to the section that matches what you are seeing.

## Quick Diagnostic Steps

Before diving into specific issues, run these commands to get a picture of what is happening:

```bash
# Check the stream status
gcloud datastream streams describe my-stream \
  --location=us-central1 \
  --project=my-project \
  --format="yaml(state, errors, updateTime)"

# Check stream object statuses (per-table status)
gcloud datastream streams objects list my-stream \
  --location=us-central1 \
  --project=my-project \
  --format="table(displayName, sourceObject, errors)"

# Check Cloud Logging for Datastream errors
gcloud logging read 'resource.type="datastream.googleapis.com/Stream" severity>=ERROR' \
  --limit=20 \
  --project=my-project \
  --format="table(timestamp, textPayload)"
```

## Symptom: Stream Shows RUNNING but No Data Flowing

This is the sneakiest failure mode. The stream status says everything is fine, but BigQuery has not received new data for a while.

**Check freshness in BigQuery:**

```sql
-- See when the last data arrived for each replicated table
SELECT
  'orders' AS table_name,
  MAX(datastream_metadata.source_timestamp) AS latest_event,
  TIMESTAMP_DIFF(CURRENT_TIMESTAMP(), MAX(datastream_metadata.source_timestamp), MINUTE) AS lag_minutes
FROM `my-project.replicated.orders`
UNION ALL
SELECT
  'customers',
  MAX(datastream_metadata.source_timestamp),
  TIMESTAMP_DIFF(CURRENT_TIMESTAMP(), MAX(datastream_metadata.source_timestamp), MINUTE)
FROM `my-project.replicated.customers`
```

**Common causes:**

1. **Source database is not generating changes.** If there are no writes to the source, there are no CDC events to replicate. This is normal for low-traffic databases during off-hours.

2. **Binary log or WAL has been purged.** If the source database's change log was deleted before Datastream could read it, the stream stops receiving new events without necessarily throwing an error.

For MySQL, check binlog retention:

```sql
-- Check binlog files and when they were created
SHOW BINARY LOGS;

-- Check binlog expiration setting
SHOW VARIABLES LIKE 'expire_logs_days';
SHOW VARIABLES LIKE 'binlog_expire_logs_seconds';
```

For PostgreSQL, check the replication slot:

```sql
-- Check if the replication slot is still active
SELECT slot_name, active, restart_lsn,
  pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)) AS lag
FROM pg_replication_slots
WHERE slot_name LIKE '%datastream%';
```

3. **Network connectivity issue.** The stream may have lost its connection to the source. Check the private connectivity status:

```bash
gcloud datastream private-connections describe my-peering \
  --location=us-central1 \
  --format="yaml(state, error)"
```

## Symptom: Stream in ERROR State

When the stream enters an error state, it stops processing entirely.

```bash
# Get detailed error information
gcloud datastream streams describe my-stream \
  --location=us-central1 \
  --format="yaml(errors)"
```

**Common errors and fixes:**

**"Unable to connect to source"** - The source database is unreachable. Check network connectivity, firewall rules, and whether the database is running.

```bash
# Test connectivity from a VM in the same VPC
# (Create a temporary VM if needed)
gcloud compute ssh test-vm --zone=us-central1-a --command="nc -zv 10.0.1.5 3306"
```

**"Authentication failed"** - The Datastream user's password was changed, or permissions were revoked.

```bash
# Update the connection profile with new credentials
gcloud datastream connection-profiles update mysql-source \
  --location=us-central1 \
  --mysql-password=new-password \
  --project=my-project
```

**"Unsupported column type"** - A column type that Datastream cannot handle was added to a replicated table. Check the source table for recent schema changes.

**"Binary log position not available"** - The binlog that Datastream needs has been purged. You will need to restart the stream with a fresh backfill.

## Symptom: Stream Paused and Cannot Resume

Sometimes a stream gets stuck in a PAUSED state and refuses to resume.

```bash
# Try to resume the stream
gcloud datastream streams update my-stream \
  --location=us-central1 \
  --state=RUNNING \
  --project=my-project
```

If this fails, check:

```bash
# Look for validation errors
gcloud datastream streams describe my-stream \
  --location=us-central1 \
  --format="yaml(errors, backfillAll, sourceConfig)"
```

If the source changed significantly while the stream was paused (tables dropped, permissions changed), you may need to update the stream configuration before resuming.

## Symptom: High Replication Lag

The stream is running but falling behind. Lag keeps increasing.

```bash
# Check current lag metrics
gcloud monitoring metrics list \
  --filter='metric.type = starts_with("datastream.googleapis.com/stream/total_latency")'
```

**Common causes:**

1. **Source database write volume spike.** A batch job or data migration is writing faster than Datastream can read.

2. **Large transactions.** Datastream processes transactions atomically. A single transaction that modifies millions of rows creates a processing bottleneck.

3. **BigQuery quota limits.** Datastream's writes might be hitting BigQuery streaming insert quotas.

```bash
# Check BigQuery quota usage
gcloud alpha services quota list \
  --service=bigquery.googleapis.com \
  --consumer=projects/my-project \
  --filter="metric:streamingInsertRows"
```

4. **Backfill running alongside CDC.** If a backfill is in progress for large tables, it competes with CDC processing.

## Symptom: Specific Table Not Replicating

All other tables are fine, but one table is not getting updates.

```bash
# Check the status of specific stream objects
gcloud datastream streams objects list my-stream \
  --location=us-central1 \
  --format="yaml(displayName, sourceObject, errors, backfillJob)"
```

**Common causes:**

1. **Table excluded from stream configuration.** Verify the table is in the include list.

2. **Missing permissions on the source table.** The Datastream user may lack SELECT permissions.

```sql
-- MySQL: Check grants for the Datastream user
SHOW GRANTS FOR 'datastream_user'@'%';

-- PostgreSQL: Check table permissions
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'my_table';
```

3. **Table lacks a primary key.** Datastream requires a primary key for CDC on some database types. Tables without primary keys may be skipped silently.

```sql
-- MySQL: Check if the table has a primary key
SELECT TABLE_NAME, COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'production'
  AND CONSTRAINT_NAME = 'PRIMARY';
```

## Recovery Procedures

### Resuming After Fixing the Issue

Most issues can be resolved by fixing the underlying problem and resuming the stream:

```bash
# Resume a stream after fixing the root cause
gcloud datastream streams update my-stream \
  --location=us-central1 \
  --state=RUNNING
```

### Recreating the Stream

If the stream is beyond repair (corrupted state, lost binlog position), you need to recreate it:

```bash
# Delete the broken stream
gcloud datastream streams delete my-stream \
  --location=us-central1

# Create a new stream with fresh backfill
gcloud datastream streams create my-stream-v2 \
  --display-name="CDC Stream v2" \
  --location=us-central1 \
  --source=mysql-source \
  --destination=bq-dest \
  --backfill-all
```

Before deleting, make sure to note the stream configuration so you can recreate it identically.

### Partial Recovery with BigQuery

If you lost some CDC events but do not want to do a full re-backfill, you can patch the gaps:

```sql
-- Identify the gap period
SELECT
  MIN(datastream_metadata.source_timestamp) AS first_event,
  MAX(datastream_metadata.source_timestamp) AS last_event
FROM `my-project.replicated.orders`;

-- Then export the missing data range from the source database
-- and load it into BigQuery using bq load or a one-time query
```

## Preventive Measures

Set up these safeguards to catch issues before they become incidents:

```bash
# Alert on stream state changes
gcloud alpha monitoring policies create \
  --display-name="Datastream Stream State Alert" \
  --condition-display-name="Stream not running" \
  --condition-filter='metric.type="datastream.googleapis.com/stream/event_count" resource.type="datastream.googleapis.com/Stream"' \
  --condition-threshold-comparison=COMPARISON_LT \
  --condition-threshold-value=1 \
  --condition-threshold-duration=600s \
  --notification-channels=projects/my-project/notificationChannels/CHANNEL_ID
```

Also schedule a daily health check that validates data freshness across all replicated tables:

```sql
-- Daily health check query, schedule this in BigQuery
SELECT
  table_name,
  latest_event,
  lag_minutes,
  CASE
    WHEN lag_minutes > 60 THEN 'CRITICAL'
    WHEN lag_minutes > 10 THEN 'WARNING'
    ELSE 'OK'
  END AS status
FROM (
  SELECT 'orders' AS table_name,
    MAX(datastream_metadata.source_timestamp) AS latest_event,
    TIMESTAMP_DIFF(CURRENT_TIMESTAMP(), MAX(datastream_metadata.source_timestamp), MINUTE) AS lag_minutes
  FROM `my-project.replicated.orders`
)
```

## Wrapping Up

Most Datastream failures come down to a handful of root causes: network connectivity, source database permissions, binary log retention, and resource limits. The key to fast resolution is having monitoring in place that catches issues early and knowing the diagnostic commands to quickly identify the root cause. Keep this guide handy for when things go wrong, because in any long-running CDC pipeline, they eventually will.
