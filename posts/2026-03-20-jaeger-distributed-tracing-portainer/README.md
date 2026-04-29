# How to Set Up Distributed Tracing with Jaeger via Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Jaeger, Distributed Tracing, Observability, Microservice

Description: Deploy Jaeger for distributed tracing via Portainer to visualize request flows across microservices, identify latency bottlenecks, and debug production issues.

## Introduction

Distributed tracing follows a request as it traverses multiple microservices, recording timing and context at each hop. When a user reports a slow request, distributed tracing shows exactly which service caused the delay and why. Jaeger is an open-source distributed tracing platform. This guide covers deploying Jaeger via Portainer and instrumenting services to send traces.

## Step 1: Deploy Jaeger All-In-One (Development)

```yaml
# docker-compose.yml - Jaeger 2.x all-in-one for development

version: "3.8"

services:
  jaeger:
    image: cr.jaegertracing.io/jaegertracing/jaeger:2.17.0
    container_name: jaeger
    restart: unless-stopped
    ports:
      - "16686:16686"   # Jaeger UI
      - "4317:4317"     # OTLP gRPC
      - "4318:4318"     # OTLP HTTP
      - "9411:9411"     # Zipkin compatible
    networks:
      - tracing_net

networks:
  tracing_net:
    driver: bridge
    name: tracing_net
```

## Step 2: Deploy Jaeger with Elasticsearch Storage (Production)

```yaml
# docker-compose.yml - Production Jaeger 2.x with Elasticsearch
version: "3.8"

services:
  jaeger:
    image: cr.jaegertracing.io/jaegertracing/jaeger:2.17.0
    container_name: jaeger
    restart: unless-stopped
    command: ["--config", "/jaeger/config-elasticsearch.yaml"]
    volumes:
      - ./config-elasticsearch.yaml:/jaeger/config-elasticsearch.yaml:ro
    ports:
      - "16686:16686"   # Jaeger UI
      - "4317:4317"     # OTLP gRPC
      - "4318:4318"     # OTLP HTTP
    networks:
      - tracing_net
    depends_on:
      elasticsearch:
        condition: service_healthy

  # Elasticsearch storage backend
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
    container_name: jaeger_elasticsearch
    restart: unless-stopped
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
      - ES_JAVA_OPTS=-Xms1g -Xmx1g
    volumes:
      - jaeger_es_data:/usr/share/elasticsearch/data
    ports:
      - "9200:9200"
    networks:
      - tracing_net
    healthcheck:
      test: ["CMD-SHELL", "curl -fsS 'http://localhost:9200/_cluster/health?wait_for_status=yellow&timeout=5s' >/dev/null || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 10

volumes:
  jaeger_es_data:

networks:
  tracing_net:
    driver: bridge
    name: tracing_net
```

```yaml
# config-elasticsearch.yaml - mounted into the Jaeger container
service:
  extensions: [jaeger_storage, jaeger_query, healthcheckv2]
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [jaeger_storage_exporter]

extensions:
  healthcheckv2:
    use_v2: true
    http:

  jaeger_query:
    storage:
      traces: main_store
      metrics: main_store
    ui:
      config_file: ./cmd/jaeger/config-ui.json

  jaeger_storage:
    backends:
      main_store:
        elasticsearch:
          server_urls:
            - http://elasticsearch:9200
          indices:
            index_prefix: "jaeger"
            spans:
              date_layout: "2006-01-02"
              rollover_frequency: "day"
              shards: 1
              replicas: 0
            services:
              date_layout: "2006-01-02"
              rollover_frequency: "day"
              shards: 1
              replicas: 0
            dependencies:
              date_layout: "2006-01-02"
              rollover_frequency: "day"
              shards: 1
              replicas: 0
            sampling:
              date_layout: "2006-01-02"
              rollover_frequency: "day"
              shards: 1
              replicas: 0
    metric_backends:
      main_store:
        elasticsearch:
          server_urls:
            - http://elasticsearch:9200
          indices:
            index_prefix: "jaeger"
            spans:
              date_layout: "2006-01-02"
              rollover_frequency: "day"
              shards: 1
              replicas: 0
            services:
              date_layout: "2006-01-02"
              rollover_frequency: "day"
              shards: 1
              replicas: 0
            dependencies:
              date_layout: "2006-01-02"
              rollover_frequency: "day"
              shards: 1
              replicas: 0
            sampling:
              date_layout: "2006-01-02"
              rollover_frequency: "day"
              shards: 1
              replicas: 0

receivers:
  otlp:
    protocols:
      grpc:
      http:
        endpoint: "0.0.0.0:4318"

processors:
  batch:

exporters:
  jaeger_storage_exporter:
    trace_storage: main_store
```

## Step 3: Instrument a Python FastAPI Service

