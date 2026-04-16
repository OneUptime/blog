# How to Migrate from Apache Cassandra to ClickHouse for Analytics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Apache Cassandra, Migration, Analytics, Wide Column, Time Series

Description: Migrate analytical workloads from Apache Cassandra to ClickHouse to enable ad-hoc SQL analytics, aggregations, and faster reporting on event data.

---

Apache Cassandra is excellent for high-throughput writes and partition-key lookups, but it struggles with ad-hoc analytical queries. Migrating analytical workloads to ClickHouse unlocks full SQL aggregations, GROUP BY queries, and fast scans over large datasets.

## When to Migrate vs. Dual-Write

Consider ClickHouse for:
- Ad-hoc aggregation queries (GROUP BY, window functions)
- Time-series analytics and dashboards
- Full table scans with filtering

Keep Cassandra for:
- High-throughput writes at scale
- Key-based lookups with low latency
- Multi-region replication

A common pattern is to dual-write to both: Cassandra for operational lookups, ClickHouse for analytics.

## Step 1 - Export Data from Cassandra

Use `dsbulk` (DataStax Bulk Loader) or `COPY TO`:

```bash
cqlsh -e "COPY analytics.events (event_id, user_id, event_type, created_at) \
  TO '/tmp/events.csv' WITH DELIMITER=',' AND HEADER=TRUE;"
```

For large tables, use Spark with the Cassandra connector:

```python
from pyspark.sql import SparkSession

spark = SparkSession.builder \
    .appName("cassandra-export") \
    .config("spark.cassandra.connection.host", "cassandra-host") \
    .getOrCreate()

df = spark.read \
    .format("org.apache.spark.sql.cassandra") \
    .options(table="events", keyspace="analytics") \
    .load()

df.write.parquet("s3://bucket/cassandra-export/events/")
```

## Step 2 - Create the ClickHouse Table

Map Cassandra's CQL schema:

```sql
-- Cassandra CQL
CREATE TABLE analytics.events (
    event_id    UUID,
    user_id     TEXT,
    event_type  TEXT,
    payload     TEXT,
    created_at  TIMESTAMP,
    PRIMARY KEY ((user_id), created_at)
) WITH CLUSTERING ORDER BY (created_at DESC);
```

ClickHouse equivalent:

```sql
CREATE TABLE analytics.events
(
    event_id    UUID,
    user_id     String,
    event_type  LowCardinality(String),
    payload     String,
    created_at  DateTime
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(created_at)
ORDER BY (created_at, user_id, event_id);
```

## Step 3 - Load the Exported Data

```sql
INSERT INTO analytics.events
SELECT *
FROM s3('s3://bucket/cassandra-export/events/*.parquet', 'KEY', 'SECRET', 'Parquet');
```

## Step 4 - Run Analytical Queries

Queries that are impossible or slow in Cassandra are fast in ClickHouse:

```sql
-- Event counts by type over time (not possible in Cassandra without ALLOW FILTERING)
SELECT
    toStartOfDay(created_at) AS day,
    event_type,
    count() AS events,
    uniq(user_id) AS unique_users
FROM analytics.events
WHERE created_at >= today() - 30
GROUP BY day, event_type
ORDER BY day, events DESC;
```

```sql
-- Funnel analysis
SELECT
    countIf(event_type = 'signup') AS signups,
    countIf(event_type = 'purchase') AS purchases,
    purchases / signups AS conversion_rate
FROM analytics.events
WHERE created_at >= today() - 7;
```

## Step 5 - Set Up Ongoing Sync

For continuous replication from Cassandra to ClickHouse, use Debezium with Kafka:

```bash
# Kafka Connect Cassandra source connector
# Routes CDC events to a Kafka topic
# ClickHouse Kafka Engine consumes from that topic
```

## Summary

Migrating analytical workloads from Cassandra to ClickHouse unlocks the full power of SQL analytics. You gain GROUP BY queries, window functions, approximate aggregations, and fast scans - all with familiar SQL syntax. Cassandra continues serving operational workloads while ClickHouse handles reporting and dashboards.
