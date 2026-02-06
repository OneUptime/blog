# How to Use GlassFlow as a Stream Processor Between OpenTelemetry Kafka Pipelines and ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, GlassFlow, Kafka, ClickHouse

Description: Learn to use GlassFlow as a serverless stream processor to transform OpenTelemetry data between Kafka and ClickHouse.

GlassFlow is a serverless stream processing platform that lets you write Python transformation functions without managing any infrastructure. It sits naturally between a Kafka topic (where your OpenTelemetry Collector exports data) and ClickHouse (where you want to store processed telemetry). This approach gives you the power of custom stream processing without the operational burden of running Flink or Spark Streaming.

## Why GlassFlow?

Running Apache Flink for telemetry processing is powerful, but it comes with serious operational overhead. You need to manage a cluster, handle state checkpointing, and deal with job restarts. GlassFlow gives you a simpler model: write a Python function, deploy it, and it processes your stream. It handles scaling, retries, and exactly-once delivery for you.

## Architecture

```
OTel Collector -> Kafka -> GlassFlow (transform) -> ClickHouse
```

GlassFlow connects to your Kafka topic as a consumer and processes each message through your Python function. The output gets written to ClickHouse.

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

Install the GlassFlow SDK and create your pipeline:

```python
# create_pipeline.py
import glassflow

# Initialize the client
client = glassflow.GlassFlowClient()

# Create a new pipeline
pipeline = client.create_pipeline(
    name="otel-traces-to-clickhouse",
    space_id="your-space-id",
    # Define the source as Kafka
    source={
        "type": "kafka",
        "config": {
            "bootstrap_servers": "kafka:9092",
            "topic": "otel-traces-raw",
            "group_id": "glassflow-otel-processor",
            "auto_offset_reset": "earliest"
        }
    },
    # Define the sink as a webhook (to ClickHouse HTTP interface)
    sink={
        "type": "webhook",
        "config": {
            "url": "http://clickhouse:8123/",
            "method": "POST",
            "headers": {
                "X-ClickHouse-Database": "default",
                "X-ClickHouse-Format": "JSONEachRow"
            }
        }
    }
)

print(f"Pipeline created: {pipeline.id}")
```

## Writing the Transformation Function

This is where the real value is. Write a Python function that transforms raw OTLP JSON into the format your ClickHouse table expects:

```python
# transform.py
import hashlib
from datetime import datetime

def handler(data, log):
    """
    Transform OTLP trace data into a flattened format
    suitable for ClickHouse insertion.
    """
    results = []

    # OTLP JSON has a nested structure we need to flatten
    for resource_span in data.get("resourceSpans", []):
        # Extract service name from resource attributes
        resource_attrs = {}
        for attr in resource_span.get("resource", {}).get("attributes", []):
            resource_attrs[attr["key"]] = attr.get("value", {}).get("stringValue", "")

        service_name = resource_attrs.get("service.name", "unknown")

        for scope_span in resource_span.get("scopeSpans", []):
            for span in scope_span.get("spans", []):
                # Convert nanosecond timestamps to datetime
                start_ns = int(span.get("startTimeUnixNano", 0))
                end_ns = int(span.get("endTimeUnixNano", 0))
                duration_ms = (end_ns - start_ns) / 1_000_000

                # Flatten span attributes into a map
                span_attrs = {}
                for attr in span.get("attributes", []):
                    key = attr["key"]
                    value = attr.get("value", {})
                    # Handle different value types
                    if "stringValue" in value:
                        span_attrs[key] = value["stringValue"]
                    elif "intValue" in value:
                        span_attrs[key] = str(value["intValue"])
                    elif "boolValue" in value:
                        span_attrs[key] = str(value["boolValue"])

                # Compute a fingerprint for deduplication
                fingerprint = hashlib.md5(
                    f"{span['traceId']}{span['spanId']}".encode()
                ).hexdigest()

                record = {
                    "timestamp": datetime.utcfromtimestamp(
                        start_ns / 1e9
                    ).strftime("%Y-%m-%d %H:%M:%S.%f"),
                    "trace_id": span["traceId"],
                    "span_id": span["spanId"],
                    "parent_span_id": span.get("parentSpanId", ""),
                    "service_name": service_name,
                    "span_name": span.get("name", ""),
                    "duration_ms": round(duration_ms, 2),
                    "status_code": span.get("status", {}).get("code", "UNSET"),
                    "attributes": span_attrs,
                    "fingerprint": fingerprint
                }

                # Drop spans shorter than 1ms to reduce noise
                if duration_ms >= 1.0:
                    results.append(record)

                log.info(f"Processed span {span['spanId']} "
                         f"from {service_name}")

    return results
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

Using `ReplacingMergeTree` with the fingerprint in the ORDER BY clause gives you automatic deduplication during merges.

## Monitoring the Pipeline

GlassFlow provides built-in metrics for your pipeline. You can also add logging inside your handler function:

```python
def handler(data, log):
    log.info(f"Processing batch with "
             f"{len(data.get('resourceSpans', []))} resource spans")
    # ... transformation logic ...
    log.info(f"Produced {len(results)} records")
    return results
```

## Wrapping Up

GlassFlow provides a low-overhead way to add stream processing to your OpenTelemetry pipeline. Instead of managing a Flink cluster, you write a Python function and deploy it. For teams that need custom transformations, filtering, or enrichment between Kafka and ClickHouse but do not want to manage stream processing infrastructure, GlassFlow is worth considering.
