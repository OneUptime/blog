# How to Build a Telemetry Data Lake with OpenTelemetry, Kafka, and Apache Iceberg for Long-Term Analysis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Kafka, Apache Iceberg, Data Lake

Description: Build a telemetry data lake using OpenTelemetry, Kafka, and Apache Iceberg for cost-effective long-term storage and analysis.

Storing telemetry in a traditional database for long-term analysis gets expensive fast. At millions of spans per second, even ClickHouse storage costs add up when you want to keep data for months or years. Apache Iceberg provides a table format on top of object storage (S3, GCS, MinIO) that gives you the query performance of a data warehouse at the cost of cloud storage. This is how you build a telemetry data lake with it.

## Why Iceberg for Telemetry

Iceberg gives you several things that raw Parquet files on S3 do not:

- **Schema evolution**: Add new attributes to your telemetry without rewriting existing data.
- **Time travel**: Query your telemetry as it existed at any point in time.
- **Partition evolution**: Change how data is partitioned without rewriting.
- **Hidden partitioning**: No need to include partition columns in every query.

## Architecture

```
OTel Collector -> Kafka -> Spark Streaming -> Iceberg Tables (on S3)
                                                   |
                                            Query Engines
                                    (Trino / Spark SQL / DuckDB)
```

## Collector and Kafka Setup

Configure the Collector to export JSON-encoded telemetry to Kafka:

```yaml
# collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

exporters:
  kafka:
    brokers: ["kafka:9092"]
    topic: otel-traces-lake
    encoding: otlp_json
    producer:
      compression: zstd

processors:
  batch:
    send_batch_size: 8192
    timeout: 2s

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [kafka]
```

## Creating the Iceberg Table

Use Spark to create the Iceberg table with a schema suited for telemetry:

```python
# create_iceberg_table.py
from pyspark.sql import SparkSession

spark = SparkSession.builder \
    .appName("CreateTelemetryTable") \
    .config("spark.sql.catalog.lakehouse", "org.apache.iceberg.spark.SparkCatalog") \
    .config("spark.sql.catalog.lakehouse.type", "hadoop") \
    .config("spark.sql.catalog.lakehouse.warehouse", "s3a://telemetry-lake/warehouse") \
    .config("spark.sql.extensions",
            "org.apache.iceberg.spark.extensions.IcebergSparkSessionExtensions") \
    .getOrCreate()

spark.sql("""
CREATE TABLE IF NOT EXISTS lakehouse.telemetry.traces (
    timestamp TIMESTAMP,
    trace_id STRING,
    span_id STRING,
    parent_span_id STRING,
    service_name STRING,
    operation_name STRING,
    span_kind STRING,
    duration_ms DOUBLE,
    status_code INT,
    status_message STRING,
    attributes MAP<STRING, STRING>,
    resource_attributes MAP<STRING, STRING>,
    events ARRAY<STRUCT<
        timestamp: TIMESTAMP,
        name: STRING,
        attributes: MAP<STRING, STRING>
    >>
) USING iceberg
PARTITIONED BY (days(timestamp), service_name)
TBLPROPERTIES (
    'write.format.default' = 'parquet',
    'write.parquet.compression-codec' = 'zstd',
    'write.target-file-size-bytes' = '134217728',
    'write.metadata.delete-after-commit.enabled' = 'true',
    'write.metadata.previous-versions-max' = '100'
)
""")

print("Iceberg table created successfully")
```

## Spark Streaming Job: Kafka to Iceberg

```python
# kafka_to_iceberg.py
from pyspark.sql import SparkSession
from pyspark.sql import functions as F
from pyspark.sql.types import (
    StructType, StructField, StringType,
    LongType, ArrayType, MapType
)

spark = SparkSession.builder \
    .appName("TelemetryLakeIngestion") \
    .config("spark.sql.catalog.lakehouse", "org.apache.iceberg.spark.SparkCatalog") \
    .config("spark.sql.catalog.lakehouse.type", "hadoop") \
    .config("spark.sql.catalog.lakehouse.warehouse", "s3a://telemetry-lake/warehouse") \
    .getOrCreate()

# Read from Kafka
kafka_df = spark.readStream \
    .format("kafka") \
    .option("kafka.bootstrap.servers", "kafka:9092") \
    .option("subscribe", "otel-traces-lake") \
    .option("startingOffsets", "latest") \
    .option("maxOffsetsPerTrigger", 1000000) \
    .load()

# Parse OTLP JSON and flatten the structure
parsed_df = kafka_df \
    .selectExpr("CAST(value AS STRING) as json_str") \
    .select(F.from_json("json_str", otlp_schema).alias("data")) \
    .select(F.explode("data.resourceSpans").alias("rs")) \
    .select(
        F.col("rs.resource").alias("resource"),
        F.explode("rs.scopeSpans").alias("ss")
    ) \
    .select(
        F.col("resource"),
        F.explode("ss.spans").alias("span")
    ) \
    .select(
        # Convert nanosecond timestamp to timestamp type
        (F.col("span.startTimeUnixNano").cast("long") / 1e9)
            .cast("timestamp").alias("timestamp"),
        F.col("span.traceId").alias("trace_id"),
        F.col("span.spanId").alias("span_id"),
        F.col("span.parentSpanId").alias("parent_span_id"),
        # Extract service name from resource attributes
        F.expr("""
            filter(resource.attributes,
                   x -> x.key = 'service.name')[0].value.stringValue
        """).alias("service_name"),
        F.col("span.name").alias("operation_name"),
        # Calculate duration in milliseconds
        ((F.col("span.endTimeUnixNano").cast("long")
          - F.col("span.startTimeUnixNano").cast("long")) / 1e6)
            .alias("duration_ms"),
        F.col("span.status.code").alias("status_code")
    )

# Write to Iceberg table
query = parsed_df.writeStream \
    .format("iceberg") \
    .outputMode("append") \
    .option("path", "lakehouse.telemetry.traces") \
    .option("checkpointLocation", "s3a://telemetry-lake/checkpoints/traces") \
    .trigger(processingTime="30 seconds") \
    .start()

query.awaitTermination()
```

## Querying the Data Lake

Use Trino or Spark SQL to query the telemetry data lake:

```sql
-- Find the slowest services over the last 30 days
SELECT
    service_name,
    operation_name,
    approx_percentile(duration_ms, 0.99) as p99_ms,
    count(*) as span_count
FROM lakehouse.telemetry.traces
WHERE timestamp >= current_timestamp - INTERVAL '30' DAY
GROUP BY service_name, operation_name
ORDER BY p99_ms DESC
LIMIT 20;

-- Time travel: query data as it existed last week
SELECT count(*) as total_spans
FROM lakehouse.telemetry.traces
FOR TIMESTAMP AS OF TIMESTAMP '2026-01-30 00:00:00';
```

## Compaction and Maintenance

Schedule regular compaction to keep query performance optimal:

```sql
-- Compact small files into larger ones
CALL lakehouse.system.rewrite_data_files(
    table => 'telemetry.traces',
    strategy => 'sort',
    sort_order => 'timestamp ASC, service_name ASC'
);

-- Expire old snapshots to reclaim metadata storage
CALL lakehouse.system.expire_snapshots(
    'telemetry.traces', TIMESTAMP '2026-01-01 00:00:00'
);
```

## Wrapping Up

A telemetry data lake built on Apache Iceberg gives you cost-effective long-term storage with the ability to run analytical queries using standard SQL engines. The combination of OpenTelemetry for collection, Kafka for buffering, and Iceberg for storage provides a foundation that scales from terabytes to petabytes without the cost of keeping everything in a hot database.
