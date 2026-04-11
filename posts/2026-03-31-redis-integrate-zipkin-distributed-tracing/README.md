# How to Integrate Redis with Zipkin for Distributed Tracing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Zipkin, Distributed Tracing, Observability, OpenTelemetry

Description: Learn how to send Redis operation traces to Zipkin using OpenTelemetry - covering setup, configuration, auto-instrumentation, and trace analysis in the Zipkin UI.

---

Zipkin is a popular open-source distributed tracing system that helps you investigate Redis-related latency in your application. By using OpenTelemetry with the Zipkin exporter, you can visualize Redis operations as spans within full request traces.

## Deploy Zipkin

Start Zipkin locally with Docker:

```bash
docker run -d --name zipkin \
  -p 9411:9411 \
  openzipkin/zipkin:latest
```

Access the Zipkin UI at `http://localhost:9411`.

## Install Dependencies

```bash
pip install opentelemetry-sdk \
  opentelemetry-instrumentation-redis \
  opentelemetry-exporter-zipkin
```

## Configure OpenTelemetry with Zipkin Exporter

```python
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.zipkin.json import ZipkinExporter
from opentelemetry.sdk.resources import Resource
from opentelemetry.instrumentation.redis import RedisInstrumentor

resource = Resource.create({
    "service.name": "product-service",
    "service.version": "2.1.0"
})

zipkin_exporter = ZipkinExporter(
    endpoint="http://localhost:9411/api/v2/spans"
)

provider = TracerProvider(resource=resource)
provider.add_span_processor(BatchSpanProcessor(zipkin_exporter))
trace.set_tracer_provider(provider)

# Auto-instrument Redis - all commands create spans
RedisInstrumentor().instrument()
```

## Create Traced Request Handlers

```python
import redis
import json

tracer = trace.get_tracer(__name__)
client = redis.Redis(host='localhost', port=6379, decode_responses=True)

def get_product(product_id: str):
    with tracer.start_as_current_span("http.get_product") as span:
        span.set_attribute("product.id", product_id)

        # Redis GET - creates a child span in Zipkin automatically
        cached = client.get(f"product:{product_id}")
        if cached:
            return json.loads(cached)

        product = fetch_product_from_db(product_id)

        # Redis SET - also creates a child span
        client.setex(f"product:{product_id}", 600, json.dumps(product))
        return product
```

## Use the OTel Collector for Production

The Zipkin exporter works directly, but for production route through the OTel Collector:

```yaml
# otel-collector.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

exporters:
  zipkin:
    endpoint: "http://zipkin:9411/api/v2/spans"
    format: proto

service:
  pipelines:
    traces:
      receivers: [otlp]
      exporters: [zipkin]
```

Update your application to export to the collector instead:

```python
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter

provider.add_span_processor(
    BatchSpanProcessor(
        OTLPSpanExporter(endpoint="http://otel-collector:4317", insecure=True)
    )
)
```

## Analyze Traces in Zipkin UI

To find Redis operations in Zipkin:
1. Go to `http://localhost:9411`
2. Search by service name
3. Filter by span name `GET` or `SET`
4. Click any trace to see the full request timeline

Zipkin displays Redis spans with timing data showing exact command duration. Look for spans where Redis accounts for more than 20ms in a request - this often indicates a missing index, a large payload, or network issues.

## Common Redis Span Attributes in Zipkin

```text
span.name:     GET
db.system:     redis
db.statement:  GET ?
net.peer.name: localhost
net.peer.port: 6379
```

## Summary

Integrating Redis with Zipkin via OpenTelemetry takes just a few lines of setup code. Auto-instrumentation handles all span creation for Redis commands, and the Zipkin UI provides a clear timeline view of how Redis contributes to request latency. For production, route spans through the OTel Collector to decouple your application from the tracing backend and enable easy switching between observability tools.
