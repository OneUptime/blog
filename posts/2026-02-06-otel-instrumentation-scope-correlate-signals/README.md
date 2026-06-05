# How to Use Instrumentation Scope to Group and Correlate Telemetry by Library

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Instrumentation Scope, Telemetry Grouping, Libraries

Description: Use OpenTelemetry instrumentation scopes to group and correlate telemetry data by library name and version across all signal types.

When your application uses multiple instrumented libraries (HTTP client, database driver, cache client, message queue), all their telemetry lands in the same pipeline. Without instrumentation scope, you cannot tell which library produced which spans, metrics, or logs. Instrumentation scope tags every piece of telemetry with the name and version of the library that created it, giving you a powerful axis for filtering, grouping, and correlating signals.

## What Is Instrumentation Scope?

Every tracer, meter, and logger in OpenTelemetry is created with a name and version that identifies the instrumentation library or application component:

```python
# Python: creating scoped instruments

from opentelemetry import trace, metrics
from opentelemetry._logs import get_logger
import logging

# Each component gets its own tracer with a distinct scope
http_tracer = trace.get_tracer(
    "com.example.http-client",
    "1.2.0",
    schema_url="https://opentelemetry.io/schemas/1.21.0"
)

db_tracer = trace.get_tracer(
    "com.example.database",
    "2.0.1"
)

# Same for meters
http_meter = metrics.get_meter(
    "com.example.http-client",
    "1.2.0"
)

db_meter = metrics.get_meter(
    "com.example.database",
    "2.0.1"
)

# And OpenTelemetry loggers
http_logger = get_logger("com.example.http-client", "1.2.0")
db_logger = get_logger("com.example.database", "2.0.1")

# If you bridge Python's standard logging module to OpenTelemetry,
# the Python logger name is recorded as the instrumentation scope name.
python_http_logger = logging.getLogger("com.example.http-client")
python_db_logger = logging.getLogger("com.example.database")
```

Every span created by `http_tracer` carries the instrumentation scope `{name: "com.example.http-client", version: "1.2.0"}`. Every metric from `db_meter` carries `{name: "com.example.database", version: "2.0.1"}`.

## How Instrumentation Scope Appears in Telemetry

In the OTLP data model, telemetry is grouped by instrumentation scope. A simplified OTLP-shaped payload looks like this:

```json
{
  "resourceSpans": [{
    "resource": {
      "attributes": [{"key": "service.name", "value": "order-service"}]
    },
    "scopeSpans": [
      {
        "scope": {
          "name": "com.example.http-client",
          "version": "1.2.0"
        },
        "spans": [
          {"name": "GET /api/products", "...": "..."},
          {"name": "POST /api/orders", "...": "..."}
        ]
      },
      {
        "scope": {
          "name": "com.example.database",
          "version": "2.0.1"
        },
        "spans": [
          {"name": "SELECT products", "...": "..."},
          {"name": "INSERT orders", "...": "..."}
        ]
      }
    ]
  }]
}
```

## Java: Instrumentation Scope with Auto-Instrumentation

The OpenTelemetry Java agent automatically sets instrumentation scope for each library it instruments:

```text
Scope: io.opentelemetry.spring-webmvc-6.0 (version: 2.2.0-alpha)
  -> spans from Spring MVC controller handling

Scope: io.opentelemetry.jdbc (version: 2.2.0-alpha)
  -> spans from JDBC database calls

Scope: io.opentelemetry.okhttp-3.0 (version: 2.2.0-alpha)
  -> spans from OkHttp client calls

Scope: io.opentelemetry.kafka-clients-2.6 (version: 2.2.0-alpha)
  -> spans from Kafka producer/consumer operations
```

You do not need to configure anything. The agent handles it automatically. But knowing these scope names is essential for filtering and building metric views.

## Filtering by Instrumentation Scope in the Collector

Use the collector to process telemetry differently based on its instrumentation scope:

