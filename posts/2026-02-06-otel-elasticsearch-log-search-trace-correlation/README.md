# How to Set Up OpenTelemetry with Elasticsearch for Full-Text Log Search

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Elasticsearch, Log Search, Trace Correlation

Description: Configure OpenTelemetry to export logs and traces to Elasticsearch for full-text search with trace-to-log correlation.

Elasticsearch remains one of the best options for full-text log search. When you combine it with OpenTelemetry's trace context propagation, you get something powerful: the ability to search for a log message and immediately see the full distributed trace it belongs to. This post covers how to set that up.

## The Correlation Strategy

OpenTelemetry log records carry the active trace ID and span ID when you use the OTel SDK logging bridge. With the Elasticsearch exporter's ECS mapping, these are stored as `trace.id` and `span.id`, so you can jump from a log entry to its parent trace and back.

## Collector Configuration

The Collector needs to receive both logs and traces via OTLP and export them to Elasticsearch:

```yaml
# otel-collector.yaml

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    send_batch_size: 2048
    timeout: 1s

  # Add resource detection for host/container metadata
  resource_detection:
    detectors: [env, system, docker]
    timeout: 5s

exporters:
  elasticsearch/logs:
    endpoints:
      - https://elasticsearch:9200
    logs_index: otel-logs
    user: elastic
    password: ${env:ES_PASSWORD}
    tls:
      insecure_skip_verify: false
      ca_file: /etc/ssl/certs/es-ca.pem
    # Restrict the exporter to ECS mapping. The older mapping.mode option is deprecated.
    mapping:
      allowed_modes: [ecs]

  elasticsearch/traces:
    endpoints:
      - https://elasticsearch:9200
    traces_index: otel-traces
    user: elastic
    password: ${env:ES_PASSWORD}
    tls:
      insecure_skip_verify: false
      ca_file: /etc/ssl/certs/es-ca.pem
    mapping:
      allowed_modes: [ecs]

service:
  pipelines:
    logs:
      receivers: [otlp]
      processors: [resource_detection, batch]
      exporters: [elasticsearch/logs]
    traces:
      receivers: [otlp]
      processors: [resource_detection, batch]
      exporters: [elasticsearch/traces]
```

## Elasticsearch Index Template

Create an index template that optimizes for trace correlation queries:

```http
PUT _index_template/otel-logs
{
  "index_patterns": ["otel-logs*"],
  "template": {
    "settings": {
      "number_of_shards": 3,
      "number_of_replicas": 1,
      "index.refresh_interval": "5s"
    },
    "mappings": {
      "properties": {
        "@timestamp": { "type": "date" },
        "trace.id": { "type": "keyword" },
        "span.id": { "type": "keyword" },
        "log.level": { "type": "keyword" },
        "event.severity": { "type": "integer" },
        "message": { "type": "text", "analyzer": "standard" },
        "service.name": { "type": "keyword" },
        "service.namespace": { "type": "keyword" },
        "attributes": {
          "type": "object",
          "dynamic": true
        }
      }
    }
  }
}
```

The key here is that `trace.id` and `span.id` are mapped as `keyword` type, not `text`. This allows exact-match lookups, which are much faster than full-text search on these fields.

## Application-Side Instrumentation

For trace-log correlation to work, your application needs to emit logs through the OTel logging bridge. Here is a Python example:

```python
# app.py
import logging
from opentelemetry import trace
from opentelemetry._logs import set_logger_provider
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk._logs import LoggerProvider, LoggingHandler
from opentelemetry.sdk._logs.export import BatchLogRecordProcessor
from opentelemetry.exporter.otlp.proto.grpc._log_exporter import OTLPLogExporter

# Set up tracing
trace_provider = TracerProvider()
trace_provider.add_span_processor(
    BatchSpanProcessor(
        OTLPSpanExporter(endpoint="http://otel-collector:4317", insecure=True)
    )
)
trace.set_tracer_provider(trace_provider)

# Set up logging with OTel bridge
logger_provider = LoggerProvider()
set_logger_provider(logger_provider)
logger_provider.add_log_record_processor(
    BatchLogRecordProcessor(
        OTLPLogExporter(endpoint="http://otel-collector:4317", insecure=True)
    )
)

# Attach OTel handler to standard Python logging
handler = LoggingHandler(logger_provider=logger_provider)
logging.getLogger().addHandler(handler)
logging.getLogger().setLevel(logging.INFO)

logger = logging.getLogger(__name__)
tracer = trace.get_tracer(__name__)

# Now logs automatically include trace context
with tracer.start_as_current_span("process-order") as span:
    logger.info("Processing order #12345")
    # This log record will include the trace ID and span ID
    # from the active span
    logger.info("Payment validated successfully")
```

## Querying Correlated Data

Once data is flowing, you can search logs and find related traces:

```http
// Find all logs for a specific trace
GET otel-logs/_search
{
  "query": {
    "term": {
      "trace.id": "4bf92f3577b34da6a3ce929d0e0e4736"
    }
  },
  "sort": [{ "@timestamp": "asc" }]
}

// Find error logs and get their trace IDs
GET otel-logs/_search
{
  "query": {
    "bool": {
      "must": [
        { "match": { "message": "payment failed" } },
        { "term": { "log.level": "ERROR" } }
      ],
      "filter": [
        { "range": { "@timestamp": { "gte": "now-1h" } } }
      ]
    }
  },
  "_source": ["trace.id", "message", "@timestamp", "service.name"]
}
```

Then take the `trace.id` from the log result and look up the full trace:

```http
GET otel-traces/_search
{
  "query": {
    "term": {
      "trace.id": "4bf92f3577b34da6a3ce929d0e0e4736"
    }
  },
  "sort": [{ "@timestamp": "asc" }]
}
```

## ILM Policy for Retention

Set up an Index Lifecycle Management policy for retention:

```http
PUT _ilm/policy/otel-logs-policy
{
  "policy": {
    "phases": {
      "hot": {
        "actions": {
          "rollover": {
            "max_size": "50gb",
            "max_age": "1d"
          }
        }
      },
      "warm": {
        "min_age": "7d",
        "actions": {
          "forcemerge": { "max_num_segments": 1 },
          "shrink": { "number_of_shards": 1 }
        }
      },
      "delete": {
        "min_age": "30d",
        "actions": { "delete": {} }
      }
    }
  }
}
```

Attach this policy to the target data stream or index template for it to take effect. If you use index aliases instead of data streams, configure an `index.lifecycle.rollover_alias` and bootstrap the initial write index.

## Wrapping Up

Elasticsearch gives you something that most trace-only backends cannot: full-text search across all your log data with instant trace correlation. By using OpenTelemetry's native trace context propagation and the Elasticsearch exporter, you get a unified search experience that lets engineers start from a keyword search and drill down into the exact distributed trace that produced the error.
