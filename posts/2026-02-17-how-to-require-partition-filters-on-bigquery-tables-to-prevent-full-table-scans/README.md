# How to Require Partition Filters on BigQuery Tables to Prevent Full Table Scans

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, BigQuery, Partitioning, Cost Control, Query Optimization

Description: Learn how to enforce partition filter requirements on BigQuery tables so that every query must include a partition filter, preventing expensive full table scans.

---

You spent time setting up partitioning on your BigQuery tables to save money and speed up queries. But then someone on the team runs a query without a WHERE clause on the partition column, and suddenly you are scanning the entire table. All that optimization work, bypassed by a single careless query.

BigQuery has a built-in solution for this: you can require partition filters on a table. When enabled, any query that does not include a filter on the partition column will be rejected before it runs. No accidental full table scans, no surprise cost spikes.

## Why Require Partition Filters?

In a team environment, not everyone writing queries knows (or remembers) which tables are partitioned and how. A single SELECT * without a date filter on a multi-terabyte partitioned table can cost hundreds of dollars. Requiring partition filters acts as a guardrail.

I have seen this save teams thousands of dollars per month. It is one of those settings that takes 30 seconds to enable and prevents a whole category of cost accidents.

## Enabling Partition Filter Requirements

You can require partition filters when creating a table or on an existing table.

**When creating a new table:**

```sql
-- Create a partitioned table that requires a partition filter on every query
CREATE TABLE `my_project.my_dataset.events`
(
  event_id STRING,
  user_id INT64,
  event_type STRING,
  event_timestamp TIMESTAMP,
  event_date DATE,
  payload STRING
)
PARTITION BY event_date
OPTIONS (
  require_partition_filter = true
);
```

**On an existing partitioned table:**

```sql
-- Enable partition filter requirement on an existing table
ALTER TABLE `my_project.my_dataset.events`
SET OPTIONS (
  require_partition_filter = true
);
```

That is it. Once enabled, BigQuery rejects any query that does not filter on the partition column.

## What Happens When Someone Forgets the Filter

When a query is submitted without a partition filter, BigQuery returns an error immediately, before any data is scanned.

```sql
-- This query will be rejected because it has no partition filter
SELECT COUNT(*)
FROM `my_project.my_dataset.events`;
-- Error: Cannot query over table 'my_project.my_dataset.events'
-- without a filter over column(s) 'event_date' that can be used
-- for partition elimination
```

The query does not run, no data is scanned, and you are not charged. The error message clearly tells the user which column they need to filter on.

## Valid Partition Filters

Not every filter on the partition column counts as a valid partition filter. BigQuery needs to be able to use the filter for partition pruning at query planning time.

These work:

```sql
-- Direct equality filter - works
SELECT * FROM `my_project.my_dataset.events`
WHERE event_date = '2026-02-01';

-- Range filter - works
SELECT * FROM `my_project.my_dataset.events`
WHERE event_date BETWEEN '2026-02-01' AND '2026-02-28';

-- Comparison operators - works
SELECT * FROM `my_project.my_dataset.events`
WHERE event_date >= '2026-01-01';

-- IN clause - works
SELECT * FROM `my_project.my_dataset.events`
WHERE event_date IN ('2026-02-01', '2026-02-02', '2026-02-03');
```

These do not work as partition filters:

```sql
-- Function applied to the partition column - does NOT work as a filter
SELECT * FROM `my_project.my_dataset.events`
WHERE EXTRACT(YEAR FROM event_date) = 2026;
-- Error: partition filter required

-- Filter on a non-partition column only - does NOT work
SELECT * FROM `my_project.my_dataset.events`
WHERE event_type = 'click';
-- Error: partition filter required

-- Subquery-based filter - may or may not work depending on complexity
SELECT * FROM `my_project.my_dataset.events`
WHERE event_date IN (SELECT MAX(event_date) FROM `my_project.my_dataset.events`);
-- This typically does NOT satisfy the partition filter requirement
```

## Working with Ingestion-Time Partitioned Tables

If your table uses ingestion-time partitioning (the `_PARTITIONTIME` pseudo-column), the filter requirement applies to that pseudo-column.

