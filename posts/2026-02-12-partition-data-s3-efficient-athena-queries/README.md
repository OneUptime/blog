# How to Partition Data in S3 for Efficient Athena Queries

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, S3, Athena, Data Lake, Performance

Description: Learn how to partition your S3 data properly to dramatically reduce Athena query costs and execution time using Hive-style partitioning and partition projection.

---

Every time you run an Athena query, it scans data stored in S3. The more data it scans, the more you pay and the longer you wait. Partitioning is the single most effective way to reduce both. A well-partitioned table can turn a query that scans 500 GB into one that scans 5 GB - reducing cost and time by 100x.

The concept is simple: organize your S3 data into a folder structure that Athena can use to skip irrelevant data. Instead of scanning every file in the table, Athena only reads files in partitions that match your query's WHERE clause.

## Hive-Style Partitioning

The standard approach is Hive-style partitioning, where the S3 path includes the partition key and value:

```
s3://my-data-lake/events/
    year=2026/
        month=01/
            day=15/
                data-file-001.parquet
                data-file-002.parquet
            day=16/
                data-file-003.parquet
        month=02/
            day=01/
                data-file-004.parquet
```

The `year=2026`, `month=01`, `day=15` folder naming convention is what makes it Hive-style. Athena recognizes this pattern and uses it to prune partitions.

## Creating a Partitioned Table

Here's how to create a partitioned table in Athena:

```sql
-- Create a partitioned table over S3 data
-- The partition columns (year, month, day) come from the folder structure
CREATE EXTERNAL TABLE events (
    event_id STRING,
    user_id STRING,
    event_type STRING,
    event_data STRING,
    timestamp TIMESTAMP,
    source_ip STRING
)
PARTITIONED BY (year STRING, month STRING, day STRING)
STORED AS PARQUET
LOCATION 's3://my-data-lake/events/'
TBLPROPERTIES ('parquet.compression'='SNAPPY');
```

After creating the table, you need to tell Athena about existing partitions. There are three ways to do this.

### Option 1: MSCK REPAIR TABLE

The simplest approach for initial setup:

```sql
-- Automatically discover all existing partitions
-- Good for initial setup but slow for tables with many partitions
MSCK REPAIR TABLE events;
```

This scans the S3 path and adds all partitions it finds. It works fine for tables with a few hundred partitions but gets very slow with thousands.

### Option 2: ALTER TABLE ADD PARTITION

For adding specific partitions:

```sql
-- Add partitions manually for finer control
ALTER TABLE events ADD IF NOT EXISTS
    PARTITION (year='2026', month='02', day='01')
    LOCATION 's3://my-data-lake/events/year=2026/month=02/day=01/'
    PARTITION (year='2026', month='02', day='02')
    LOCATION 's3://my-data-lake/events/year=2026/month=02/day=02/';
```

### Option 3: Partition Projection (Recommended)

This is the best option for most cases. Partition projection tells Athena to calculate partition locations mathematically instead of looking them up in the Glue catalog. No need to add partitions manually - Athena figures them out on its own.

```sql
-- Create a table with partition projection
-- Athena calculates partitions automatically - no MSCK REPAIR needed
CREATE EXTERNAL TABLE events_projected (
    event_id STRING,
    user_id STRING,
    event_type STRING,
    event_data STRING,
    timestamp TIMESTAMP,
    source_ip STRING
)
PARTITIONED BY (year STRING, month STRING, day STRING)
STORED AS PARQUET
LOCATION 's3://my-data-lake/events/'
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
    'storage.location.template' = 's3://my-data-lake/events/year=${year}/month=${month}/day=${day}/'
);
```

With partition projection, when you query `WHERE year='2026' AND month='02' AND day='12'`, Athena directly constructs the S3 path without consulting the Glue catalog. This makes the query start faster and eliminates partition management overhead.

## Date-Based Partition Projection

For date-type partitions, you can use the date projection type which is more flexible:

```sql
-- Use date-type partition projection for a single date column
CREATE EXTERNAL TABLE events_by_date (
    event_id STRING,
    user_id STRING,
    event_type STRING,
    event_data STRING,
    timestamp TIMESTAMP
)
PARTITIONED BY (dt STRING)
STORED AS PARQUET
LOCATION 's3://my-data-lake/events-by-date/'
TBLPROPERTIES (
    'projection.enabled' = 'true',
    'projection.dt.type' = 'date',
    'projection.dt.format' = 'yyyy-MM-dd',
    'projection.dt.range' = '2020-01-01,NOW',
    'projection.dt.interval' = '1',
    'projection.dt.interval.unit' = 'DAYS',
    'storage.location.template' = 's3://my-data-lake/events-by-date/dt=${dt}/'
);
```