```yaml
# collector-config.yaml
processors:
  # Filter out noisy spans from a specific instrumentation library
  filter/scope:
    error_mode: ignore
    trace_conditions:
      # Drop spans from the Spring Scheduling instrumentation
      - 'scope.name == "io.opentelemetry.spring-scheduling-3.1"'

  # Transform: add scope info as span attributes for easier querying
  transform/scope:
    trace_statements:
      - context: span
        statements:
          - set(attributes["otel.scope.name"], scope.name)
          - set(attributes["otel.scope.version"], scope.version)
```

## Using Metric Views with Instrumentation Scope

Metric views in the SDK configuration can target specific instrumentation scopes. This lets you customize aggregation per library:

```yaml
# otel-config.yaml
meter_provider:
  readers:
    - periodic:
        interval: 30000
        exporter:
          otlp:
            endpoint: "http://collector:4317"
            protocol: "grpc"

  views:
    # Custom histogram buckets for HTTP client duration
    - selector:
        instrument_name: "http.client.request.duration"
        meter_name: "com.example.http-client"
      stream:
        aggregation:
          explicit_bucket_histogram:
            boundaries: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1.0, 5.0]

    # Custom histogram buckets for database query duration
    # Database queries typically have different latency profiles
    - selector:
        instrument_name: "db.client.operation.duration"
        meter_name: "com.example.database"
      stream:
        aggregation:
          explicit_bucket_histogram:
            boundaries: [0.0001, 0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1.0]

    # Drop metrics from a noisy internal library
    - selector:
        meter_name: "com.example.internal-health-checker"
      stream:
        aggregation:
          drop: {}
```

## Cross-Signal Correlation Using Scope

The instrumentation scope is the link between different signal types from the same library. If your span-metrics pipeline exposes scope fields as labels, or you copy them to span attributes as shown above and configure those attributes as span-metrics dimensions, you can query them in Prometheus:

```promql
# Query: which instrumentation library generates the most spans?
sum(rate(traces_span_metrics_calls_total[5m])) by (otel_scope_name)

# Query: what is the error rate per instrumentation library?
sum(rate(traces_span_metrics_calls_total{status_code="STATUS_CODE_ERROR"}[5m])) by (otel_scope_name)
/
sum(rate(traces_span_metrics_calls_total[5m])) by (otel_scope_name)
```

In TraceQL:

```text
# Find all spans from a specific instrumentation scope
{ instrumentation:name = "io.opentelemetry.jdbc" && span:duration > 1s }
```

## Tracking Library Version Upgrades

Instrumentation scope versions let you compare behavior before and after a library upgrade:

```promql
# Compare latency between library versions
histogram_quantile(0.99,
  sum(rate(traces_span_metrics_duration_seconds_bucket{
    otel_scope_name="io.opentelemetry.spring-webmvc-6.0",
    otel_scope_version="2.1.0"
  }[5m])) by (le)
)

# vs.

histogram_quantile(0.99,
  sum(rate(traces_span_metrics_duration_seconds_bucket{
    otel_scope_name="io.opentelemetry.spring-webmvc-6.0",
    otel_scope_version="2.2.0"
  }[5m])) by (le)
)
```

## Naming Conventions for Custom Instrumentation

When you write your own instrumentation, follow the OpenTelemetry naming conventions for scopes:

```python
# Good: reverse domain name, identifies the component
tracer = trace.get_tracer("com.example.payment-gateway", "1.0.0")
meter = metrics.get_meter("com.example.payment-gateway", "1.0.0")

# Good: for application-level instrumentation
tracer = trace.get_tracer("com.example.order-service.checkout", "3.2.1")

# Bad: vague, non-unique names
tracer = trace.get_tracer("tracer")
meter = metrics.get_meter("metrics")
```

Use the same scope name and version for tracers, meters, and loggers within the same component. This ensures all signals from that component can be grouped and correlated.

## Wrapping Up

Instrumentation scope is an underused but powerful feature. It lets you filter telemetry by the library that produced it, customize metric aggregation per component, track the impact of library version changes, and correlate signals from the same library across traces, metrics, and logs. Use consistent naming conventions, leverage metric views for per-scope aggregation, and query by scope in your observability backend. The scope metadata is already there in your telemetry. Start using it.
