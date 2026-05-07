# How to Use Podman with Jaeger for Tracing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Jaeger, Distributed Tracing, Observability, Microservice

Description: Learn how to use Podman with Jaeger to implement distributed tracing for containerized microservices, enabling you to track requests across service boundaries.

---

> Jaeger running in Podman containers brings distributed tracing to your microservices, letting you visualize request flows, identify bottlenecks, and debug latency issues across service boundaries.

When your application consists of multiple containerized microservices, understanding how a single request flows through the system becomes challenging. Distributed tracing solves this by assigning a unique trace ID to each request and recording timing information as it passes through each service. Jaeger is one of the most popular open-source distributed tracing platforms, and running it in Podman containers makes it easy to deploy alongside your application services.

---

## Deploying Jaeger All-in-One

For development and small deployments, Jaeger provides an all-in-one configuration that includes the collector and query/UI in a single container image:

```bash
podman run -d \
  --name jaeger \
  --restart always \
  -p 16686:16686 \
  -p 4317:4317 \
  -p 4318:4318 \
  jaegertracing/jaeger:2.17.0
```

Key ports:
- `4317` - OpenTelemetry gRPC
- `4318` - OpenTelemetry HTTP
- `16686` - Jaeger UI

Access the Jaeger UI at `http://localhost:16686`.

## Instrumenting a Python Application

Add tracing to a Python Flask application:

```bash
pip install flask requests \
    opentelemetry-api opentelemetry-sdk \
    opentelemetry-exporter-otlp-proto-grpc \
    opentelemetry-instrumentation-flask \
    opentelemetry-instrumentation-requests
```

```python
# app.py

from flask import Flask, request, jsonify
import os
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.flask import FlaskInstrumentor
from opentelemetry.instrumentation.requests import RequestsInstrumentor
from opentelemetry.sdk.resources import Resource
import requests as req_lib
import time

# Configure tracing
resource = Resource.create({"service.name": os.getenv("OTEL_SERVICE_NAME", "api-gateway")})
provider = TracerProvider(resource=resource)
exporter = OTLPSpanExporter(
    endpoint=os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://jaeger:4317"),
    insecure=True,
)
provider.add_span_processor(BatchSpanProcessor(exporter))
trace.set_tracer_provider(provider)

tracer = trace.get_tracer(__name__)

app = Flask(__name__)
FlaskInstrumentor().instrument_app(app)
RequestsInstrumentor().instrument()

@app.route('/api/orders', methods=['POST'])
def create_order():
    with tracer.start_as_current_span("validate-order") as span:
        order_data = request.json
        span.set_attribute("order.items_count", len(order_data.get("items", [])))

    with tracer.start_as_current_span("check-inventory"):
        inventory_response = req_lib.get("http://inventory-service:3001/check",
            params={"items": ",".join(order_data.get("items", []))})

    with tracer.start_as_current_span("process-payment"):
        payment_response = req_lib.post("http://payment-service:3002/charge",
            json={"amount": order_data.get("total", 0)})

    with tracer.start_as_current_span("save-order") as span:
        time.sleep(0.05)  # Simulate database write
        order_id = "ORD-12345"
        span.set_attribute("order.id", order_id)

    return jsonify({"order_id": order_id, "status": "created"})

@app.route('/health')
def health():
    return jsonify({"status": "healthy"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=3000)
```

## Instrumenting a Node.js Service

Install the required packages:

```bash
npm install express @opentelemetry/api @opentelemetry/resources \
    @opentelemetry/sdk-trace-node @opentelemetry/sdk-trace-base \
    @opentelemetry/exporter-trace-otlp-grpc \
    @opentelemetry/semantic-conventions \
    @opentelemetry/instrumentation \
    @opentelemetry/instrumentation-http \
    @opentelemetry/instrumentation-express
```

```javascript
// tracing.js
const { NodeTracerProvider } = require('@opentelemetry/sdk-trace-node');
const { BatchSpanProcessor } = require('@opentelemetry/sdk-trace-base');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-grpc');
const { resourceFromAttributes } = require('@opentelemetry/resources');
const { ATTR_SERVICE_NAME } = require('@opentelemetry/semantic-conventions');
const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http');
const { ExpressInstrumentation } = require('@opentelemetry/instrumentation-express');
const { registerInstrumentations } = require('@opentelemetry/instrumentation');

const exporter = new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://jaeger:4317',
});

const provider = new NodeTracerProvider({
    resource: resourceFromAttributes({
        [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || 'inventory-service',
    }),
    spanProcessors: [new BatchSpanProcessor(exporter)],
});

provider.register();

registerInstrumentations({
    instrumentations: [
        new HttpInstrumentation(),
        new ExpressInstrumentation(),
    ],
});

module.exports = { provider };
```

