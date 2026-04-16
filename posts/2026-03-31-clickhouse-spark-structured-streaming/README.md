# How to Use ClickHouse with Apache Spark Structured Streaming

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Apache Spark, Streaming, Data Engineering, Analytics

Description: Learn how to write Apache Spark Structured Streaming jobs that sink data into ClickHouse using the ClickHouse Spark connector and JDBC foreachBatch patterns.

---

> Spark Structured Streaming provides a DataFrame-based API over continuous data, and ClickHouse serves as the high-speed analytical store for query results.

Apache Spark Structured Streaming treats a live data stream as an unbounded table. You can apply standard DataFrame transformations, windowed aggregations, and joins before writing the results to ClickHouse. This guide covers the connector setup, batch writing patterns, and production deployment considerations.

---

## Project Dependencies

Add the required JARs to your Spark project.

```xml
<!-- pom.xml -->
<dependencies>
    <!-- Spark Structured Streaming -->
    <dependency>
        <groupId>org.apache.spark</groupId>
        <artifactId>spark-sql_2.12</artifactId>
        <version>3.5.0</version>
    </dependency>

    <!-- Spark Kafka source -->
    <dependency>
        <groupId>org.apache.spark</groupId>
        <artifactId>spark-sql-kafka-0-10_2.12</artifactId>
        <version>3.5.0</version>
    </dependency>

    <!-- ClickHouse Spark connector -->
    <dependency>
        <groupId>com.clickhouse.spark</groupId>
        <artifactId>clickhouse-spark-runtime-3.5_2.12</artifactId>
        <version>0.8.0</version>
    </dependency>

    <!-- ClickHouse JDBC driver -->
    <dependency>
        <groupId>com.clickhouse</groupId>
        <artifactId>clickhouse-jdbc</artifactId>
        <version>0.6.3</version>
        <classifier>all</classifier>
    </dependency>
</dependencies>
```

## Creating the ClickHouse Target Table

Create a table that matches the schema of your streaming aggregations.

```sql
CREATE TABLE spark_streaming_events
(
    window_start    DateTime,
    window_end      DateTime,
    event_type      LowCardinality(String),
    total_events    UInt64,
    unique_users    UInt64,
    avg_latency_ms  Float64,
    batch_id        UInt64,
    ingested_at     DateTime DEFAULT now()
)
ENGINE = ReplacingMergeTree(ingested_at)
PARTITION BY toYYYYMM(window_start)
ORDER BY (event_type, window_start);
```

## Reading a Kafka Stream with Spark

Set up a Spark session and define the Kafka source.

```python
from pyspark.sql import SparkSession
from pyspark.sql.functions import (
    col, from_json, window, count, countDistinct,
    avg, lit, current_timestamp
)
from pyspark.sql.types import (
    StructType, StructField, StringType,
    LongType, DoubleType, TimestampType
)

spark = SparkSession.builder \
    .appName("ClickHouseStreamingSink") \
    .config("spark.jars.packages",
            "com.clickhouse.spark:clickhouse-spark-runtime-3.5_2.12:0.8.0,"
            "org.apache.spark:spark-sql-kafka-0-10_2.12:3.5.0") \
    .config("spark.clickhouse.write.batchSize", "10000") \
    .config("spark.clickhouse.write.maxRetry", "3") \
    .getOrCreate()

spark.sparkContext.setLogLevel("WARN")

# Define the event schema
event_schema = StructType([
    StructField("event_id",    StringType(),    True),
    StructField("user_id",     LongType(),      True),
    StructField("event_type",  StringType(),    True),
    StructField("page",        StringType(),    True),
    StructField("latency_ms",  DoubleType(),    True),
    StructField("ts",          TimestampType(), True)
])

# Read from Kafka
raw_stream = spark.readStream \
    .format("kafka") \
    .option("kafka.bootstrap.servers", "localhost:9092") \
    .option("subscribe", "user_events") \
    .option("startingOffsets", "latest") \
    .option("maxOffsetsPerTrigger", 100000) \
    .load()
```

## Parsing and Transforming the Stream

Parse JSON payloads and apply windowed aggregations.

```python
# Parse JSON payload
parsed = raw_stream.select(
    from_json(
        col("value").cast("string"),
        event_schema
    ).alias("data"),
    col("offset").alias("kafka_offset")
).select("data.*", "kafka_offset")

# Filter out null records
clean = parsed.filter(
    col("event_id").isNotNull() &
    col("user_id").isNotNull() &
    col("ts").isNotNull()
)

# Apply a 1-minute tumbling window aggregation
aggregated = clean \
    .withWatermark("ts", "10 seconds") \
    .groupBy(
        window(col("ts"), "1 minute"),
        col("event_type")
    ) \
    .agg(
        count("*").alias("total_events"),
        countDistinct("user_id").alias("unique_users"),
        avg("latency_ms").alias("avg_latency_ms")
    ) \
    .select(
        col("window.start").alias("window_start"),
        col("window.end").alias("window_end"),
        col("event_type"),
        col("total_events"),
        col("unique_users"),
        col("avg_latency_ms")
    )
```

