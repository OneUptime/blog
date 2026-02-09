# How to Run Grafana Tempo in Docker for Trace Storage

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Grafana Tempo, Tracing, Observability, OpenTelemetry, DevOps

Description: Deploy Grafana Tempo in Docker for distributed trace storage and querying with OpenTelemetry and Grafana integration.

---

Grafana Tempo is a high-volume, cost-effective distributed tracing backend. It only requires object storage to function, which makes it significantly cheaper to run than alternatives like Jaeger or Zipkin that need a database like Cassandra or Elasticsearch. Tempo integrates seamlessly with Grafana for trace visualization, and it accepts traces from all major tracing protocols including OpenTelemetry, Jaeger, and Zipkin.

Tempo stores traces in a columnar format on object storage (or local disk for development) and provides fast trace lookups by ID. Combined with TraceQL, Tempo's query language, you can search traces by attributes like service name, duration, and custom span attributes.

## Quick Start

Run Tempo in standalone mode for local development:

```bash
# Start Tempo with local file storage
docker run -d \
  --name tempo \
  -p 3200:3200 \
  -p 4317:4317 \
  -p 4318:4318 \
  -v tempo_data:/var/tempo \
  grafana/tempo:latest \
  -config.file=/etc/tempo/tempo.yaml
```

However, Tempo needs a configuration file. Let's set it up properly with Docker Compose.

## Docker Compose with Grafana

Here is a complete setup with Tempo, Grafana, and an OpenTelemetry Collector:

```yaml
# docker-compose.yml - Tempo tracing stack
version: "3.8"

services:
  tempo:
    image: grafana/tempo:latest
    command: ["-config.file=/etc/tempo.yaml"]
    ports:
      # Tempo API and query frontend
      - "3200:3200"
      # OpenTelemetry gRPC
      - "4317:4317"
      # OpenTelemetry HTTP
      - "4318:4318"
      # Zipkin compatible endpoint
      - "9411:9411"
    volumes:
      - ./tempo.yaml:/etc/tempo.yaml
      - tempo_data:/var/tempo
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      GF_AUTH_ANONYMOUS_ENABLED: "true"
      GF_AUTH_ANONYMOUS_ORG_ROLE: Admin
      GF_AUTH_DISABLE_LOGIN_FORM: "true"
    volumes:
      - ./grafana-datasources.yaml:/etc/grafana/provisioning/datasources/datasources.yaml
      - grafana_data:/var/lib/grafana
    depends_on:
      - tempo

volumes:
  tempo_data:
  grafana_data:
```

## Tempo Configuration

Create the Tempo configuration file:

```yaml
# tempo.yaml - Tempo configuration for local development
stream_over_http_enabled: true
server:
  http_listen_port: 3200

# Accept traces from multiple protocols
distributor:
  receivers:
    otlp:
      protocols:
        grpc:
          endpoint: "0.0.0.0:4317"
        http:
          endpoint: "0.0.0.0:4318"
    zipkin:
      endpoint: "0.0.0.0:9411"
    jaeger:
      protocols:
        thrift_http:
          endpoint: "0.0.0.0:14268"
        grpc:
          endpoint: "0.0.0.0:14250"

# Ingester configuration for batching traces before storage
ingester:
  max_block_duration: 5m

# Compactor reduces storage size by merging small blocks
compactor:
  compaction:
    block_retention: 48h

# Metrics generator creates span metrics from traces
metrics_generator:
  registry:
    external_labels:
      source: tempo
      cluster: docker
  storage:
    path: /var/tempo/generator/wal
    remote_write:
      - url: http://prometheus:9090/api/v1/write
        send_exemplars: true

# Storage backend configuration
storage:
  trace:
    backend: local
    wal:
      path: /var/tempo/wal
    local:
      path: /var/tempo/blocks

# Enable TraceQL search
querier:
  search:
    query_timeout: 30s

# Override defaults for single-node deployment
overrides:
  defaults:
    search:
      duration_type: TRACE_DURATION
    metrics_generator:
      processors: [service-graphs, span-metrics]
```

## Grafana Data Source Configuration

Configure Grafana to connect to Tempo automatically:

```yaml
# grafana-datasources.yaml - Auto-provision Tempo as a data source
apiVersion: 1

datasources:
  - name: Tempo
    type: tempo
    access: proxy
    url: http://tempo:3200
    isDefault: true
    jsonData:
      httpMethod: GET
      tracesToLogsV2:
        datasourceUid: 'loki'
        spanStartTimeShift: '-1h'
        spanEndTimeShift: '1h'
        filterByTraceID: true
        filterBySpanID: false
      serviceMap:
        datasourceUid: 'prometheus'
      nodeGraph:
        enabled: true
      search:
        hide: false
      traceQuery:
        timeShiftEnabled: true
        spanStartTimeShift: '1h'
        spanEndTimeShift: '-1h'
```

## Sending Traces

### Using OpenTelemetry SDK (Python)

