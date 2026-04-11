# How to Integrate Redis with OpenTelemetry (Traces)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, OpenTelemetry, Tracing, Observability, Distributed Tracing

Description: Learn how to instrument Redis operations with OpenTelemetry traces - covering auto-instrumentation, manual span creation, and propagating context through Redis-backed workflows.

---

Distributed tracing helps you understand how Redis operations contribute to request latency. OpenTelemetry provides vendor-neutral instrumentation for Redis clients across multiple languages. This guide shows you how to get Redis traces flowing.

## Auto-Instrumentation with Python

The `opentelemetry-instrumentation-redis` package automatically creates spans for Redis commands:

```bash
pip install opentelemetry-sdk opentelemetry-instrumentation-redis opentelemetry-exporter-otlp
```

```python
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.redis import RedisInstrumentor
import redis

# Set up tracer provider
provider = TracerProvider()
provider.add_span_processor(
    BatchSpanProcessor(OTLPSpanExporter(endpoint="http://otel-collector:4317"))
)
trace.set_tracer_provider(provider)

# Instrument Redis client
RedisInstrumentor().instrument()

# All Redis operations now produce spans automatically
client = redis.Redis(host='localhost', port=6379)
client.set("foo", "bar")
client.get("foo")
```

Each command creates a span with attributes like `db.system=redis`, `db.statement`, and `net.peer.name`.

## Auto-Instrumentation with Node.js

```bash
npm install @opentelemetry/instrumentation-ioredis @opentelemetry/sdk-node @opentelemetry/exporter-trace-otlp-grpc
```

```javascript
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { IORedisInstrumentation } = require('@opentelemetry/instrumentation-ioredis');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-grpc');

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: 'http://otel-collector:4317',
  }),
  instrumentations: [new IORedisInstrumentation()],
});

sdk.start();

// All ioredis operations are now traced
const Redis = require('ioredis');
const client = new Redis();

async function main() {
  await client.set('key', 'value');
}

main();
```

## Manual Span Creation for Batch Operations

For custom Redis workflows, create spans manually:

```python
tracer = trace.get_tracer(__name__)

def batch_fetch_users(user_ids: list):
    with tracer.start_as_current_span("redis.batch_fetch_users") as span:
        span.set_attribute("db.system", "redis")
        span.set_attribute("batch.size", len(user_ids))

        pipe = client.pipeline()
        for uid in user_ids:
            pipe.get(f"user:{uid}")

        with tracer.start_as_current_span("redis.pipeline.execute"):
            results = pipe.execute()

        span.set_attribute("cache.hits", sum(1 for r in results if r))
        return results
```

## Propagate Trace Context Through Redis Pub/Sub

When using Redis Pub/Sub for messaging, propagate trace context in the message payload:

```python
from opentelemetry.propagate import inject, extract

# Publisher - inject context
def publish_event(channel: str, payload: dict):
    with tracer.start_as_current_span("redis.publish") as span:
        carrier = {}
        inject(carrier)
        payload["_trace_context"] = carrier
        client.publish(channel, json.dumps(payload))

# Subscriber - extract context
def handle_message(message):
    data = json.loads(message["data"])
    carrier = data.pop("_trace_context", {})
    ctx = extract(carrier)

    with tracer.start_as_current_span("redis.message.process", context=ctx):
        process_event(data)
```

## Verify Traces Are Flowing

Check that spans are being exported:

```bash
# If using Jaeger
curl http://localhost:16686/api/traces?service=my-service

# If using OTLP collector, check collector logs
docker logs otel-collector | grep redis
```

## Summary

OpenTelemetry auto-instrumentation for Redis requires minimal code changes and automatically captures command-level spans with timing and error information. For custom workflows like batch operations or Pub/Sub messaging, create spans manually and propagate trace context through message payloads. This gives you end-to-end visibility into how Redis contributes to request latency across your distributed system.
