# How to Use ClickHouse with Apache Spark

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Apache Spark, Integration, Big Data, ETL

Description: Learn how to integrate ClickHouse with Apache Spark using the ClickHouse Spark connector to read, write, and process large datasets across both systems.

---

## Overview

Apache Spark and ClickHouse complement each other well. ClickHouse excels at fast interactive analytics, while Spark handles complex ETL, machine learning, and distributed transformations. The ClickHouse Spark connector lets you move data between them efficiently.

## Adding Dependencies

### Maven (pom.xml)

```xml
<dependency>
    <groupId>com.clickhouse.spark</groupId>
    <artifactId>clickhouse-spark-runtime-3.4_2.12</artifactId>
    <version>0.8.0</version>
</dependency>
<dependency>
    <groupId>com.clickhouse</groupId>
    <artifactId>clickhouse-jdbc</artifactId>
    <version>0.6.5</version>
    <classifier>all</classifier>
</dependency>
```

### Using spark-submit

```bash
spark-submit \
  --packages com.clickhouse.spark:clickhouse-spark-runtime-3.4_2.12:0.8.0 \
  my_spark_job.py
```

## Configuring the ClickHouse Catalog

```python
from pyspark.sql import SparkSession

spark = SparkSession.builder \
    .appName("ClickHouseIntegration") \
    .config("spark.sql.catalog.clickhouse", "com.clickhouse.spark.ClickHouseCatalog") \
    .config("spark.sql.catalog.clickhouse.host", "localhost") \
    .config("spark.sql.catalog.clickhouse.protocol", "http") \
    .config("spark.sql.catalog.clickhouse.http_port", "8123") \
    .config("spark.sql.catalog.clickhouse.user", "default") \
    .config("spark.sql.catalog.clickhouse.password", "") \
    .config("spark.sql.catalog.clickhouse.database", "default") \
    .getOrCreate()
```

## Reading from ClickHouse

```python
# Read a ClickHouse table into a Spark DataFrame
df = spark.read \
    .format("clickhouse") \
    .option("host", "localhost") \
    .option("http_port", "8123") \
    .option("user", "default") \
    .option("password", "") \
    .option("database", "default") \
    .option("table", "events") \
    .load()

df.printSchema()
df.show(10)
```

## Reading with SQL Push-Down

```python
# Read with a filter pushed down to ClickHouse
# The native connector automatically pushes supported filters
# from the DataFrame API down to ClickHouse.
df = spark.read \
    .format("clickhouse") \
    .option("host", "localhost") \
    .option("database", "default") \
    .option("table", "events") \
    .load() \
    .filter("event_date >= '2026-01-01'")
```

## Using Catalog SQL

```python
# Use catalog SQL to query ClickHouse tables
spark.sql("USE clickhouse.default")

result = spark.sql("""
    SELECT
        toStartOfDay(ts) AS day,
        count() AS events
    FROM events
    WHERE ts >= '2026-01-01'
    GROUP BY day
    ORDER BY day
""")

result.show()
```

## Writing to ClickHouse

```python
# Write a Spark DataFrame to ClickHouse
result_df.write \
    .format("clickhouse") \
    .option("host", "localhost") \
    .option("http_port", "8123") \
    .option("user", "default") \
    .option("password", "") \
    .option("database", "default") \
    .option("table", "aggregated_results") \
    .mode("append") \
    .save()
```

## ETL Example - Enrich and Write Back

```python
from pyspark.sql import functions as F

# Read raw events
events_df = spark.read \
    .format("clickhouse") \
    .option("host", "localhost") \
    .option("database", "default") \
    .option("table", "raw_events") \
    .load()

# Enrich with Spark transformations
enriched_df = events_df \
    .filter(F.col("event_type").isin(["purchase", "refund"])) \
    .withColumn("day", F.to_date(F.col("ts"))) \
    .groupBy("user_id", "day") \
    .agg(
        F.count("*").alias("transaction_count"),
        F.sum("amount").alias("total_amount")
    )

# Write results back to ClickHouse
enriched_df.write \
    .format("clickhouse") \
    .option("host", "localhost") \
    .option("database", "default") \
    .option("table", "user_daily_stats") \
    .mode("append") \
    .save()
```

## Performance Tuning

For parallelized reads of large tables, use the Spark JDBC data source
with the ClickHouse JDBC driver. The JDBC reader supports the standard
`numPartitions`, `partitionColumn`, `lowerBound`, and `upperBound`
options to split a read across multiple Spark tasks.

```python
# Increase parallelism for large reads via the Spark JDBC data source
df = spark.read \
    .format("jdbc") \
    .option("url", "jdbc:clickhouse://localhost:8123/default") \
    .option("driver", "com.clickhouse.jdbc.ClickHouseDriver") \
    .option("dbtable", "large_events") \
    .option("user", "default") \
    .option("password", "") \
    .option("numPartitions", "20") \
    .option("partitionColumn", "user_id") \
    .option("lowerBound", "1") \
    .option("upperBound", "10000000") \
    .load()
```

## Summary

The ClickHouse Spark connector bridges Spark's distributed processing with ClickHouse's fast analytics. Use the catalog integration for SQL-based workflows, direct format reads with filter push-down for large tables, and write-back for storing Spark-computed aggregations. For performance, partition large reads by a numeric column to parallelize data extraction across multiple Spark tasks.