```javascript
// server.js
require('./tracing');
const express = require('express');
const { trace } = require('@opentelemetry/api');

const app = express();
const tracer = trace.getTracer('inventory-service');

app.get('/check', (req, res) => {
    const span = tracer.startSpan('check-stock-levels');

    const items = (req.query.items || '').split(',').filter(Boolean);
    span.setAttribute('items.count', items.length);

    // Simulate inventory check
    const result = items.map(item => ({
        item,
        available: Math.random() > 0.1,
        quantity: Math.floor(Math.random() * 100),
    }));

    span.end();
    res.json({ inventory: result });
});

app.listen(3001, () => console.log('Inventory service on port 3001'));
```

## Multi-Service Deployment with Tracing

Deploy the complete traced application stack:

```yaml
# tracing-stack.yml
version: "3"
services:
  jaeger:
    image: jaegertracing/jaeger:2.17.0
    restart: always
    ports:
      - "16686:16686"
      - "4317:4317"
      - "4318:4318"

  api-gateway:
    build:
      context: ./api-gateway
    restart: always
    ports:
      - "3000:3000"
    environment:
      OTEL_EXPORTER_OTLP_ENDPOINT: http://jaeger:4317
      OTEL_SERVICE_NAME: api-gateway
    depends_on:
      - jaeger
      - inventory-service
      - payment-service

  inventory-service:
    build:
      context: ./inventory-service
    restart: always
    environment:
      OTEL_EXPORTER_OTLP_ENDPOINT: http://jaeger:4317
      OTEL_SERVICE_NAME: inventory-service
    depends_on:
      - jaeger

  payment-service:
    build:
      context: ./payment-service
    restart: always
    environment:
      OTEL_EXPORTER_OTLP_ENDPOINT: http://jaeger:4317
      OTEL_SERVICE_NAME: payment-service
    depends_on:
      - jaeger

  postgres:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: dbpass
```

## Production Jaeger Deployment

For production, use explicit configuration with external storage and version-pinned images:

```yaml
# jaeger-production.yml
version: "3"
services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.12.0
    restart: always
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
      - "ES_JAVA_OPTS=-Xms1g -Xmx1g"
    volumes:
      - es-data:/usr/share/elasticsearch/data

  jaeger:
    image: jaegertracing/jaeger:2.17.0
    restart: always
    ports:
      - "16686:16686"
      - "4317:4317"
      - "4318:4318"
    volumes:
      - ./jaeger-elasticsearch.yml:/jaeger/config.yml:ro,Z
    command:
      - "--config"
      - "/jaeger/config.yml"
    depends_on:
      - elasticsearch

volumes:
  es-data:
```

```yaml
# jaeger-elasticsearch.yml
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
      traces: elasticsearch_storage

  jaeger_storage:
    backends:
      elasticsearch_storage:
        elasticsearch:
          server_urls:
            - http://elasticsearch:9200

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:

exporters:
  jaeger_storage_exporter:
    trace_storage: elasticsearch_storage
```

## Querying Traces via API

Use the Jaeger query service's JSON API to query traces programmatically:

```bash
# Get all services
curl -s http://localhost:16686/api/services | jq .

# Get traces for a service
curl -s "http://localhost:16686/api/traces?service=api-gateway&limit=20" | jq .

# Get a specific trace
curl -s "http://localhost:16686/api/traces/abc123def456" | jq .

# Search traces with parameters
curl -s "http://localhost:16686/api/traces?service=api-gateway&operation=POST%20/api/orders&minDuration=100ms&limit=10" | jq .
```

## Sampling Strategies

With OpenTelemetry SDKs, sampling is typically configured in the SDK via standard environment variables:

```bash
export OTEL_TRACES_SAMPLER=parentbased_traceidratio
export OTEL_TRACES_SAMPLER_ARG=0.1
```

For more control, set different sampling ratios per service:

```yaml
api-gateway:
  environment:
    OTEL_TRACES_SAMPLER: parentbased_traceidratio
    OTEL_TRACES_SAMPLER_ARG: "0.5"

payment-service:
  environment:
    OTEL_TRACES_SAMPLER: parentbased_traceidratio
    OTEL_TRACES_SAMPLER_ARG: "1.0"
```

## Conclusion

Jaeger with Podman makes distributed tracing accessible for containerized microservice architectures. The all-in-one deployment is perfect for development, while version-pinned configurations with external storage support production use. With OpenTelemetry instrumentation libraries available for every major language, adding tracing to your services requires minimal code changes. The visibility that distributed tracing provides into request flows, latency bottlenecks, and error propagation makes it an essential tool for operating microservices reliably.
