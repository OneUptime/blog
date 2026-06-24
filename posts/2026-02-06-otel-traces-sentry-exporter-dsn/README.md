# How to Send OpenTelemetry Traces to Sentry via the Sentry Exporter

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Sentry, Trace, Error Tracking

Description: Configure the OpenTelemetry Collector to export traces to Sentry using the Sentry exporter with DSN-based authentication.

Sentry is primarily known for error tracking, but it also supports distributed tracing. The OpenTelemetry Collector has a dedicated Sentry exporter that forwards OpenTelemetry traces to Sentry's native OTLP ingestion endpoints. This lets you use OpenTelemetry instrumentation across your services while viewing traces in the Sentry performance monitoring UI.

## What the Sentry Exporter Does

The Sentry exporter forwards OTLP trace data to Sentry without transforming the payload. It routes telemetry to Sentry projects based on a resource attribute, using `service.name` by default, and uses the Sentry Management API to discover the right OTLP ingestion endpoint for each project.

## Getting Your Sentry Auth Token

Create a Sentry authentication token with access to the Sentry Management API. Basic exporter functionality requires `project:read` and `org:read`. If you want the exporter to create missing projects automatically, the token also needs `project:write`.

You also need your Sentry organization slug and one or more Sentry project slugs. By default, the exporter uses the OpenTelemetry `service.name` resource attribute as the Sentry project slug. If your service names do not match project slugs, configure an explicit mapping.

```text
SENTRY_AUTH_TOKEN=sntrys_YOUR_TOKEN_HERE
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
    url: "https://sentry.io"
    org_slug: "my-organization"
    auth_token: "${env:SENTRY_AUTH_TOKEN}"
    routing:
      project_from_attribute: "service.name"
      attribute_to_project_mapping:
        api-service: "backend-api"
    http:
      tls:
        insecure_skip_verify: false

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [resource, batch]
      exporters: [sentry]
```

The required exporter settings are `url`, `org_slug`, and `auth_token`. The routing block is optional, but it is useful when your OpenTelemetry service names do not exactly match Sentry project slugs.

## How Spans Map to Sentry Transactions

Sentry has a concept of "transactions" which represent top-level operations, and "spans" within those transactions. The Sentry exporter sends OTLP traces as-is to Sentry's OTLP ingestion endpoint, so the important OpenTelemetry model still applies:

- Root spans represent the top-level operation in a trace
- Child spans represent nested work within that trace
- `span.name` describes the operation
- `span.status` records whether the operation completed successfully
- Span attributes carry structured context for the operation

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

# This root span represents the top-level operation
def handle_request(request):
    with tracer.start_as_current_span("HTTP GET /api/users") as span:
        span.set_attribute("http.method", "GET")
        span.set_attribute("http.url", "/api/users")
        span.set_attribute("http.status_code", 200)

        # This child span represents nested work within the trace
        with tracer.start_as_current_span("db.query") as db_span:
            db_span.set_attribute("db.system", "postgresql")
            db_span.set_attribute("db.statement", "SELECT * FROM users")
            users = query_database()

        return users
```

In Sentry's Performance tab, you will see "HTTP GET /api/users" as the top-level operation with a "db.query" child span.

## Combining Sentry with Other Backends

A common pattern is exporting traces to both Sentry (for error tracking integration) and another backend (for full trace analysis):

```yaml
exporters:
  sentry:
    url: "https://sentry.io"
    org_slug: "my-organization"
    auth_token: "${env:SENTRY_AUTH_TOKEN}"
    routing:
      attribute_to_project_mapping:
        api-service: "backend-api"

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

This sends all traces to both Sentry and Jaeger. Sentry gives you trace views connected to Sentry projects, while Jaeger gives you full distributed trace exploration.

## Handling Error Spans

When a span has an error status, Sentry can display that status as part of the trace. To properly mark errors:

```python
from opentelemetry.trace import Status, StatusCode

with tracer.start_as_current_span("process_payment") as span:
    try:
        result = charge_card(amount)
    except PaymentError as e:
        # Set span status to ERROR
        span.set_status(Status(StatusCode.ERROR, str(e)))
        # Record the exception as a span event
        span.record_exception(e)
        raise
```

The `record_exception` call adds exception details as a span event. If you also use a Sentry SDK for application error events, use Sentry's OpenTelemetry integration settings so errors and traces stay connected.

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

1. **Invalid auth token or scopes**: Verify the token and required `org:read` and `project:read` scopes
2. **Network connectivity**: Ensure the Collector can reach the Sentry API and the Sentry OTLP ingest host on port 443
3. **Missing service.name**: The exporter routes by `service.name` by default, so resources without that attribute are dropped
4. **Batch timeout**: If you send very few traces, increase the batch timeout or decrease the batch size to see results faster

Enable Collector debug logging to see the export requests and any error responses from Sentry.
