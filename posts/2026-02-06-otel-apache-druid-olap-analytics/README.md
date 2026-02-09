# How to Configure OpenTelemetry with Apache Druid for Real-Time OLAP Analytics on Trace and Metric Data

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Apache Druid, OLAP Analytics, Real-Time

Description: Configure OpenTelemetry to feed trace and metric data into Apache Druid for real-time OLAP analytics and interactive exploration.

Apache Druid is an OLAP database designed for sub-second analytics on large datasets. It is particularly good at time-series aggregations, which makes it a strong fit for telemetry analytics. By routing OpenTelemetry data to Druid, you can build interactive dashboards that slice and dice trace and metric data across any dimension in real time.

## Why Druid for Telemetry Analytics

Druid excels at queries like "show me the p99 latency for all services, broken down by region and deployment version, for the last 6 hours." These multi-dimensional rollup queries run in milliseconds in Druid, even across billions of rows, because of its columnar storage, bitmap indexes, and pre-aggregation capabilities.

## Architecture

```
OTel Collector -> Kafka -> Druid (real-time ingestion) -> Analytics Queries
```

Druid natively consumes from Kafka, so the pipeline is straightforward.

## Collector to Kafka Configuration

```yaml
# collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

exporters:
  kafka/traces:
    brokers: ["kafka:9092"]
    topic: otel-traces-druid
    encoding: otlp_json
    producer:
      compression: lz4

  kafka/metrics:
    brokers: ["kafka:9092"]
    topic: otel-metrics-druid
    encoding: otlp_json
    producer:
      compression: lz4

processors:
  batch:
    send_batch_size: 4096
    timeout: 1s

  # Flatten nested attributes for better Druid indexing
  transform:
    trace_statements:
      - context: span
        statements:
          - set(attributes["http.method"],
              attributes["http.request.method"])
          - set(attributes["http.status"],
              attributes["http.response.status_code"])

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [transform, batch]
      exporters: [kafka/traces]
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [kafka/metrics]
```

## Druid Ingestion Spec for Traces

Create a Kafka ingestion supervisor spec for trace data:

```json
{
  "type": "kafka",
  "spec": {
    "ioConfig": {
      "type": "kafka",
      "consumerProperties": {
        "bootstrap.servers": "kafka:9092"
      },
      "topic": "otel-traces-druid",
      "inputFormat": {
        "type": "json",
        "flattenSpec": {
          "useFieldDiscovery": false,
          "fields": [
            {"type": "path", "name": "trace_id",
             "expr": "$.resourceSpans[0].scopeSpans[0].spans[0].traceId"},
            {"type": "path", "name": "span_id",
             "expr": "$.resourceSpans[0].scopeSpans[0].spans[0].spanId"},
            {"type": "path", "name": "service_name",
             "expr": "$.resourceSpans[0].resource.attributes[?(@.key=='service.name')].value.stringValue"},
            {"type": "path", "name": "span_name",
             "expr": "$.resourceSpans[0].scopeSpans[0].spans[0].name"},
            {"type": "path", "name": "start_time",
             "expr": "$.resourceSpans[0].scopeSpans[0].spans[0].startTimeUnixNano"},
            {"type": "path", "name": "end_time",
             "expr": "$.resourceSpans[0].scopeSpans[0].spans[0].endTimeUnixNano"}
          ]
        }
      },
      "useEarliestOffset": true
    },
    "tuningConfig": {
      "type": "kafka",
      "maxRowsPerSegment": 5000000,
      "maxRowsInMemory": 500000,
      "intermediatePersistPeriod": "PT10M"
    },
    "dataSchema": {
      "dataSource": "otel_traces",
      "timestampSpec": {
        "column": "start_time",
        "format": "nano"
      },
      "dimensionsSpec": {
        "dimensions": [
          "trace_id",
          "span_id",
          "service_name",
          "span_name",
          {"name": "status_code", "type": "long"}
        ]
      },
      "metricsSpec": [
        {"type": "count", "name": "span_count"},
        {"type": "longSum", "name": "total_duration_ns",
         "fieldName": "duration_ns"},
        {"type": "longMax", "name": "max_duration_ns",
         "fieldName": "duration_ns"},
        {"type": "longMin", "name": "min_duration_ns",
         "fieldName": "duration_ns"}
      ],
      "granularitySpec": {
        "segmentGranularity": "HOUR",
        "queryGranularity": "MINUTE",
        "rollup": true
      }
    }
  }
}
```

## Druid Ingestion Spec for Metrics

```json
{
  "type": "kafka",
  "spec": {
    "ioConfig": {
      "type": "kafka",
      "consumerProperties": {
        "bootstrap.servers": "kafka:9092"
      },
      "topic": "otel-metrics-druid",
      "inputFormat": {
        "type": "json"
      },
      "useEarliestOffset": true
    },
    "dataSchema": {
      "dataSource": "otel_metrics",
      "timestampSpec": {
        "column": "timestamp",
        "format": "millis"
      },
      "dimensionsSpec": {
        "dimensions": [
          "metric_name",
          "service_name",
          "instance_id"
        ]
      },
      "metricsSpec": [
        {"type": "doubleSum", "name": "value_sum", "fieldName": "value"},
        {"type": "doubleMax", "name": "value_max", "fieldName": "value"},
        {"type": "doubleMin", "name": "value_min", "fieldName": "value"},
        {"type": "count", "name": "sample_count"}
      ],
      "granularitySpec": {
        "segmentGranularity": "HOUR",
        "queryGranularity": "MINUTE",
        "rollup": true
      }
    }
  }
}
```

## Querying Druid

Druid supports both its native JSON query language and SQL. Here are some practical queries:

```sql
-- Top 10 slowest operations in the last hour
SELECT
  service_name,
  span_name,
  SUM(total_duration_ns) / SUM(span_count) / 1e6 AS avg_ms,
  MAX(max_duration_ns) / 1e6 AS max_ms,
  SUM(span_count) AS total_spans
FROM otel_traces
WHERE __time >= CURRENT_TIMESTAMP - INTERVAL '1' HOUR
GROUP BY service_name, span_name
ORDER BY avg_ms DESC
LIMIT 10;

-- Error rate by service over time
SELECT
  TIME_FLOOR(__time, 'PT5M') AS time_bucket,
  service_name,
  SUM(CASE WHEN status_code = 2 THEN span_count ELSE 0 END) * 100.0
    / SUM(span_count) AS error_rate_pct
FROM otel_traces
WHERE __time >= CURRENT_TIMESTAMP - INTERVAL '6' HOUR
GROUP BY 1, 2
ORDER BY 1, 2;
```

## Rollup for Cost Efficiency

Druid's rollup feature pre-aggregates data at ingestion time. Setting `queryGranularity` to `MINUTE` means Druid combines all spans within the same minute that share the same dimensions into a single row. This dramatically reduces storage while still allowing minute-level analytics.

## Wrapping Up

Apache Druid brings interactive OLAP analytics to your telemetry data. The combination of Kafka-native ingestion, automatic rollup, and sub-second query performance makes it ideal for building dashboards that let engineers explore latency, error rates, and throughput across any combination of service, operation, region, and time window.
