# How to Optimize Athena Query Performance with Partitioning

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Amazon Athena, Performance, Partitioning, S3

Description: Learn how to partition your S3 data for Amazon Athena to dramatically reduce query times and costs by scanning only the data you actually need.

---

Every Athena query has a cost, and that cost is directly tied to how much data it scans. Run a query against a 1 TB dataset when you only need last week's data? You just paid to scan the whole thing. Partitioning fixes this by organizing your data so Athena can skip irrelevant files entirely.

A well-partitioned dataset can reduce both query time and cost by 90% or more. Let's look at how to set it up.

## What Is Partitioning?

Partitioning organizes data into a directory structure based on column values. Instead of dumping all your files into a single S3 prefix, you arrange them into folders that represent specific values.

Without partitioning:
```
s3://my-bucket/events/file001.parquet
s3://my-bucket/events/file002.parquet
s3://my-bucket/events/file003.parquet
... (thousands of files spanning years of data)
```

With partitioning by date:
```
s3://my-bucket/events/year=2025/month=01/day=01/file001.parquet
s3://my-bucket/events/year=2025/month=01/day=02/file002.parquet
s3://my-bucket/events/year=2025/month=02/day=01/file003.parquet
```

When you query `WHERE year='2025' AND month='01'`, Athena reads only the files under that path. Everything else is skipped.

## Hive-Style Partitioning

Athena supports Hive-style partitioning, where the directory names include the column name and value separated by an equals sign. This is the `key=value` format you see above.

Create a partitioned table:

```sql
-- Create a table with Hive-style partitions on year, month, and day
CREATE EXTERNAL TABLE analytics.events_partitioned (
    event_id STRING,
    event_type STRING,
    user_id STRING,
    event_data STRING
)
PARTITIONED BY (year STRING, month STRING, day STRING)
STORED AS PARQUET
LOCATION 's3://my-bucket/events/';
```

The partition columns don't appear in the `STORED AS` part of the definition. They're inferred from the directory structure.

## Adding Partitions

After creating the table, you need to register the partitions. There are several ways to do this.

### Manual Partition Addition

Add partitions one at a time:

```sql
-- Manually add a partition for a specific date
ALTER TABLE analytics.events_partitioned
ADD PARTITION (year='2025', month='01', day='15')
LOCATION 's3://my-bucket/events/year=2025/month=01/day=15/';
```

This works but doesn't scale well when you have hundreds of partitions.

### MSCK REPAIR TABLE

Scan S3 and automatically add all partitions that match the Hive-style naming convention:

```sql
-- Automatically discover and add all partitions
MSCK REPAIR TABLE analytics.events_partitioned;
```

This is convenient but can be slow on large datasets with many partitions. It also only works with Hive-style (`key=value`) directory names.

### Glue Crawler