```python
# app.py - Python application instrumented with OpenTelemetry
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource
import time
import random

# Configure the tracer to send traces to Tempo
resource = Resource.create({"service.name": "order-service"})
provider = TracerProvider(resource=resource)

# Export traces to Tempo via OTLP gRPC
exporter = OTLPSpanExporter(endpoint="http://localhost:4317", insecure=True)
provider.add_span_processor(BatchSpanProcessor(exporter))
trace.set_tracer_provider(provider)

tracer = trace.get_tracer("order-service")

def process_order(order_id):
    """Simulate order processing with nested spans."""
    with tracer.start_as_current_span("process_order") as span:
        span.set_attribute("order.id", order_id)
        span.set_attribute("order.source", "web")

        # Validate the order
        with tracer.start_as_current_span("validate_order"):
            time.sleep(random.uniform(0.01, 0.05))

        # Charge payment
        with tracer.start_as_current_span("charge_payment") as payment_span:
            payment_span.set_attribute("payment.method", "credit_card")
            time.sleep(random.uniform(0.1, 0.3))

        # Send confirmation email
        with tracer.start_as_current_span("send_confirmation"):
            time.sleep(random.uniform(0.02, 0.08))

# Generate some test traces
for i in range(20):
    process_order(f"ORD-{i:04d}")
    time.sleep(0.5)

print("Traces sent to Tempo")
```

### Using OpenTelemetry SDK (Node.js)

```javascript
// tracing.js - Node.js OpenTelemetry setup
const { NodeTracerProvider } = require('@opentelemetry/sdk-trace-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-grpc');
const { BatchSpanProcessor } = require('@opentelemetry/sdk-trace-base');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');

// Configure the tracer provider
const provider = new NodeTracerProvider({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'api-gateway',
  }),
});

// Send traces to Tempo
const exporter = new OTLPTraceExporter({
  url: 'http://localhost:4317',
});

provider.addSpanProcessor(new BatchSpanProcessor(exporter));
provider.register();

console.log('Tracing initialized - sending to Tempo');
```

## Sending Traces via curl (Zipkin format)

For quick testing without any SDK:

```bash
# Send a trace using the Zipkin API
curl -X POST http://localhost:9411/api/v2/spans \
  -H "Content-Type: application/json" \
  -d '[
    {
      "traceId": "5982fe77008310cc80f1da5e10147519",
      "id": "90394f6bcff0cc70",
      "name": "http.request",
      "timestamp": 1705312200000000,
      "duration": 150000,
      "localEndpoint": { "serviceName": "api-gateway" },
      "tags": { "http.method": "GET", "http.url": "/api/orders" }
    },
    {
      "traceId": "5982fe77008310cc80f1da5e10147519",
      "parentId": "90394f6bcff0cc70",
      "id": "a1b2c3d4e5f60000",
      "name": "db.query",
      "timestamp": 1705312200050000,
      "duration": 80000,
      "localEndpoint": { "serviceName": "order-service" },
      "tags": { "db.type": "postgresql", "db.statement": "SELECT * FROM orders" }
    }
  ]'
```

## Querying Traces with TraceQL

TraceQL is Tempo's query language for searching traces by attributes:

```bash
# Find traces from a specific service
curl "http://localhost:3200/api/search?q=%7Bresource.service.name%3D%22order-service%22%7D"

# Find slow traces (duration > 1 second)
curl "http://localhost:3200/api/search?q=%7Bduration%3E1s%7D"

# Search by span name and attribute
# TraceQL: { span.http.status_code >= 500 }
curl "http://localhost:3200/api/search?q=%7Bspan.http.status_code+%3E%3D+500%7D"

# Fetch a specific trace by ID
curl "http://localhost:3200/api/traces/5982fe77008310cc80f1da5e10147519"
```

In Grafana, navigate to Explore, select the Tempo data source, and use the TraceQL tab for interactive trace searching.

## Full Observability Stack

Combine Tempo with Loki for logs and Prometheus for metrics:

```yaml
# docker-compose.yml - Complete observability stack
version: "3.8"

services:
  tempo:
    image: grafana/tempo:latest
    command: ["-config.file=/etc/tempo.yaml"]
    ports:
      - "3200:3200"
      - "4317:4317"
      - "4318:4318"
    volumes:
      - ./tempo.yaml:/etc/tempo.yaml
      - tempo_data:/var/tempo

  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yaml:/etc/prometheus/prometheus.yml
    command:
      - --config.file=/etc/prometheus/prometheus.yml
      - --enable-feature=exemplar-storage
      - --web.enable-remote-write-receiver

  loki:
    image: grafana/loki:latest
    ports:
      - "3100:3100"

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      GF_AUTH_ANONYMOUS_ENABLED: "true"
      GF_AUTH_ANONYMOUS_ORG_ROLE: Admin
    volumes:
      - ./grafana-datasources.yaml:/etc/grafana/provisioning/datasources/datasources.yaml

volumes:
  tempo_data:
```

## Summary

Grafana Tempo provides a cost-effective distributed tracing backend that scales with object storage. Its multi-protocol support means you can send traces from any instrumentation library, and TraceQL gives you powerful search capabilities across your trace data. The tight Grafana integration allows you to correlate traces with logs and metrics in a single dashboard. For teams already using Grafana for monitoring, Tempo is the natural choice for adding distributed tracing to your observability stack. Start with the Docker Compose setup to explore trace data locally, then migrate to S3 or GCS storage for production.
