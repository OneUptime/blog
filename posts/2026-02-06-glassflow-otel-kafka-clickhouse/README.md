# How to Use GlassFlow as a Stream Processor Between OpenTelemetry Kafka Pipelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, GlassFlow, Kafka, ClickHouse

Description: Learn to use GlassFlow as a serverless stream processor to transform OpenTelemetry data between Kafka and ClickHouse.

GlassFlow is an open-source streaming ETL platform for moving data from sources such as Kafka or OTLP into ClickHouse. It sits naturally between a Kafka topic (where your OpenTelemetry Collector exports data) and ClickHouse (where you want to store processed telemetry). This approach gives you the power of stream filtering, deduplication, and field mapping without the operational burden of running Flink or Spark Streaming.

## Why GlassFlow?

Running Apache Flink for telemetry processing is powerful, but it comes with serious operational overhead. You need to manage a cluster, handle state checkpointing, and deal with job restarts. GlassFlow gives you a simpler model: define a pipeline, add optional transformations, and send the result to ClickHouse. It handles scaling, retries, and deduplication when configured.

## Architecture

```text
OTel Collector -> Kafka -> GlassFlow (transform) -> ClickHouse
```

GlassFlow connects to your Kafka topic as a consumer and processes each message through the configured transformations. The output gets written to ClickHouse through its native ClickHouse sink.

## Setting Up the Kafka Source

First, configure your OTel Collector to write to Kafka:

```yaml
# otel-collector.yaml

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

exporters:
  kafka:
    brokers:
      - kafka:9092
    traces:
      topic: otel-traces-raw
      encoding: otlp_json
    producer:
      compression: snappy

processors:
  batch:
    send_batch_size: 4096
    timeout: 1s

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [kafka]
```

## Creating the GlassFlow Pipeline

Install the GlassFlow SDK and create your pipeline. The Kafka source schema below assumes each Kafka message is already a flattened JSON span record with the fields shown in `schema_fields`. If your topic contains raw `otlp_json` batches with `resourceSpans`, flatten them before this Kafka topic or use GlassFlow's OTLP source instead.

```python
# create_pipeline.py
from glassflow.etl import Client

client = Client(host="http://localhost:30180")

pipeline_config = {
    "version": "v3",
    "pipeline_id": "otel-traces-to-clickhouse",
    "name": "OTel traces to ClickHouse",
    "sources": [
        {
            "type": "kafka",
            "source_id": "otel_traces",
            "connection_params": {
                "brokers": ["kafka:9092"],
                "protocol": "PLAINTEXT",
                "mechanism": "NO_AUTH"
            },
            "topic": "otel-traces-raw",
            "consumer_group_initial_offset": "earliest",
            "schema_fields": [
                {"name": "timestamp", "type": "datetime"},
                {"name": "trace_id", "type": "string"},
                {"name": "span_id", "type": "string"},
                {"name": "parent_span_id", "type": "string"},
                {"name": "service_name", "type": "string"},
                {"name": "span_name", "type": "string"},
                {"name": "duration_ms", "type": "float"},
                {"name": "status_code", "type": "string"},
                {"name": "attributes", "type": "object"},
                {"name": "fingerprint", "type": "string"}
            ]
        }
    ],
    "transforms": [
        {
            "type": "filter",
            "source_id": "otel_traces",
            "config": {
                "expression": "duration_ms >= 1.0"
            }
        },
        {
            "type": "dedup",
            "source_id": "otel_traces",
            "config": {
                "key": "fingerprint",
                "time_window": "1h"
            }
        }
    ],
    "sink": {
        "type": "clickhouse",
        "connection_params": {
            "host": "clickhouse",
            "port": "9000",
            "http_port": "8123",
            "database": "default",
            "username": "default",
            "password": "",
            "secure": False
        },
        "table": "otel_traces_processed",
        "max_batch_size": 1000,
        "max_delay_time": "1s",
        "mapping": [
            {"name": "timestamp", "column_name": "timestamp", "column_type": "DateTime64(6)"},
            {"name": "trace_id", "column_name": "trace_id", "column_type": "String"},
            {"name": "span_id", "column_name": "span_id", "column_type": "String"},
            {"name": "parent_span_id", "column_name": "parent_span_id", "column_type": "String"},
            {"name": "service_name", "column_name": "service_name", "column_type": "LowCardinality(String)"},
            {"name": "span_name", "column_name": "span_name", "column_type": "LowCardinality(String)"},
            {"name": "duration_ms", "column_name": "duration_ms", "column_type": "Float64"},
            {"name": "status_code", "column_name": "status_code", "column_type": "LowCardinality(String)"},
            {"name": "attributes", "column_name": "attributes", "column_type": "Map(String, String)"},
            {"name": "fingerprint", "column_name": "fingerprint", "column_type": "String"}
        ]
    }
}

pipeline = client.create_pipeline(pipeline_config)

print(f"Pipeline created: {pipeline.pipeline_id}")
```

## Writing the Transformation Configuration

This is where the real value is. Configure GlassFlow transformations to filter and deduplicate each JSON record before the sink maps it into the format your ClickHouse table expects:

```python
transforms = [
    # Drop spans shorter than 1ms to reduce noise.
    {
        "type": "filter",
        "source_id": "otel_traces",
        "config": {
            "expression": "duration_ms >= 1.0"
        }
    },
    {
        "type": "dedup",
        "source_id": "otel_traces",
        "config": {
            "key": "fingerprint",
            "time_window": "1h"
        }
    }
]
```

## ClickHouse Table Setup

Create the destination table that matches the transformed output:

```sql
CREATE TABLE otel_traces_processed (
    timestamp DateTime64(6) CODEC(Delta, ZSTD(1)),
    trace_id String CODEC(ZSTD(1)),
    span_id String CODEC(ZSTD(1)),
    parent_span_id String CODEC(ZSTD(1)),
    service_name LowCardinality(String),
    span_name LowCardinality(String),
    duration_ms Float64 CODEC(ZSTD(1)),
    status_code LowCardinality(String),
    attributes Map(String, String) CODEC(ZSTD(1)),
    fingerprint String CODEC(ZSTD(1))
) ENGINE = ReplacingMergeTree(timestamp)
PARTITION BY toDate(timestamp)
ORDER BY (service_name, fingerprint);
```

Using `ReplacingMergeTree` with the fingerprint in the `ORDER BY` clause gives you eventual deduplication during background merges. ClickHouse does not guarantee that duplicates disappear immediately; use GlassFlow deduplication before the sink, or query with `FINAL` when you need query-time deduplication.

## Monitoring the Pipeline

GlassFlow provides built-in metrics for your pipeline. You can also inspect pipeline health through the SDK:

```python
pipeline = client.get_pipeline(pipeline_id="otel-traces-to-clickhouse")
print(pipeline.status)
print(pipeline.health())
```

## Wrapping Up

GlassFlow provides a low-overhead way to add stream processing to your OpenTelemetry pipeline. Instead of managing a Flink cluster, you define a pipeline and deploy it. For teams that need filtering, deduplication, or field mapping between Kafka and ClickHouse but do not want to manage a general-purpose stream processing stack, GlassFlow is worth considering.
