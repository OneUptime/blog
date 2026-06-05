# How to Build a Lambda Architecture for Telemetry: Real-Time OTel Stream + Batch

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Lambda Architecture, Kafka, Batch Processing

Description: Implement a lambda architecture for telemetry with a real-time OpenTelemetry stream path and a batch reprocessing path from Kafka.

Lambda architecture splits data processing into two paths: a real-time stream for immediate visibility and a batch layer for accurate, complete results. This pattern fits telemetry perfectly. Your real-time path gives engineers instant dashboards, while the batch path recomputes aggregations with complete data and fixes any gaps from the stream.

## Architecture Overview

```text
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
  kafka/traces:
    brokers:
      - kafka:9092
    traces:
      topic: otel-traces-archive
      encoding: otlp_proto
    producer:
      compression: zstd
      required_acks: -1
  kafka/metrics:
    brokers:
      - kafka:9092
    metrics:
      topic: otel-metrics-archive
      encoding: otlp_proto
    producer:
      compression: zstd
      required_acks: -1
  kafka/logs:
    brokers:
      - kafka:9092
    logs:
      topic: otel-logs-archive
      encoding: otlp_proto
    producer:
      compression: zstd
      required_acks: -1

processors:
  batch:
    send_batch_size: 4096
    timeout: 1s

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp/realtime, kafka/traces]
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp/realtime, kafka/metrics]
    logs:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp/realtime, kafka/logs]
```

The important detail here is the dual export: every piece of telemetry goes to both the real-time backend and Kafka simultaneously.

## Kafka to S3 Archival

Use Kafka Connect to continuously archive decoded, schemaful span data to S3 in Parquet format. The S3 sink cannot turn the Collector Kafka exporter's raw OTLP protobuf messages into Parquet by itself, so run this after a small decoder job has converted `otel-traces-archive` into a normalized span topic such as `otel-traces-parquet`:

```json
{
  "name": "otel-s3-sink",
  "config": {
    "connector.class": "io.confluent.connect.s3.S3SinkConnector",
    "tasks.max": "8",
    "topics": "otel-traces-parquet",
    "s3.region": "us-east-1",
    "s3.bucket.name": "telemetry-archive",
    "s3.part.size": "67108864",
    "flush.size": "100000",
    "rotate.interval.ms": "3600000",
    "storage.class": "io.confluent.connect.s3.storage.S3Storage",
    "format.class": "io.confluent.connect.s3.format.parquet.ParquetFormat",
    "value.converter": "io.confluent.connect.avro.AvroConverter",
    "value.converter.schema.registry.url": "http://schema-registry:8081",
    "partitioner.class": "io.confluent.connect.storage.partitioner.TimeBasedPartitioner",
    "topics.dir": "topics",
    "path.format": "'year'=YYYY/'month'=MM/'day'=dd/'hour'=HH",
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
from datetime import datetime, timedelta, timezone

spark = SparkSession.builder \
    .appName("TelemetryBatchReprocessor") \
    .config("spark.jars.packages",
            "com.clickhouse:clickhouse-jdbc:0.9.8") \
    .getOrCreate()

# Read archived telemetry from S3
process_date = (datetime.now(timezone.utc) - timedelta(days=1)).date()
traces_df = spark.read.parquet(
    "s3a://telemetry-archive/topics/otel-traces-parquet/"
    f"year={process_date:%Y}/month={process_date:%m}/"
    f"day={process_date:%d}/hour=*"
)

# Deduplicate spans that might have been ingested multiple times
deduped_traces = traces_df.dropDuplicates(["trace_id", "span_id"])

# Compute accurate daily aggregations
# These replace the approximate real-time values
service_stats = deduped_traces \
    .groupBy(
        "service_name",
        "operation_name",
        F.lit(process_date.isoformat()).cast("date").alias("date")
    ) \
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

# Write batch results to ClickHouse
service_stats.write \
    .format("jdbc") \
    .option("url", "jdbc:clickhouse://clickhouse:8123/default") \
    .option("dbtable", "service_stats_batch") \
    .option("driver", "com.clickhouse.jdbc.ClickHouseDriver") \
    .mode("overwrite") \
    .save()

print(f"Batch processing complete for {process_date}")
spark.stop()
```

## Serving Layer: Merging Views

The serving layer queries both the real-time and batch tables and merges the results:

```sql
-- ClickHouse view that merges real-time and batch data
CREATE VIEW service_stats_merged AS
SELECT
    coalesce(rt.service_name, batch.service_name) as service_name,
    coalesce(rt.operation_name, batch.operation_name) as operation_name,
    coalesce(rt.date, batch.date) as date,
    -- Use batch stats for completed days, real-time for today
    if(coalesce(rt.date, batch.date) = today(),
       rt.total_spans,
       batch.total_spans) as total_spans,
    if(coalesce(rt.date, batch.date) = today(),
       rt.p99_ms,
       batch.p99_ms) as p99_ms,
    if(coalesce(rt.date, batch.date) = today(),
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
    AND rt.operation_name = batch.operation_name
    AND rt.date = batch.date;
```

## Scheduling the Batch Job

Use Apache Airflow to schedule daily reprocessing:

```python
# airflow_dag.py
from airflow.sdk import DAG
from airflow.providers.apache.spark.operators.spark_submit import SparkSubmitOperator
from datetime import timedelta
import pendulum

dag = DAG(
    "telemetry_batch_reprocessor",
    schedule="0 4 * * *",  # Run at 4 AM UTC daily
    start_date=pendulum.datetime(2026, 1, 1, tz="UTC"),
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
