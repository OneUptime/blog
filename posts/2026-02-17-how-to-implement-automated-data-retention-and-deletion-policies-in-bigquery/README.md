# How to Implement Automated Data Retention and Deletion Policies in BigQuery

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, BigQuery, Data Retention, Data Lifecycle, Compliance

Description: Learn how to set up automated data retention and deletion policies in BigQuery using table expiration, partition expiration, and scheduled queries for compliance.

---

Data retention is one of those things that starts simple and gets complicated fast. You need to keep data long enough for business and legal requirements, but not so long that you are paying for storage you do not need or violating privacy regulations that require timely deletion. BigQuery provides several mechanisms for automating data lifecycle management, and understanding which one to use in which situation saves both headaches and money.

This guide covers the practical approaches to data retention in BigQuery: table expiration, partition expiration, scheduled deletion queries, and how to combine them into a coherent retention strategy.

## Table-Level Expiration

The simplest retention mechanism is table expiration. You set a duration, and BigQuery automatically deletes the table when it expires. This works well for temporary tables, staging data, and any table with a fixed useful life.

This command creates a table that automatically expires after 90 days.

```bash
# Create a table with a 90-day expiration
bq mk --table \
  --expiration=7776000 \
  --description="Staging data - auto-expires in 90 days" \
  my-project:analytics.staging_events \
  event_id:STRING,event_type:STRING,event_time:TIMESTAMP,payload:STRING
```

You can also set a default table expiration at the dataset level, which applies to all new tables created in that dataset.

```bash
# Set a 30-day default expiration for all new tables in a dataset
bq update --default_table_expiration=2592000 my-project:temp_analytics
```

Existing tables are not affected by changing the dataset default - it only applies to tables created after the change.

## Partition Expiration

For large tables that use time-based partitioning, partition expiration is the most practical retention mechanism. Instead of deleting entire tables, BigQuery drops individual partitions as they age out. This is what you want for event data, logs, and any time-series data.

This SQL creates a partitioned table with automatic partition expiration after 365 days.

```sql
-- Create a partitioned table with 365-day partition expiration
-- Old partitions are automatically deleted
CREATE TABLE `my-project.analytics.user_events`
(
  event_id STRING,
  user_id STRING,
  event_type STRING,
  event_time TIMESTAMP,
  properties JSON
)
PARTITION BY DATE(event_time)
OPTIONS (
  partition_expiration_days = 365,
  description = "User events with 1-year retention"
);
```

You can update partition expiration on existing tables too.

```bash
# Set partition expiration on an existing partitioned table
bq update --time_partitioning_expiration=31536000 \
  my-project:analytics.user_events
```

Here is what happens behind the scenes when partitions expire:

```mermaid
graph LR
    A[Day 1: Partition Created] --> B[Day 365: Partition Expires]
    B --> C[BigQuery Drops Partition]
    C --> D[Storage Freed]
    style B fill:#ffa94d,color:#000
    style C fill:#ff6b6b,color:#fff
```

## Scheduled Queries for Complex Retention Logic

Table and partition expiration handle simple age-based retention. But many organizations have more complex rules: keep summary data forever, keep detailed data for 90 days, delete PII after 30 days but keep anonymized records. For these cases, scheduled queries are the way to go.

This scheduled query runs daily to delete rows older than 30 days from a non-partitioned table.

```sql
-- Scheduled daily: Delete records older than 30 days
-- Targets PII-containing columns specifically
DELETE FROM `my-project.analytics.user_profiles`
WHERE last_updated < TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY);
```

To create this as a scheduled query using the bq CLI:

```bash
# Schedule a daily deletion query at 2 AM UTC
bq query --use_legacy_sql=false \
  --schedule="every 24 hours" \
  --display_name="Delete expired user profiles" \
  --destination_table="" \
  --target_dataset="analytics" \
  'DELETE FROM `my-project.analytics.user_profiles` WHERE last_updated < TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)'
```

### Tiered Retention with Aggregation

A common pattern is to aggregate data before deleting the detailed records. This preserves business intelligence while respecting retention limits.

```sql
-- Step 1: Aggregate detailed events into daily summaries
-- Run this before deleting the detailed data
INSERT INTO `my-project.analytics.daily_event_summary`
SELECT
  DATE(event_time) AS event_date,
  event_type,
  COUNT(*) AS event_count,
  COUNT(DISTINCT user_id) AS unique_users,
  -- No PII in the summary
  CURRENT_TIMESTAMP() AS aggregated_at
FROM `my-project.analytics.detailed_events`
WHERE DATE(event_time) = DATE_SUB(CURRENT_DATE(), INTERVAL 91 DAY)
GROUP BY event_date, event_type;

-- Step 2: Delete the detailed data that has been aggregated
DELETE FROM `my-project.analytics.detailed_events`
WHERE DATE(event_time) <= DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY);
```

## Terraform Configuration for Retention Policies

Managing retention policies as code ensures consistency and auditability.