For automated partition management, use an AWS Glue crawler. It periodically scans your S3 location and updates the Glue Data Catalog with new partitions. We cover this in our guide on [creating AWS Glue crawlers](https://oneuptime.com/blog/post/2026-02-12-create-aws-glue-crawlers-for-data-cataloging/view).

### Partition Projection

This is the best approach for most cases. Instead of maintaining a list of partitions in the catalog, you tell Athena how to calculate partition locations at query time:

```sql
-- Create a table with partition projection (no need to add partitions manually)
CREATE EXTERNAL TABLE analytics.events_projected (
    event_id STRING,
    event_type STRING,
    user_id STRING,
    event_data STRING
)
PARTITIONED BY (year STRING, month STRING, day STRING)
STORED AS PARQUET
LOCATION 's3://my-bucket/events/'
TBLPROPERTIES (
    'projection.enabled' = 'true',
    'projection.year.type' = 'integer',
    'projection.year.range' = '2020,2030',
    'projection.month.type' = 'integer',
    'projection.month.range' = '1,12',
    'projection.month.digits' = '2',
    'projection.day.type' = 'integer',
    'projection.day.range' = '1,31',
    'projection.day.digits' = '2',
    'storage.location.template' = 's3://my-bucket/events/year=${year}/month=${month}/day=${day}/'
);
```

With partition projection, Athena never queries the Glue Data Catalog for partition information. It calculates the S3 paths dynamically. This is faster and eliminates the need to manage partitions.

## Choosing Partition Keys

The right partition key depends on how your data is queried. Ask yourself: what columns appear in your WHERE clauses most often?

Common partition strategies:

| Data Type | Partition By | Why |
|-----------|-------------|-----|
| Time-series events | year/month/day | Most queries filter by date range |
| Multi-tenant data | tenant_id, date | Queries always filter by tenant |
| Regional data | region, date | Queries usually target specific regions |
| Log files | service_name, date | Teams query their own service logs |

### Don't Over-Partition

There's a sweet spot. Too many partitions create problems:

- Each partition should contain at least 128 MB of data
- Too many small files hurt performance (the "small files problem")
- AWS Glue has a limit of how many partitions it can manage efficiently

If your daily partitions only have a few kilobytes of data, partition by month or even year instead.

### Don't Under-Partition

On the flip side, if your partitions are too large (hundreds of GB each), queries still scan too much data. Find the granularity that matches your query patterns.

## Querying Partitioned Data

Always include partition columns in your WHERE clause:

```sql
-- Good: Filters on partition columns, scans only January 2025 data
SELECT event_type, COUNT(*) as event_count
FROM analytics.events_partitioned
WHERE year = '2025'
    AND month = '01'
GROUP BY event_type;
```

```sql
-- Bad: No partition filter, scans ALL data across all partitions
SELECT event_type, COUNT(*) as event_count
FROM analytics.events_partitioned
GROUP BY event_type;
```

The first query might scan 50 GB. The second could scan 5 TB. Same table, same aggregation, massively different cost.

## Date-Based Partition Projection Example

For time-series data with a single date column, you can use a date-type projection:

```sql
-- Partition projection using a date type for simpler date-based partitioning
CREATE EXTERNAL TABLE analytics.logs (
    log_level STRING,
    message STRING,
    service STRING,
    request_id STRING
)
PARTITIONED BY (dt STRING)
STORED AS PARQUET
LOCATION 's3://my-bucket/logs/'
TBLPROPERTIES (
    'projection.enabled' = 'true',
    'projection.dt.type' = 'date',
    'projection.dt.range' = '2020-01-01,NOW',
    'projection.dt.format' = 'yyyy-MM-dd',
    'projection.dt.interval' = '1',
    'projection.dt.interval.unit' = 'DAYS',
    'storage.location.template' = 's3://my-bucket/logs/dt=${dt}/'
);
```

The `NOW` keyword in the range means the projection automatically covers up to the current date. No need to update the table definition as time passes.

Query it naturally:

```sql
-- Query logs for the last 7 days using the date partition
SELECT log_level, COUNT(*) as count
FROM analytics.logs
WHERE dt >= DATE_FORMAT(DATE_ADD('day', -7, current_date), '%Y-%m-%d')
GROUP BY log_level;
```

## Converting Unpartitioned Data to Partitioned

If you have an existing unpartitioned dataset, use CTAS to create a partitioned version:

```sql
-- Convert unpartitioned data to a partitioned Parquet table
CREATE TABLE analytics.events_partitioned_v2
WITH (
    format = 'PARQUET',
    partitioned_by = ARRAY['year', 'month'],
    external_location = 's3://my-bucket/events-partitioned-v2/'
) AS
SELECT
    event_id,
    event_type,
    user_id,
    event_data,
    CAST(year(event_timestamp) AS VARCHAR) as year,
    LPAD(CAST(month(event_timestamp) AS VARCHAR), 2, '0') as month
FROM analytics.events_raw;
```

This reads your raw data once and writes it out partitioned by year and month in Parquet format. It's a one-time cost that pays for itself quickly through reduced scan costs on every subsequent query.

## Monitoring Partition Effectiveness

Check how much data your queries are scanning:

```python
# Check how much data a query scanned
import boto3

athena = boto3.client('athena', region_name='us-east-1')

execution = athena.get_query_execution(
    QueryExecutionId='your-query-id'
)

stats = execution['QueryExecution']['Statistics']
scanned_bytes = stats['DataScannedInBytes']
scanned_gb = scanned_bytes / (1024 ** 3)
cost = (scanned_bytes / (1024 ** 4)) * 5  # $5 per TB

print(f"Data scanned: {scanned_gb:.2f} GB")
print(f"Estimated cost: ${cost:.4f}")
print(f"Execution time: {stats['TotalExecutionTimeInMillis']}ms")
```

Compare scanned data before and after partitioning. If your partitioned queries aren't scanning significantly less data, either your partition keys don't match your query patterns or you're not filtering on partition columns.

For a deeper look at cost optimization, check out our guide on [reducing Athena query costs](https://oneuptime.com/blog/post/2026-02-12-reduce-athena-query-costs/view).

## Wrapping Up

Partitioning is the single most impactful optimization you can make for Athena. It's free to implement (just organize your data differently), and it reduces costs proportionally to how selective your queries are. Use partition projection when possible to avoid partition management overhead, choose partition keys that match your query patterns, and always filter on partition columns.

Combined with [columnar formats like Parquet](https://oneuptime.com/blog/post/2026-02-12-optimize-athena-queries-with-column-formats-parquet-orc/view), partitioning can make Athena feel fast and cheap even on multi-terabyte datasets.
