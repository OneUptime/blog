# How to Build a Lambda Architecture for Telemetry: Real-Time OTel Stream + Batch Reprocessing from Kafka

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Lambda Architecture, Kafka, Batch Processing

Description: Implement a lambda architecture for telemetry with a real-time OpenTelemetry stream path and a batch reprocessing path from Kafka.

Lambda architecture splits data processing into two paths: a real-time stream for immediate visibility and a batch layer for accurate, complete results. This pattern fits telemetry perfectly. Your real-time path gives engineers instant dashboards, while the batch path recomputes aggregations with complete data and fixes any gaps from the stream.

## Architecture Overview

```
                    +-> Speed Layer (OTel Collector -> Backend) -> Real-time View
Apps -> OTel Collector
                    +-> Batch Layer (Kafka -> S3 -> Spark) -> Batch View

Serving Layer merges both views for queries
```

The speed layer processes data as it arrives with minimal latency. The batch layer periodically reprocesses all data from Kafka for correctness.

## Speed Layer: Direct OTel Pipeline

Configure the Collector to send data directly to your query backend for immediate availability:

```yaml
# speed-layer-collector.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

exporters:
  # Real-time path: directly to the query backend
  otlphttp/realtime:
    endpoint: https://clickhouse-proxy:4318

  # Archive path: to Kafka for batch reprocessing
  kafka:
    brokers:
      - kafka:9092
    topic: otel-archive
    encoding: otlp_proto
    producer:
      compression: zstd
      required_acks: all

processors:
  batch:
    send_batch_size: 4096
    timeout: 1s

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp/realtime, kafka]
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp/realtime, kafka]
    logs:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp/realtime, kafka]
```

The important detail here is the dual export: every piece of telemetry goes to both the real-time backend and Kafka simultaneously.

## Kafka to S3 Archival

Use Kafka Connect to continuously archive topic data to S3 in Parquet format:

```json
{
  "name": "otel-s3-sink",
  "config": {
    "connector.class": "io.confluent.connect.s3.S3SinkConnector",
    "tasks.max": "8",
    "topics": "otel-archive",
    "s3.region": "us-east-1",
    "s3.bucket.name": "telemetry-archive",
    "s3.part.size": "67108864",
    "flush.size": "100000",
    "rotate.interval.ms": "3600000",
    "storage.class": "io.confluent.connect.s3.storage.S3Storage",
    "format.class": "io.confluent.connect.s3.format.parquet.ParquetFormat",
    "partitioner.class": "io.confluent.connect.storage.partitioner.TimeBasedPartitioner",
    "path.format": "'signal_type'=YYYY/'month'=MM/'day'=dd/'hour'=HH",
    "partition.duration.ms": "3600000",
    "locale": "en-US",
    "timezone": "UTC",
    "timestamp.extractor": "RecordField",
    "timestamp.field": "timestamp"
  }
}
```

## Batch Layer: Spark Reprocessing Job

The batch layer reads from S3 and recomputes aggregations with complete data:

```python
# batch_reprocessor.py
from pyspark.sql import SparkSession
from pyspark.sql import functions as F
from pyspark.sql.window import Window
from datetime import datetime, timedelta

spark = SparkSession.builder \
    .appName("TelemetryBatchReprocessor") \
    .config("spark.jars.packages",
            "org.apache.spark:spark-sql-kafka-0-10_2.12:3.5.0") \
    .getOrCreate()

# Read archived telemetry from S3
yesterday = (datetime.utcnow() - timedelta(days=1)).strftime("%Y/%m/%d")
traces_df = spark.read.parquet(
    f"s3a://telemetry-archive/signal_type=traces/month=*/"
    f"day={yesterday.split('/')[2]}/*"
)

# Compute accurate daily aggregations
# These replace the approximate real-time values
service_stats = traces_df \
    .groupBy("service_name", "operation_name") \
    .agg(
        F.count("*").alias("total_spans"),
        F.expr("percentile_approx(duration_ns / 1000000, 0.50)")
            .alias("p50_ms"),
        F.expr("percentile_approx(duration_ns / 1000000, 0.95)")
            .alias("p95_ms"),
        F.expr("percentile_approx(duration_ns / 1000000, 0.99)")
            .alias("p99_ms"),
        F.sum(F.when(F.col("status_code") == 2, 1).otherwise(0))
            .alias("error_count"),
        F.countDistinct("trace_id").alias("unique_traces")
    )

# Deduplicate spans that might have been ingested multiple times
deduped_traces = traces_df.dropDuplicates(["trace_id", "span_id"])
dedup_stats = deduped_traces \
    .groupBy("service_name") \
    .agg(F.count("*").alias("deduped_span_count"))

# Write batch results to ClickHouse
service_stats.write \
    .format("jdbc") \
    .option("url", "jdbc:clickhouse://clickhouse:8123/default") \
    .option("dbtable", "service_stats_batch") \
    .option("driver", "com.clickhouse.jdbc.ClickHouseDriver") \
    .mode("overwrite") \
    .save()

print(f"Batch processing complete for {yesterday}")
spark.stop()
```

## Serving Layer: Merging Views

The serving layer queries both the real-time and batch tables and merges the results:

```sql
-- ClickHouse view that merges real-time and batch data
CREATE VIEW service_stats_merged AS
SELECT
    service_name,
    operation_name,
    -- Use batch stats for completed days, real-time for today
    if(date = today(),
       rt.total_spans,
       batch.total_spans) as total_spans,
    if(date = today(),
       rt.p99_ms,
       batch.p99_ms) as p99_ms,
    if(date = today(),
       rt.error_count,
       batch.error_count) as error_count
FROM (
    -- Real-time aggregation for today
    SELECT
        service_name,
        operation_name,
        toDate(timestamp) as date,
        count() as total_spans,
        quantile(0.99)(duration_ns / 1e6) as p99_ms,
        countIf(status_code = 2) as error_count
    FROM otel_traces
    WHERE timestamp >= today()
    GROUP BY service_name, operation_name, date
) rt
FULL OUTER JOIN service_stats_batch batch
    ON rt.service_name = batch.service_name
    AND rt.operation_name = batch.operation_name;
```

## Scheduling the Batch Job

Use Apache Airflow to schedule daily reprocessing:

```python
# airflow_dag.py
from airflow import DAG
from airflow.providers.apache.spark.operators.spark_submit import SparkSubmitOperator
from datetime import datetime, timedelta

dag = DAG(
    "telemetry_batch_reprocessor",
    schedule_interval="0 4 * * *",  # Run at 4 AM UTC daily
    start_date=datetime(2026, 1, 1),
    catchup=False,
    default_args={"retries": 2, "retry_delay": timedelta(minutes=10)}
)

reprocess_task = SparkSubmitOperator(
    task_id="reprocess_telemetry",
    application="/opt/spark-jobs/batch_reprocessor.py",
    conn_id="spark_default",
    dag=dag
)
```

## Wrapping Up

Lambda architecture is well-suited for telemetry because it gives you the best of both worlds: sub-second latency for real-time dashboards and accurate, deduplicated results from batch processing. The real-time path handles the "what is happening now" question, while the batch path answers "what exactly happened yesterday" with full accuracy.
