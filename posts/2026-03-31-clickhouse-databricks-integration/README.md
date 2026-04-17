# How to Use ClickHouse with Databricks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Databricks, Spark, Delta Lake, Data Pipeline

Description: Connect Databricks to ClickHouse to move data between Spark and ClickHouse for combined lakehouse and real-time analytics workloads.

---

## Overview

Databricks is a managed Spark platform built around Delta Lake. ClickHouse complements Databricks by providing fast SQL analytics on high-cardinality event data that Spark is slower at. This guide covers reading from and writing to ClickHouse using the Databricks Spark connector.

## Install the ClickHouse Spark Connector

Add the connector to your Databricks cluster via Maven coordinates:

```text
com.clickhouse.spark:clickhouse-spark-runtime-3.5_2.12:0.8.0
com.clickhouse:clickhouse-jdbc:0.6.0:all
```

Or in your Databricks notebook:

```python
spark.conf.set("spark.jars.packages",
    "com.clickhouse.spark:clickhouse-spark-runtime-3.5_2.12:0.8.0,"
    "com.clickhouse:clickhouse-jdbc:0.6.0:all")
```

## Read from ClickHouse in Spark

```python
df = spark.read \
    .format("clickhouse") \
    .option("host", "clickhouse-host") \
    .option("http_port", "8123") \
    .option("protocol", "http") \
    .option("user", "default") \
    .option("password", "secret") \
    .option("database", "analytics") \
    .option("table", "events") \
    .load()

df.createOrReplaceTempView("events")
spark.sql("SELECT event_type, count(*) FROM events GROUP BY event_type").show()
```

## Write Databricks Data to ClickHouse

First create the target table in ClickHouse:

```sql
CREATE TABLE spark_results (
    segment     LowCardinality(String),
    user_count  UInt64,
    revenue     Float64,
    computed_at DateTime DEFAULT now()
) ENGINE = MergeTree()
ORDER BY (segment, computed_at);
```

Then write from Spark:

```python
result_df.write \
    .format("clickhouse") \
    .option("host", "clickhouse-host") \
    .option("http_port", "8123") \
    .option("protocol", "http") \
    .option("user", "default") \
    .option("password", "secret") \
    .option("database", "analytics") \
    .option("table", "spark_results") \
    .mode("append") \
    .save()
```

## Use Delta Lake as an Intermediate Store

For large transfers, write Delta tables from Databricks, then read them in ClickHouse:

```python
result_df.write \
    .format("delta") \
    .mode("overwrite") \
    .save("s3://my-bucket/delta/segments/")
```

Query from ClickHouse using the DeltaLake engine:

```sql
SELECT *
FROM deltaLake('s3://my-bucket/delta/segments/')
LIMIT 100;
```

## Schedule with Databricks Jobs

Automate the pipeline with a Databricks job that refreshes ClickHouse data nightly:

```python
# In a Databricks notebook cell
from datetime import datetime

df = spark.read.format("delta").load("s3://my-bucket/delta/events/")
df_filtered = df.filter(df.event_date == datetime.today().strftime('%Y-%m-%d'))

df_filtered.write \
    .format("clickhouse") \
    .option("host", "clickhouse-host") \
    .option("http_port", "8123") \
    .option("database", "analytics") \
    .option("table", "events") \
    .mode("append") \
    .save()
```

## Summary

Databricks and ClickHouse work together via the Spark connector for direct read/write, or through Delta Lake on S3 as an intermediate store. Use Databricks for complex ML feature engineering and large Spark jobs, then land results in ClickHouse for real-time dashboard queries.
