# How to Set Up a Lakehouse Architecture with ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Lakehouse, Data Lake, Delta Lake, S3, Architecture, Data Tiering

Description: Build a lakehouse architecture using ClickHouse as the query engine, combining S3-based open table formats with ClickHouse's analytical performance.

---

The lakehouse pattern combines the scalable storage of a data lake with the performance and management of a data warehouse. ClickHouse fits naturally into this architecture as the high-performance query and serving layer.

## Lakehouse Architecture Overview

```text
Data Sources
    |
    v
Raw Storage (S3 + Parquet / Delta Lake / Iceberg)
    |
    v
ClickHouse (Query Engine + Hot Storage)
    |
    v
Analytics / BI Tools (Grafana, Metabase, Superset)
```

## Ingest Layer: Write Raw Data to S3

Use your existing pipelines to write raw data to S3 in Parquet or Delta Lake format:

```python
# Example: Spark writing to Delta Lake
df.write.format("delta") \
    .mode("append") \
    .partitionBy("year", "month") \
    .save("s3://my-lake/raw/events/")
```

## Bronze Layer: Register External Tables in ClickHouse

Create external table definitions pointing at the raw lake data:

```sql
CREATE TABLE bronze_events
ENGINE = DeltaLake('s3://my-lake/raw/events/', 'ACCESS_KEY', 'SECRET_KEY');
```

## Silver Layer: Transform and Load into ClickHouse

Create a curated silver table with cleaned and enriched data:

```sql
CREATE TABLE silver_events (
    event_time DateTime,
    event_date Date DEFAULT toDate(event_time),
    event_type LowCardinality(String),
    user_id UInt32,
    country LowCardinality(String),
    revenue Decimal(18, 4)
) ENGINE = MergeTree()
PARTITION BY event_date
ORDER BY (event_type, event_time, user_id)
SETTINGS storage_policy = 'hot_cold';
```

Load from bronze:

```sql
INSERT INTO silver_events (event_time, event_type, user_id, country, revenue)
SELECT
    toDateTime(event_time) AS event_time,
    lower(event_type) AS event_type,
    user_id,
    upper(country) AS country,
    revenue
FROM bronze_events
WHERE event_time >= yesterday();
```

## Gold Layer: Pre-Aggregated Analytics Tables

Create pre-aggregated gold tables for dashboard queries:

```sql
CREATE TABLE gold_daily_revenue (
    event_date Date,
    event_type LowCardinality(String),
    country LowCardinality(String),
    total_revenue Decimal(18, 4),
    total_events UInt64,
    unique_users AggregateFunction(uniq, UInt32)
) ENGINE = AggregatingMergeTree()
ORDER BY (event_date, event_type, country);

-- Refresh gold layer daily
INSERT INTO gold_daily_revenue
SELECT
    event_date,
    event_type,
    country,
    sum(revenue) AS total_revenue,
    count() AS total_events,
    uniqState(user_id) AS unique_users
FROM silver_events
WHERE event_date = yesterday()
GROUP BY event_date, event_type, country;
```

Query the gold table with `uniqMerge` to combine partial states:

```sql
SELECT
    event_date,
    event_type,
    country,
    sum(total_revenue) AS total_revenue,
    sum(total_events) AS total_events,
    uniqMerge(unique_users) AS unique_users
FROM gold_daily_revenue
GROUP BY event_date, event_type, country;
```

## Storage Tiering Policy

Configure automatic data migration from local SSD to S3:

```xml
<storage_configuration>
    <disks>
        <hot><path>/nvme/clickhouse/</path></hot>
        <cold>
            <type>s3</type>
            <endpoint>https://s3.amazonaws.com/my-lake/clickhouse-cold/</endpoint>
        </cold>
    </disks>
    <policies>
        <hot_cold>
            <volumes>
                <hot><disk>hot</disk><max_data_part_size_bytes>10737418240</max_data_part_size_bytes></hot>
                <cold><disk>cold</disk></cold>
            </volumes>
        </hot_cold>
    </policies>
</storage_configuration>
```

## Summary

A ClickHouse lakehouse architecture uses S3 as the durable storage layer for raw data, ClickHouse as the query engine for bronze/silver/gold layers, and tiered storage policies to automatically move cold data back to S3. This approach provides data warehouse performance with data lake economics, all within a single ClickHouse deployment.