```python
# main.py - FastAPI with OpenTelemetry tracing to Jaeger
import os

from fastapi import FastAPI
from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.sdk.resources import Resource
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
import httpx

# Configure tracing
resource = Resource.create({
    "service.name": os.getenv("OTEL_SERVICE_NAME", "user-service"),
    "service.version": "1.0.0",
    "deployment.environment.name": "production"
})

provider = TracerProvider(resource=resource)
provider.add_span_processor(
    BatchSpanProcessor(
        OTLPSpanExporter(
            endpoint=os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://jaeger:4317"),
            insecure=True
        )
    )
)
trace.set_tracer_provider(provider)

app = FastAPI()
# Auto-instrument FastAPI (traces all requests)
FastAPIInstrumentor.instrument_app(app)
# Auto-instrument outgoing HTTP calls
HTTPXClientInstrumentor().instrument()

tracer = trace.get_tracer(__name__)

@app.get("/users/{user_id}")
async def get_user(user_id: str):
    # Custom span for business logic
    with tracer.start_as_current_span("fetch_user_from_db") as span:
        span.set_attribute("user.id", user_id)
        span.set_attribute("db.system.name", "postgresql")

        # Simulate database call
        user = {"id": user_id, "name": "Alice"}
        span.set_attribute("db.response.returned_rows", 1)

        return user

@app.get("/users/{user_id}/orders")
async def get_user_orders(user_id: str):
    with tracer.start_as_current_span("get_user_orders") as span:
        span.set_attribute("user.id", user_id)

        # Call another service - trace propagates automatically
        async with httpx.AsyncClient() as client:
            response = await client.get(f"http://order-service/orders?user={user_id}")

        orders = response.json()
        span.set_attribute("orders.count", len(orders))
        return orders
```

## Step 4: Instrument a Node.js Service

```javascript
// tracing.js - Initialize before other imports
const process = require("process");
const { NodeSDK } = require("@opentelemetry/sdk-node");
const {
  OTLPTraceExporter,
} = require("@opentelemetry/exporter-trace-otlp-grpc");
const {
  getNodeAutoInstrumentations,
} = require("@opentelemetry/auto-instrumentations-node");
const { resourceFromAttributes } = require("@opentelemetry/resources");
const { ATTR_SERVICE_NAME } = require("@opentelemetry/semantic-conventions");

const exporterUrl = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://jaeger:4317";
const serviceName = process.env.OTEL_SERVICE_NAME || "order-service";

const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: serviceName,
    "service.version": "2.0.0",
    "deployment.environment.name": "production",
  }),
  traceExporter: new OTLPTraceExporter({
    url: exporterUrl,
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      "@opentelemetry/instrumentation-express": { enabled: true },
      "@opentelemetry/instrumentation-http": { enabled: true },
      "@opentelemetry/instrumentation-pg": { enabled: true },
    }),
  ],
});

sdk.start();
process.on("SIGTERM", () => {
  sdk.shutdown()
    .catch((error) => console.error("Error terminating tracing", error))
    .finally(() => process.exit(0));
});
```

## Step 5: Deploy Instrumented Services

```yaml
# docker-compose.yml - Instrumented microservices
version: "3.8"

services:
  user-service:
    image: myapp/user-service:latest
    environment:
      - OTEL_EXPORTER_OTLP_ENDPOINT=http://jaeger:4317
      - OTEL_SERVICE_NAME=user-service
      - OTEL_TRACES_SAMPLER=parentbased_traceidratio
      - OTEL_TRACES_SAMPLER_ARG=0.1    # Sample 10% in production
    networks:
      - app_net
      - tracing_net

  order-service:
    image: myapp/order-service:latest
    environment:
      - OTEL_EXPORTER_OTLP_ENDPOINT=http://jaeger:4317
      - OTEL_SERVICE_NAME=order-service
      - OTEL_TRACES_SAMPLER=parentbased_traceidratio
      - OTEL_TRACES_SAMPLER_ARG=0.1
    networks:
      - app_net
      - tracing_net

networks:
  app_net:
    driver: bridge
  tracing_net:
    external: true
```

## Step 6: Use Jaeger UI to Investigate Traces

```bash
# Open Jaeger UI in your browser:
# http://localhost:16686

# Find traces from user-service over a time window using Jaeger's v3 HTTP API
curl -sG "http://localhost:16686/api/v3/traces" \
  --data-urlencode "query.service_name=user-service" \
  --data-urlencode "query.start_time_min=START_TIME_RFC3339" \
  --data-urlencode "query.start_time_max=END_TIME_RFC3339" \
  --data-urlencode "query.duration_min=1s" \
  --data-urlencode "query.num_traces=20" | \
  jq -r '[.result.resourceSpans[].scopeSpans[].spans[].traceId] | unique[]'

# Get a specific trace
curl -s "http://localhost:16686/api/v3/traces/YOUR_TRACE_ID" | \
  jq '.result.resourceSpans[].scopeSpans[].spans[] | {name, traceId, spanId, parentSpanId}'
```

## Conclusion

Jaeger transforms debugging distributed systems from "which service caused this?" to "I can see exactly where the 2-second delay happened and why." The combination of automatic instrumentation (via OpenTelemetry SDK) for HTTP, database, and message queue calls with custom spans for business logic provides complete trace coverage. Deploy Jaeger 2.x all-in-one for development and Jaeger 2.x with Elasticsearch storage for production. Portainer manages both the tracing infrastructure and the instrumented application services from a single dashboard, making it easy to roll out new service versions with updated instrumentation.
