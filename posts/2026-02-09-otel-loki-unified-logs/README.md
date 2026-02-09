# How to use OpenTelemetry with Loki for unified logs and traces

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Loki, Grafana, Logs, Traces

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
    - from: 2020-10-24
      store: boltdb-shipper
      object_store: filesystem
      schema: v11
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
  
  # Extract trace context from logs
  resource:
    attributes:
      - key: loki.resource.labels
        value: service.name, service.namespace
        action: insert

exporters:
  loki:
    endpoint: http://loki:3100/loki/api/v1/push
    labels:
      resource:
        service.name: "service_name"
        service.namespace: "namespace"
      attributes:
        log.level: "level"
        trace_id: "trace_id"
        span_id: "span_id"

service:
  pipelines:
    logs:
      receivers: [otlp]
      processors: [batch, resource]
      exporters: [loki]
```

## Application Configuration

Configure applications to send logs with trace context to the collector.

```python
# python_loki_logs.py
import logging
from opentelemetry import trace
from opentelemetry.instrumentation.logging import LoggingInstrumentor
from opentelemetry.sdk._logs import LoggerProvider, LoggingHandler
from opentelemetry.sdk._logs.export import BatchLogRecordProcessor
from opentelemetry.exporter.otlp.proto.grpc._log_exporter import OTLPLogExporter

# Configure log export
logger_provider = LoggerProvider()
logger_provider.add_log_record_processor(
    BatchLogRecordProcessor(OTLPLogExporter(endpoint="http://localhost:4317"))
)

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
    access: proxy
    url: http://loki:3100
    jsonData:
      derivedFields:
        - datasourceUid: tempo
          matcherRegex: "trace_id=(\\w+)"
          name: TraceID
          url: "$${__value.raw}"
  
  - name: Tempo
    type: tempo
    access: proxy
    url: http://tempo:3200
    jsonData:
      tracesToLogs:
        datasourceUid: loki
        tags: ['job', 'instance']
        mappedTags: [{ key: 'service.name', value: 'service' }]
        filterByTraceID: true
```

## Querying Correlated Data

Query logs with trace context in LogQL.

```logql
# Find logs for specific trace
{service="my-app"} | json | trace_id="4bf92f3577b34da6a3ce929d0e0e4736"

# Find error logs with traces
{service="my-app"} | json | level="error" | trace_id != ""

# Count logs by trace presence
sum by (service) (count_over_time({job="my-app"} | json | trace_id != "" [1h]))
```

## Best Practices

First, always include trace_id and span_id as labels in Loki for efficient querying.

Second, configure derived fields in Grafana to enable one-click navigation from logs to traces.

Third, use structured logging with JSON format for better parsing and querying.

Fourth, set appropriate retention policies in Loki based on log volume and compliance needs.

Fifth, leverage Loki's label-based indexing to keep cardinality low and queries fast.

OpenTelemetry integration with Grafana Loki enables unified logs and traces navigation. Proper correlation configuration provides seamless troubleshooting workflows between different telemetry signals in Grafana.
