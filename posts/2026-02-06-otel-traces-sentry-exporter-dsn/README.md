# How to Send OpenTelemetry Traces to Sentry via the Sentry Exporter with DSN Configuration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Sentry, Traces, Error Tracking

Description: Configure the OpenTelemetry Collector to export traces to Sentry using the Sentry exporter with DSN-based authentication.

Sentry is primarily known for error tracking, but it also supports distributed tracing. The OpenTelemetry Collector has a dedicated Sentry exporter that converts OpenTelemetry spans into Sentry transactions and sends them using a DSN (Data Source Name). This lets you use OpenTelemetry instrumentation across your services while viewing traces in the Sentry performance monitoring UI.

## What the Sentry Exporter Does

The Sentry exporter translates OpenTelemetry span data into Sentry's transaction format. It maps span attributes to Sentry tags, preserves the trace hierarchy, and uses the Sentry DSN for routing and authentication. Error spans are automatically linked to Sentry issues when possible.

## Getting Your Sentry DSN

In Sentry, navigate to Settings > Projects > [Your Project] > Client Keys (DSN). Copy the DSN string. It looks like:

```
https://examplePublicKey@o0.ingest.sentry.io/0
```

## Collector Configuration

```yaml
# otel-collector-config.yaml

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    send_batch_size: 256
    timeout: 5s

  resource:
    attributes:
      - key: service.name
        value: "api-service"
        action: upsert

exporters:
  sentry:
    dsn: "${SENTRY_DSN}"
    # Optional: set the Sentry environment
    environment: "production"
    # Optional: include OpenTelemetry span attributes as Sentry tags
    insecure_skip_verify: false

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [resource, batch]
      exporters: [sentry]
```

That is the minimal configuration. The `dsn` field is the only required setting for the Sentry exporter.

## How Spans Map to Sentry Transactions

Sentry has a concept of "transactions" which represent top-level operations, and "spans" within those transactions. The mapping from OpenTelemetry works like this:

- Root spans (spans with no parent) become Sentry transactions
- Child spans become Sentry spans within the parent transaction
- `span.name` becomes the Sentry transaction/span description
- `span.status` maps to Sentry's status codes
- Span attributes become Sentry tags

Here is what an instrumented application looks like:

```python
# app.py
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource

resource = Resource.create({
    "service.name": "api-service",
    "deployment.environment": "production",
})

provider = TracerProvider(resource=resource)
provider.add_span_processor(
    BatchSpanProcessor(OTLPSpanExporter(endpoint="http://localhost:4317", insecure=True))
)
trace.set_tracer_provider(provider)

tracer = trace.get_tracer("api-service")

# This root span becomes a Sentry transaction
def handle_request(request):
    with tracer.start_as_current_span("HTTP GET /api/users") as span:
        span.set_attribute("http.method", "GET")
        span.set_attribute("http.url", "/api/users")
        span.set_attribute("http.status_code", 200)

        # This child span becomes a Sentry span within the transaction
        with tracer.start_as_current_span("db.query") as db_span:
            db_span.set_attribute("db.system", "postgresql")
            db_span.set_attribute("db.statement", "SELECT * FROM users")
            users = query_database()

        return users
```

In Sentry's Performance tab, you will see "HTTP GET /api/users" as a transaction with a "db.query" child span.

## Combining Sentry with Other Backends

A common pattern is exporting traces to both Sentry (for error tracking integration) and another backend (for full trace analysis):

```yaml
exporters:
  sentry:
    dsn: "${SENTRY_DSN}"
    environment: "production"

  otlp/jaeger:
    endpoint: jaeger-collector:4317
    tls:
      insecure: true

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [resource, batch]
      exporters: [sentry, otlp/jaeger]
```

This sends all traces to both Sentry and Jaeger. Sentry gives you error-centric trace views, while Jaeger gives you full distributed trace exploration.

## Handling Error Spans

When a span has an error status, the Sentry exporter creates both a transaction and an associated Sentry event. To properly mark errors:

```python
from opentelemetry.trace import StatusCode

with tracer.start_as_current_span("process_payment") as span:
    try:
        result = charge_card(amount)
    except PaymentError as e:
        # Set span status to ERROR so Sentry captures it
        span.set_status(StatusCode.ERROR, str(e))
        # Record the exception as a span event
        span.record_exception(e)
        raise
```

The `record_exception` call adds the stack trace as a span event, which the Sentry exporter converts into a proper Sentry exception with full traceback.

## Sampling Configuration

Sentry has its own sampling mechanism, but you can also control sampling at the Collector level:

```yaml
processors:
  # Tail-based sampling: always keep error traces
  tail_sampling:
    decision_wait: 10s
    policies:
      - name: keep-errors
        type: status_code
        status_code:
          status_codes: [ERROR]
      - name: sample-rest
        type: probabilistic
        probabilistic:
          sampling_percentage: 10
```

This keeps all error traces (which are most useful in Sentry) while sampling 10% of successful traces.

## Troubleshooting

If traces do not appear in Sentry, check these common issues:

1. **Invalid DSN**: Verify the DSN format and that the project exists
2. **Network connectivity**: Ensure the Collector can reach `ingest.sentry.io` on port 443
3. **Missing service.name**: Sentry groups transactions by service, so this attribute should always be set
4. **Batch timeout**: If you send very few traces, increase the batch timeout or decrease the batch size to see results faster

Enable Collector debug logging to see the export requests and any error responses from Sentry.
