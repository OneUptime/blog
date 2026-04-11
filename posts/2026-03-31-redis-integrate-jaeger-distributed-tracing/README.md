# How to Integrate Redis with Jaeger for Distributed Tracing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Jaeger, Distributed Tracing, Observability, OpenTelemetry

Description: Learn how to send Redis operation traces to Jaeger using OpenTelemetry - covering setup, auto-instrumentation, trace visualization, and service dependency mapping.

---

Jaeger is an open-source distributed tracing system that helps you visualize Redis operation latency within your request flows. By integrating Redis with Jaeger via OpenTelemetry, you get end-to-end visibility into how cache operations affect your application performance.

## Deploy Jaeger (All-in-One for Development)

Start Jaeger locally using Docker:

```bash
docker run -d --name jaeger \
  -p 6831:6831/udp \
  -p 16686:16686 \
  -p 14268:14268 \
  -p 4317:4317 \
  jaegertracing/all-in-one:latest \
  --collector.otlp.enabled=true
```

Access the Jaeger UI at `http://localhost:16686`.

## Configure OpenTelemetry to Export to Jaeger

Use the OTLP exporter to send traces to Jaeger (Jaeger 1.35+ accepts OTLP directly):

```python
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource
from opentelemetry.instrumentation.redis import RedisInstrumentor

resource = Resource.create({
    "service.name": "user-service",
    "service.version": "1.0.0"
})

provider = TracerProvider(resource=resource)
provider.add_span_processor(
    BatchSpanProcessor(
        OTLPSpanExporter(endpoint="http://localhost:4317", insecure=True)
    )
)
trace.set_tracer_provider(provider)

# Auto-instrument Redis
RedisInstrumentor().instrument()
```

## Instrument Your Application

With auto-instrumentation active, create parent spans for your business operations:

```python
import json
import redis

tracer = trace.get_tracer(__name__)
client = redis.Redis(host='localhost', port=6379, decode_responses=True)

def get_user_profile(user_id: str):
    with tracer.start_as_current_span("get_user_profile") as span:
        span.set_attribute("user.id", user_id)

        # This Redis GET call auto-creates a child span
        cached = client.get(f"user:{user_id}")

        if cached:
            span.set_attribute("cache.hit", True)
            return json.loads(cached)

        span.set_attribute("cache.hit", False)

        # DB fetch also instrumented
        user = fetch_from_db(user_id)
        client.setex(f"user:{user_id}", 3600, json.dumps(user))
        return user
```

In Jaeger, you will see `get_user_profile` as the parent span with a child `SET` or `GET` span showing exact Redis latency.

## Use the OpenTelemetry Collector as a Pipeline

For production, use the OTel Collector as an intermediary:

```yaml
# otel-collector.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

exporters:
  otlp/jaeger:
    endpoint: jaeger:4317
    tls:
      insecure: true

service:
  pipelines:
    traces:
      receivers: [otlp]
      exporters: [otlp/jaeger]
```

This decouples your application from Jaeger, making it easy to add additional exporters later.

## Analyze Redis Traces in Jaeger UI

In the Jaeger UI:
1. Select your service from the dropdown
2. Filter by operation name `GET` or `SET`
3. Look for high-duration spans indicating slow Redis operations

Key span attributes to look for:

```text
db.system = redis
db.statement = GET ?
net.peer.name = localhost
net.peer.port = 6379
span.duration = 2.4ms
```

## Summary

Integrating Redis with Jaeger via OpenTelemetry requires minimal code - auto-instrumentation handles span creation for every Redis command. Deploy Jaeger with OTLP support enabled, configure the OTLP exporter in your application, and use the Jaeger UI to analyze Redis latency within full request traces. The service dependency graph in Jaeger also shows which services are making Redis calls and their error rates.
