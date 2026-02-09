# How to Build an OpenTelemetry Onboarding Checklist for New Developers Joining Your Organization

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Onboarding, Developer Experience, Observability

Description: Build a practical onboarding checklist that gets new developers productive with OpenTelemetry instrumentation in their first week.

New developers joining your team should not have to reverse-engineer how observability works at your company. A structured onboarding checklist gives them a clear path from zero to confidently instrumenting services, querying traces, and understanding your telemetry pipeline.

Here is how to build one that actually works.

## Week One: Foundations

The first week should focus on understanding, not doing. New developers need context before they start writing instrumentation code.

**Day 1-2: Understand the Pipeline**

Start with a high-level overview of your telemetry pipeline. Create a simple diagram or document that answers:

- Where does telemetry data originate? (application SDKs)
- How does it get collected? (OpenTelemetry Collector)
- Where does it end up? (your observability backend)

Give the new developer read access to your observability platform on day one. Nothing teaches faster than clicking around real production data.

```bash
# Have them verify they can query traces for a service they will work on
# Example: using curl to query a Jaeger instance
curl "http://jaeger.internal:16686/api/traces?service=order-service&limit=5" \
  | jq '.data[0].traceID'
```

**Day 3-4: Read the Standards Document**

Point them to your instrumentation standards document (span naming, attribute conventions, metric patterns). Ask them to read it and then walk through a real trace with a teammate, identifying where each convention is applied.

**Day 5: Local Development Setup**

The new developer should be able to see telemetry from their local development environment. This is the single most important onboarding step. If they cannot see their own traces locally, they will never build intuition for how instrumentation works.

```yaml
# docker-compose.override.yml for local development
# This adds a collector and Jaeger instance to your local stack
services:
  otel-collector:
    image: otel/opentelemetry-collector-contrib:latest
    ports:
      - "4317:4317"   # gRPC receiver
      - "4318:4318"   # HTTP receiver
    volumes:
      - ./otel-collector-config.yaml:/etc/otelcol/config.yaml

  jaeger:
    image: jaegertracing/all-in-one:latest
    ports:
      - "16686:16686"  # Jaeger UI
    environment:
      - COLLECTOR_OTLP_ENABLED=true
```

```yaml
# otel-collector-config.yaml - minimal local config
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

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

## Week Two: Hands-On Practice

**Task 1: Add a Custom Span**

Give them a specific, low-risk task: add a custom span to an existing function. Pick something that is already well-instrumented so they can see how their span fits into an existing trace.

```python
from opentelemetry import trace

tracer = trace.get_tracer("inventory-service", "1.0.0")

def check_stock_availability(product_ids: list[str], warehouse_id: str):
    # Task: wrap this function in a span following our naming conventions
    with tracer.start_as_current_span("inventory.check_stock") as span:
        span.set_attribute("warehouse.id", warehouse_id)
        span.set_attribute("product.count", len(product_ids))

        available = query_warehouse(product_ids, warehouse_id)

        span.set_attribute("inventory.available_count", len(available))
        return available
```

**Task 2: Find a Trace in Production**

Ask them to find a specific trace in your observability backend. For example: "Find a trace where a checkout took longer than 2 seconds and identify which span was the bottleneck." This teaches them how to use the query interface and read trace waterfalls.

**Task 3: Add a Custom Metric**

Have them add a simple counter or histogram to a service:

```go
import (
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/metric"
)

var meter = otel.Meter("order-service")

// Create a counter that tracks order creation by type
var ordersCreated, _ = meter.Int64Counter(
    "orders.created.count",
    metric.WithDescription("Number of orders successfully created"),
    metric.WithUnit("1"),
)

func createOrder(orderType string) error {
    // ... order creation logic ...

    // Record the metric with the order type attribute
    ordersCreated.Add(ctx, 1,
        metric.WithAttributes(
            attribute.String("order.type", orderType),
        ),
    )
    return nil
}
```

## The Checklist Format

Structure the checklist as a GitHub issue or a document with checkboxes. Here is a template:

```markdown
## OpenTelemetry Onboarding Checklist

### Week 1: Foundations
- [ ] Granted access to observability platform (Jaeger/Grafana/etc.)
- [ ] Read the instrumentation standards document
- [ ] Walked through a production trace with a teammate
- [ ] Local development telemetry pipeline is running
- [ ] Can see traces from local service in local Jaeger

### Week 2: Hands-On
- [ ] Added a custom span to an existing service (PR merged)
- [ ] Found and analyzed a slow trace in production
- [ ] Added a custom metric to an existing service (PR merged)
- [ ] Reviewed the OpenTelemetry Collector configuration for your team

### Week 3: Independent Work
- [ ] Instrumented a new feature end-to-end with traces and metrics
- [ ] Created or updated a dashboard using your new metrics
- [ ] Participated in an on-call handoff where telemetry was used for debugging
```

## Common Pitfalls to Address

Your checklist should include a "gotchas" section that saves new developers from common mistakes:

- Forgetting to call `span.end()` in languages without automatic cleanup
- Putting high-cardinality values in metric attributes
- Not propagating context through async boundaries or message queues
- Using generic span names like `handler` or `process`
- Forgetting to set error status on spans when exceptions occur

## Assign a Buddy

Pair each new developer with an observability buddy for their first two weeks. This person answers questions, reviews their first instrumentation PRs, and walks them through real debugging sessions. Documentation is essential but it cannot replace a human who can explain why things are the way they are.

A good onboarding checklist is not just a list of tasks. It is a designed learning path that builds confidence incrementally. Start with observation, move to guided practice, and finish with independent work. Update the checklist every time a new developer finishes it and reports friction points.