## Writing to ClickHouse with foreachBatch

Use `foreachBatch` to write micro-batches directly to ClickHouse.

```python
def write_to_clickhouse(batch_df, batch_id):
    """Write each micro-batch to ClickHouse."""
    if batch_df.isEmpty():
        return

    # Add batch metadata
    batch_with_id = batch_df.withColumn("batch_id", lit(batch_id))

    batch_with_id.write \
        .format("clickhouse") \
        .mode("append") \
        .option("host", "localhost") \
        .option("http_port", "8123") \
        .option("database", "default") \
        .option("user", "default") \
        .option("password", "password") \
        .save("spark_streaming_events")

    print(f"Batch {batch_id}: wrote {batch_df.count()} rows")


# Start the streaming query
query = aggregated.writeStream \
    .foreachBatch(write_to_clickhouse) \
    .outputMode("update") \
    .option("checkpointLocation", "/tmp/spark-checkpoints/ch-sink") \
    .trigger(processingTime="30 seconds") \
    .start()

query.awaitTermination()
```

## Using JDBC foreachBatch as an Alternative

If the native connector is not available, use JDBC directly.

```python
CLICKHOUSE_JDBC_URL = "jdbc:ch://localhost:8123/default"
CLICKHOUSE_DRIVER   = "com.clickhouse.jdbc.ClickHouseDriver"

def write_via_jdbc(batch_df, batch_id):
    """Write a micro-batch to ClickHouse using JDBC."""
    if batch_df.isEmpty():
        return

    batch_df.withColumn("batch_id", lit(batch_id)) \
        .write \
        .format("jdbc") \
        .option("url", CLICKHOUSE_JDBC_URL) \
        .option("dbtable", "spark_streaming_events") \
        .option("driver", CLICKHOUSE_DRIVER) \
        .option("user", "default") \
        .option("password", "password") \
        .option("batchsize", "10000") \
        .mode("append") \
        .save()
```

## Handling Late Data and Watermarks

Tune watermarking to balance completeness against latency.

```python
# Use a 30-second watermark for slightly late data
aggregated_late_tolerant = clean \
    .withWatermark("ts", "30 seconds") \
    .groupBy(
        window(col("ts"), "1 minute", "30 seconds"),  # sliding window
        col("event_type")
    ) \
    .agg(
        count("*").alias("total_events"),
        countDistinct("user_id").alias("unique_users"),
        avg("latency_ms").alias("avg_latency_ms")
    ) \
    .select(
        col("window.start").alias("window_start"),
        col("window.end").alias("window_end"),
        col("event_type"),
        col("total_events"),
        col("unique_users"),
        col("avg_latency_ms")
    )
```

## Submitting the Job to a Spark Cluster

Submit the streaming job with the necessary configuration.

```bash
spark-submit \
  --master spark://spark-master:7077 \
  --deploy-mode cluster \
  --total-executor-cores 8 \
  --executor-memory 4g \
  --driver-memory 2g \
  --packages \
    com.clickhouse.spark:clickhouse-spark-runtime-3.5_2.12:0.8.0,\
    org.apache.spark:spark-sql-kafka-0-10_2.12:3.5.0 \
  --conf spark.sql.streaming.checkpointLocation=/shared/checkpoints \
  clickhouse_streaming_job.py
```

## Querying Real-Time Results in ClickHouse

Verify the streaming data with analytical queries.

```sql
-- Recent 15-minute event summary
SELECT
    window_start,
    event_type,
    total_events,
    unique_users,
    round(avg_latency_ms, 2) AS avg_latency_ms
FROM spark_streaming_events
WHERE window_start >= now() - INTERVAL 15 MINUTE
ORDER BY window_start DESC, total_events DESC;

-- Event type distribution over 24 hours
SELECT
    event_type,
    sum(total_events)  AS total,
    sum(unique_users)  AS uniq_users,
    round(avg(avg_latency_ms), 2) AS avg_latency
FROM spark_streaming_events
WHERE window_start >= now() - INTERVAL 24 HOUR
GROUP BY event_type
ORDER BY total DESC;
```

## Summary

Spark Structured Streaming and ClickHouse pair well for batch-aggregated stream analytics. The `foreachBatch` pattern is the most flexible approach: compute windowed aggregations in Spark, then write each micro-batch to ClickHouse in bulk. Use watermarking to handle late data, configure checkpoint locations for fault recovery, and tune `batchSize` to control write throughput. The ClickHouse Spark connector supports native writes while JDBC provides a portable fallback.
