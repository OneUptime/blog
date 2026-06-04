# How to use OpenTelemetry with Loki for unified logs and traces

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Loki, Grafana, Log, Trace

Description: Learn how to configure OpenTelemetry to send logs to Grafana Loki and correlate them with traces for unified observability and seamless navigation between logs and traces.

---

Grafana Loki provides efficient log aggregation that integrates seamlessly with OpenTelemetry traces. By correlating logs with traces using trace context, you can navigate between logs and traces in Grafana for comprehensive troubleshooting.

## Deploying Loki

Deploy Loki using Docker or Kubernetes.

```yaml
# loki-config.yaml

auth_enabled: false

server:
  http_listen_port: 3100
  grpc_listen_port: 9096

common:
  path_prefix: /tmp/loki
  storage:
    filesystem:
      chunks_directory: /tmp/loki/chunks
      rules_directory: /tmp/loki/rules
  replication_factor: 1
  ring:
    kvstore:
      store: inmemory

schema_config:
  configs:
    - from: 2024-04-01
      store: tsdb
      object_store: filesystem
      schema: v13
      index:
        prefix: index_
        period: 24h
```

Run Loki with Docker.

```bash
docker run -d --name loki \
  -v $(pwd)/loki-config.yaml:/etc/loki/config.yaml \
  -p 3100:3100 \
  grafana/loki:latest \
  -config.file=/etc/loki/config.yaml
```

## Collector Configuration for Loki

Configure the OpenTelemetry Collector to export logs to Loki.

```yaml
# collector-loki.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    timeout: 10s

exporters:
  otlphttp/logs:
    endpoint: http://loki:3100/otlp
    tls:
      insecure: true

service:
  pipelines:
    logs:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp/logs]
```

## Application Configuration

Configure applications to send logs with trace context to the collector.

```python
# python_loki_logs.py
import logging
from opentelemetry import trace
from opentelemetry._logs import set_logger_provider
from opentelemetry.instrumentation.logging import LoggingInstrumentor
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk._logs import LoggerProvider, LoggingHandler
from opentelemetry.sdk._logs.export import BatchLogRecordProcessor
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc._log_exporter import OTLPLogExporter
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter

resource = Resource.create({"service.name": "my-app"})

# Configure log export
logger_provider = LoggerProvider(resource=resource)
logger_provider.add_log_record_processor(
    BatchLogRecordProcessor(OTLPLogExporter(endpoint="http://localhost:4317"))
)
set_logger_provider(logger_provider)

# Configure trace export
tracer_provider = TracerProvider(resource=resource)
tracer_provider.add_span_processor(
    BatchSpanProcessor(OTLPSpanExporter(endpoint="http://localhost:4317"))
)
trace.set_tracer_provider(tracer_provider)

# Instrument logging
LoggingInstrumentor().instrument(set_logging_format=True)

handler = LoggingHandler(logger_provider=logger_provider)
logging.getLogger().addHandler(handler)
logging.getLogger().setLevel(logging.INFO)

tracer = trace.get_tracer(__name__)

# Logs automatically include trace context
def process_request():
    with tracer.start_as_current_span("process_request") as span:
        logging.info("Processing request")  # Includes trace_id and span_id
        result = do_work()
        logging.info(f"Request completed: {result}")
        return result

def do_work():
    return "success"
```

## Grafana Configuration

Configure Grafana to show correlated logs and traces.

```yaml
# grafana-datasources.yaml
apiVersion: 1
datasources:
  - name: Loki
    type: loki
    uid: loki
    access: proxy
    url: http://loki:3100
    jsonData:
      derivedFields:
        - datasourceUid: tempo
          matcherRegex: "(?:trace_id|traceid)=(\\w+)"
          name: TraceID
          url: "$${__value.raw}"
  
  - name: Tempo
    type: tempo
    uid: tempo
    access: proxy
    url: http://tempo:3200
    jsonData:
      tracesToLogsV2:
        datasourceUid: loki
        tags: [{ key: 'service.name', value: 'service_name' }]
        filterByTraceID: true
        filterBySpanID: false
```

## Querying Correlated Data

Query logs with trace context in LogQL.

```logql
# Find logs for specific trace
{service_name="my-app"} | trace_id="4bf92f3577b34da6a3ce929d0e0e4736"

# Find error logs with traces
{service_name="my-app"} | severity_text="ERROR" | trace_id != ""

# Count logs by trace presence
sum by (service_name) (count_over_time({service_name="my-app"} | trace_id != "" [1h]))
```

## Best Practices

First, keep trace_id and span_id as structured metadata in Loki instead of labels to avoid high-cardinality index labels.

Second, configure derived fields in Grafana to enable one-click navigation from logs to traces.

Third, use structured logging with JSON format for better parsing and querying.

Fourth, set appropriate retention policies in Loki based on log volume and compliance needs.

Fifth, leverage Loki's label-based indexing to keep cardinality low and queries fast.

OpenTelemetry integration with Grafana Loki enables unified logs and traces navigation. Proper correlation configuration provides seamless troubleshooting workflows between different telemetry signals in Grafana.
