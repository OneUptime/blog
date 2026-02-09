# How to Monitor Hasura GraphQL Engine Performance with OpenTelemetry Traces and Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Hasura, GraphQL, Database Performance

Description: Configure Hasura GraphQL Engine to export OpenTelemetry traces and metrics for monitoring query performance and database health.

Hasura generates GraphQL APIs directly from your database schema. This is convenient, but it also means that every GraphQL query translates to SQL under the hood, and bad queries can hammer your database without you realizing it. Hasura has built-in OpenTelemetry support that lets you trace the full lifecycle from GraphQL operation to SQL execution.

## Enabling OpenTelemetry in Hasura

Hasura supports OpenTelemetry export natively. Configure it through environment variables or the metadata API:

```bash
# Environment variables for Hasura Docker setup
HASURA_GRAPHQL_ENABLED_APIS=metadata,graphql
HASURA_GRAPHQL_ENABLE_TELEMETRY=false

# OpenTelemetry configuration
HASURA_GRAPHQL_OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://otel-collector:4318/v1/traces
HASURA_GRAPHQL_OTEL_EXPORTER_OTLP_METRICS_ENDPOINT=http://otel-collector:4318/v1/metrics
HASURA_GRAPHQL_OTEL_STATUS=enabled
```

Or use the metadata API for more control:

```bash
curl -X POST http://localhost:8080/v1/metadata \
  -H 'Content-Type: application/json' \
  -d '{
    "type": "set_opentelemetry_config",
    "args": {
      "status": "enabled",
      "data_types": ["traces", "metrics", "logs"],
      "exporter_otlp": {
        "otlp_traces_endpoint": "http://otel-collector:4318/v1/traces",
        "otlp_metrics_endpoint": "http://otel-collector:4318/v1/metrics",
        "otlp_logs_endpoint": "http://otel-collector:4318/v1/logs",
        "protocol": "http/protobuf",
        "resource_attributes": [
          { "name": "service.name", "value": "hasura-engine" },
          { "name": "deployment.environment", "value": "production" }
        ]
      },
      "batch_span_processor": {
        "max_export_batch_size": 512,
        "schedule_delay_millis": 5000
      }
    }
  }'
```

## What Hasura Exports Automatically

Once enabled, Hasura exports detailed spans for each GraphQL operation:

- **HTTP request span**: The top-level span for the incoming HTTP request
- **GraphQL operation span**: Parsing, validation, and execution of the GraphQL operation
- **SQL generation span**: Time spent converting the GraphQL query to SQL
- **Database execution span**: Time spent executing the SQL query against PostgreSQL

Each span carries attributes like:

```
graphql.operation.name: "GetUserOrders"
graphql.operation.type: "query"
db.system: "postgresql"
db.statement: "SELECT ... FROM orders WHERE user_id = $1"
http.status_code: 200
```

## Tracking Slow Queries

Create an OpenTelemetry Collector pipeline that flags slow database queries:

```yaml
# otel-collector-config.yaml
receivers:
  otlp:
    protocols:
      http:
        endpoint: 0.0.0.0:4318

processors:
  # Filter processor to identify slow spans
  filter/slow-queries:
    spans:
      include:
        match_type: regexp
        attributes:
          - key: db.system
            value: "postgresql"
        # Only keep spans longer than 500ms
      exclude:
        match_type: regexp
        span_names:
          - ".*"
        # This is a simplified example; use span duration in practice

  attributes/enrich:
    actions:
      - key: hasura.query.slow
        value: true
        action: upsert

exporters:
  otlp:
    endpoint: your-backend:4317

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [attributes/enrich]
      exporters: [otlp]
```

## Monitoring Hasura-Specific Metrics

Hasura exports several useful metrics. Here are the key ones to dashboard:

```typescript
// These metrics come from Hasura automatically when OTEL is enabled

// 1. GraphQL request duration
// hasura_graphql_request_duration_seconds - histogram
// Use this for latency SLOs

// 2. Active subscriptions
// hasura_active_subscriptions - gauge
// Watch for unexpected growth

// 3. PostgreSQL connection pool
// hasura_postgres_connections - gauge by status (active, idle, waiting)
// Alert when waiting connections exceed a threshold

// 4. Event trigger processing
// hasura_event_trigger_processed_total - counter
// hasura_event_trigger_processing_time - histogram
```

## Custom Instrumentation for Actions and Remote Schemas

Hasura Actions call external webhooks. Instrument your action handlers to continue the trace:

```python
# action_handler.py
from flask import Flask, request
from opentelemetry import trace
from opentelemetry.propagate import extract

app = Flask(__name__)
tracer = trace.get_tracer("hasura-action-handler")

@app.route("/api/validate-order", methods=["POST"])
def validate_order():
    # Extract trace context from Hasura's request headers
    parent_context = extract(request.headers)

    with tracer.start_as_current_span(
        "action: validate_order",
        context=parent_context,
        attributes={
            "hasura.action": "validate_order",
            "order.id": request.json.get("input", {}).get("order_id"),
        }
    ) as span:
        # Your validation logic
        order_data = request.json["input"]

        is_valid = run_validation(order_data)

        span.set_attribute("validation.result", "pass" if is_valid else "fail")

        if not is_valid:
            span.add_event("validation.failed", {
                "reason": "insufficient_inventory",
            })
            return {"valid": False, "reason": "Insufficient inventory"}, 200

        return {"valid": True}, 200
```

## Monitoring Subscription Performance

Hasura subscriptions use live queries that poll the database. This can be expensive:

```sql
-- Check which subscriptions are generating the most database load
-- by looking at the traces in your backend

-- Key attributes to filter on:
-- graphql.operation.type = "subscription"
-- hasura.subscription.poller_id
-- db.statement (the generated SQL)
```

Build alerts around subscription metrics:

```yaml
# Alert when subscription polling is slow
# hasura_subscription_poll_duration_seconds P99 > 1s
- alert: HasuraSubscriptionPollSlow
  expr: |
    histogram_quantile(0.99,
      rate(hasura_subscription_poll_duration_seconds_bucket[5m])
    ) > 1
  labels:
    severity: warning
  annotations:
    summary: "Hasura subscription polling P99 exceeds 1 second"
```

## Database Connection Pool Monitoring

Hasura maintains a connection pool to PostgreSQL. Monitor it to prevent connection exhaustion:

```yaml
# Alert when connection pool is nearly exhausted
- alert: HasuraConnectionPoolExhausted
  expr: |
    hasura_postgres_connections{status="waiting"} > 5
  labels:
    severity: critical
  annotations:
    summary: "Hasura has waiting database connections - pool may be exhausted"
```

## Putting It Together

With OpenTelemetry enabled, your Hasura traces show the full path from GraphQL to SQL. You can identify which GraphQL operations generate the most expensive SQL, which subscriptions poll too frequently, and when your database connection pool is under pressure.

The most valuable insight is usually the SQL generation step. Hasura sometimes generates suboptimal queries for complex relationships. The trace gives you the exact SQL statement and its duration, so you can decide whether to add database indexes, restructure your relationships, or use Hasura's query optimization hints.