The `NOW` keyword in the range means the projection automatically includes today's date. No need to update the range over time.

## Multi-Dimension Partitioning

Sometimes you want to partition by more than just date. For example, region and date:

```sql
-- Partition by region and date for both geographic and temporal filtering
CREATE EXTERNAL TABLE regional_events (
    event_id STRING,
    user_id STRING,
    event_type STRING,
    event_data STRING,
    timestamp TIMESTAMP
)
PARTITIONED BY (region STRING, dt STRING)
STORED AS PARQUET
LOCATION 's3://my-data-lake/regional-events/'
TBLPROPERTIES (
    'projection.enabled' = 'true',
    'projection.region.type' = 'enum',
    'projection.region.values' = 'us-east-1,us-west-2,eu-west-1,ap-southeast-1',
    'projection.dt.type' = 'date',
    'projection.dt.format' = 'yyyy-MM-dd',
    'projection.dt.range' = '2020-01-01,NOW',
    'projection.dt.interval' = '1',
    'projection.dt.interval.unit' = 'DAYS',
    'storage.location.template' = 's3://my-data-lake/regional-events/region=${region}/dt=${dt}/'
);
```

## Writing Partitioned Data

If you're producing data from a Glue job or Spark application, make sure to write it in the right structure:

```python
# Writing partitioned data from a Glue ETL job
from awsglue.context import GlueContext
from pyspark.context import SparkContext
from pyspark.sql import functions as F

sc = SparkContext()
glueContext = GlueContext(sc)

# Read source data
df = glueContext.create_dynamic_frame.from_catalog(
    database="raw_db",
    table_name="events"
).toDF()

# Add partition columns from the timestamp
partitioned_df = df.withColumn("year", F.year("timestamp").cast("string")) \
                   .withColumn("month", F.format_string("%02d", F.month("timestamp"))) \
                   .withColumn("day", F.format_string("%02d", F.dayofmonth("timestamp")))

# Write with partitioning - this creates the Hive-style folder structure
partitioned_df.write \
    .mode("append") \
    .partitionBy("year", "month", "day") \
    .parquet("s3://my-data-lake/events/")
```

## Choosing the Right Partition Granularity

This is where people often go wrong. Too many partitions (hourly for a table with low volume) creates tiny files that slow queries. Too few partitions (yearly for a high-volume table) doesn't help with pruning.

Here's a rule of thumb:

| Data Volume per Day | Recommended Granularity | Why |
|---------------------|------------------------|-----|
| Under 100 MB | Monthly | Small files are expensive to open |
| 100 MB - 1 GB | Weekly | Good balance of file size and pruning |
| 1 GB - 10 GB | Daily | Most common choice |
| Over 10 GB | Daily + secondary partition | Add region or source as a second partition |

Each partition should ideally contain files that are 128 MB to 1 GB each. If your daily partition only has a 5 MB file, consider using a coarser partition or compacting files.

## Compacting Small Files

If you end up with many small files in a partition (common with streaming ingestion), compact them:

```sql
-- Use CTAS to compact small files into larger ones
-- This creates a new optimized table from the source
CREATE TABLE events_compacted
WITH (
    external_location = 's3://my-data-lake/events-compacted/',
    format = 'PARQUET',
    parquet_compression = 'SNAPPY',
    partitioned_by = ARRAY['year', 'month', 'day'],
    bucketed_by = ARRAY['user_id'],
    bucket_count = 10
) AS
SELECT
    event_id, user_id, event_type, event_data, timestamp,
    year, month, day
FROM events
WHERE year = '2026' AND month = '02';
```

## Verifying Partition Pruning

Always check that your queries are actually using partition pruning:

```sql
-- Use EXPLAIN to verify partition pruning is happening
EXPLAIN
SELECT COUNT(*) FROM events
WHERE year = '2026' AND month = '02' AND day = '12';
```

Look for `partition_filter` in the output. If it's there, Athena is pruning partitions correctly. Also check the query results in the Athena console - it shows "Data scanned" for each query. Compare with and without WHERE clauses on partition columns to see the difference.

Proper partitioning is the foundation of cost-effective Athena queries. For getting even more performance out of your queries, look into [converting CSV to Parquet](https://oneuptime.com/blog/post/2026-02-12-convert-csv-to-parquet-aws/view) and [using CTAS for optimized tables](https://oneuptime.com/blog/post/2026-02-12-athena-ctas-creating-optimized-tables/view).