```hcl
# BigQuery dataset with default table expiration
resource "google_bigquery_dataset" "staging" {
  dataset_id                      = "staging_data"
  project                         = "my-project"
  location                        = "US"
  default_table_expiration_ms     = 2592000000 # 30 days in milliseconds
  default_partition_expiration_ms = 7776000000 # 90 days in milliseconds
  description                     = "Staging data with 30-day table and 90-day partition expiration"
}

# Partitioned table with specific retention
resource "google_bigquery_table" "events" {
  dataset_id = google_bigquery_dataset.staging.dataset_id
  table_id   = "user_events"
  project    = "my-project"

  time_partitioning {
    type          = "DAY"
    field         = "event_time"
    expiration_ms = 31536000000 # 365 days
  }

  schema = jsonencode([
    {
      name = "event_id"
      type = "STRING"
      mode = "REQUIRED"
    },
    {
      name = "user_id"
      type = "STRING"
      mode = "REQUIRED"
    },
    {
      name = "event_time"
      type = "TIMESTAMP"
      mode = "REQUIRED"
    },
    {
      name = "event_type"
      type = "STRING"
      mode = "REQUIRED"
    }
  ])
}

# Scheduled query for complex retention
resource "google_bigquery_data_transfer_config" "retention_cleanup" {
  display_name   = "Daily PII cleanup"
  project        = "my-project"
  location       = "US"
  data_source_id = "scheduled_query"

  schedule = "every day 02:00"

  params = {
    query = <<-SQL
      DELETE FROM `my-project.staging_data.user_profiles`
      WHERE last_updated < TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
    SQL
  }
}
```

## Monitoring Retention Policy Execution

You need to verify that your retention policies are actually working. Here are queries to monitor their effectiveness.

This query checks the age distribution of data in your partitioned tables to confirm partitions are being cleaned up.

```sql
-- Check partition age distribution to verify retention is working
SELECT
  table_name,
  partition_id,
  total_rows,
  total_logical_bytes / (1024 * 1024 * 1024) AS size_gb,
  PARSE_DATE('%Y%m%d', partition_id) AS partition_date,
  DATE_DIFF(CURRENT_DATE(), PARSE_DATE('%Y%m%d', partition_id), DAY) AS age_days
FROM `my-project.analytics.INFORMATION_SCHEMA.PARTITIONS`
WHERE partition_id != '__NULL__'
ORDER BY partition_date ASC
LIMIT 20;
```

This query shows storage trends over time, helping you confirm that retention is keeping storage in check.

```sql
-- Track dataset storage over time
SELECT
  table_name,
  SUM(total_logical_bytes) / (1024 * 1024 * 1024) AS total_gb,
  SUM(total_rows) AS total_rows,
  MIN(PARSE_DATE('%Y%m%d', partition_id)) AS oldest_partition,
  MAX(PARSE_DATE('%Y%m%d', partition_id)) AS newest_partition
FROM `my-project.analytics.INFORMATION_SCHEMA.PARTITIONS`
WHERE partition_id != '__NULL__'
GROUP BY table_name
ORDER BY total_gb DESC;
```

## Handling Retention for Compliance

Different compliance frameworks have different retention requirements. Here is a practical mapping:

| Data Type | GDPR | HIPAA | PCI DSS | Recommended Approach |
|-----------|------|-------|---------|---------------------|
| PII / PHI | Delete when purpose fulfilled | 6 years | Varies | Partition expiration + scheduled deletion |
| Transaction logs | As needed | 6 years | 1 year minimum | Partition expiration with long retention |
| Audit logs | As needed | 6 years | 1 year minimum | Separate dataset, long retention |
| Analytics (anonymized) | No limit | No limit | No limit | No expiration needed |

## Best Practices

After implementing retention across multiple BigQuery environments, these are the patterns that work:

1. **Always use partitioned tables** for time-series data. Partition expiration is more efficient than DELETE queries because it drops entire partitions rather than scanning and deleting individual rows.

2. **Separate datasets by retention requirement**. Put 30-day data in one dataset, 1-year data in another, and permanent data in a third. Set default expirations at the dataset level.

3. **Test retention before production**. Create a test dataset, load sample data with various dates, set expiration, and verify that the right data gets deleted.

4. **Log all deletion operations**. BigQuery audit logs capture DELETE statements and partition drops. Export these to a separate long-retention dataset for compliance evidence.

5. **Use labels for retention tracking**. Label tables and datasets with their retention period so it is easy to audit.

```bash
# Label tables with their retention policy
bq update --set_label=retention_days:90 my-project:analytics.user_events
bq update --set_label=retention_days:365 my-project:analytics.transaction_log
bq update --set_label=retention_days:permanent my-project:analytics.aggregated_metrics
```

Data retention in BigQuery does not require complex external tooling. Between partition expiration, table expiration, and scheduled queries, you can implement any retention policy your compliance team requires. The key is starting with clear retention requirements and mapping each data type to the right mechanism.