```sql
-- Create an ingestion-time partitioned table with required filters
CREATE TABLE `my_project.my_dataset.raw_events`
(
  data STRING
)
PARTITION BY DATE(_PARTITIONTIME)
OPTIONS (
  require_partition_filter = true
);

-- Query must filter on _PARTITIONTIME or _PARTITIONDATE
SELECT *
FROM `my_project.my_dataset.raw_events`
WHERE _PARTITIONDATE = '2026-02-17';
```

## Using bq Command Line

You can also manage the partition filter requirement using the `bq` command-line tool.

```bash
# Enable partition filter requirement via bq CLI
bq update \
  --require_partition_filter \
  my_project:my_dataset.events

# Disable it if needed
bq update \
  --norequire_partition_filter \
  my_project:my_dataset.events
```

And using the `bq show` command to check the current setting.

```bash
# Check if partition filter is required
bq show --format=prettyjson my_project:my_dataset.events | grep requirePartitionFilter
```

## Setting It Up with Terraform

If you manage your BigQuery infrastructure with Terraform, you can set the partition filter requirement in your table resource.

```hcl
# Terraform configuration for a BigQuery table with required partition filter
resource "google_bigquery_table" "events" {
  dataset_id = google_bigquery_dataset.main.dataset_id
  table_id   = "events"

  # Enable partition filter requirement
  require_partition_filter = true

  time_partitioning {
    type  = "DAY"
    field = "event_date"
  }

  schema = jsonencode([
    {
      name = "event_id"
      type = "STRING"
      mode = "REQUIRED"
    },
    {
      name = "event_date"
      type = "DATE"
      mode = "REQUIRED"
    },
    {
      name = "event_type"
      type = "STRING"
      mode = "NULLABLE"
    }
  ])
}
```

## Handling Views and Downstream Queries

When you have views built on top of partitioned tables, the partition filter requirement still applies. The view's underlying query must include a partition filter, or the view itself must accept a filter that gets pushed down.

```sql
-- This view definition works because it includes a partition filter
CREATE VIEW `my_project.my_dataset.recent_events` AS
SELECT *
FROM `my_project.my_dataset.events`
WHERE event_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY);

-- This view would fail because it does not include a partition filter
-- Users querying it would get an error
CREATE VIEW `my_project.my_dataset.all_events` AS
SELECT *
FROM `my_project.my_dataset.events`;
-- Querying this view without adding a WHERE clause on event_date will fail
```

For views that need to be flexible, make sure users know they must add a partition filter when querying the view.

## Bulk Enabling Across Multiple Tables

If you have many partitioned tables and want to enable this setting across all of them, you can script it.

```sql
-- Find all partitioned tables that do not require partition filters
SELECT
  table_catalog,
  table_schema,
  table_name,
  CONCAT(
    'ALTER TABLE `', table_catalog, '.', table_schema, '.', table_name,
    '` SET OPTIONS (require_partition_filter = true);'
  ) AS alter_statement
FROM `my_project.my_dataset.INFORMATION_SCHEMA.TABLES`
WHERE table_type = 'BASE TABLE'
  AND CONCAT(table_catalog, '.', table_schema, '.', table_name) IN (
    SELECT DISTINCT table_catalog || '.' || table_schema || '.' || table_name
    FROM `my_project.my_dataset.INFORMATION_SCHEMA.PARTITIONS`
  );
```

Run the generated ALTER statements to enable the requirement on all partitioned tables.

## When Not to Require Partition Filters

There are some cases where you might not want this requirement:

- **Small tables**: If your table is under 1 GB, full scans are cheap. The filter requirement adds friction without meaningful savings.
- **Exploratory analysis**: Data scientists doing ad-hoc exploration might find the requirement annoying. Consider having separate datasets with different policies for production vs. exploration.
- **ETL jobs that need full scans**: Some data processing jobs legitimately need to scan the entire table. You might need to disable the requirement temporarily or structure your ETL differently.

## Wrapping Up

Requiring partition filters is one of the simplest and most effective cost controls in BigQuery. It takes one line of SQL to enable and immediately prevents accidental full table scans. Every partitioned table that is queried by more than one person should have this setting turned on. The small inconvenience of always including a date filter is nothing compared to catching a query that would have scanned 10 TB of data.

For teams that want broader cost monitoring and alerting on their GCP resources, [OneUptime](https://oneuptime.com) can help you set up alerts for unusual query patterns and cost spikes before they hit your bill.
