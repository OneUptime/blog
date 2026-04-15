# How to Implement Distributed Tracing for Pub/Sub Workflows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pub/Sub, Distributed Tracing, OpenTelemetry, Observability

Description: Trace messages end-to-end through Dapr pub/sub workflows by propagating trace context in CloudEvents and linking publisher and subscriber spans.

---

## Tracing Pub/Sub Message Flows

Dapr automatically creates spans for publish and subscribe operations. By default, the publisher span and subscriber span are separate traces unless you propagate trace context in the message payload. Dapr 1.11+ supports automatic W3C trace context injection in CloudEvents.

## Dapr Tracing Configuration

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: tracing-config
  namespace: default
spec:
  tracing:
    samplingRate: "1"
    otel:
      endpointAddress: "tempo.monitoring.svc.cluster.local:4318"
      isSecure: false
      protocol: http
```

## Publisher with Trace Context

```python
from opentelemetry import trace
from opentelemetry.propagate import inject
import httpx

tracer = trace.get_tracer("order-publisher", "1.0.0")
DAPR_PORT = 3500

async def publish_order_event(order_id: str, event_type: str, payload: dict):
    with tracer.start_as_current_span(f"publish-{event_type}") as span:
        span.set_attribute("order.id", order_id)
        span.set_attribute("event.type", event_type)

        # Inject trace context into the message so subscriber can link spans
        headers = {}
        inject(headers)

        message = {
            "specversion": "1.0",
            "type": f"com.example.orders.{event_type}",
            "source": "order-service",
            "id": f"evt-{order_id}-{event_type}",
            "datacontenttype": "application/json",
            "data": payload,
            # Propagate trace context as CloudEvent extension
            "traceparent": headers.get("traceparent", ""),
            "tracestate": headers.get("tracestate", ""),
        }

        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"http://localhost:{DAPR_PORT}/v1.0/publish/order-pubsub/order-events",
                json=message,
                headers={"Content-Type": "application/cloudevents+json"},
            )
            span.set_attribute("publish.status", resp.status_code)
```

## Subscriber with Trace Context Extraction

```python
from opentelemetry.propagate import extract
from opentelemetry import context, trace

tracer = trace.get_tracer("fulfillment-service", "1.0.0")

@app.post("/order-events")
async def handle_order_event(request: Request):
    body = await request.json()

    # Extract trace context from CloudEvent
    carrier = {
        "traceparent": body.get("traceparent", ""),
        "tracestate": body.get("tracestate", ""),
    }
    ctx = extract(carrier)

    # Continue the trace from the publisher
    with tracer.start_as_current_span(
        "process-order-event",
        context=ctx,
        kind=trace.SpanKind.CONSUMER
    ) as span:
        event_data = body.get("data", {})
        span.set_attribute("order.id", event_data.get("orderId", ""))
        span.set_attribute("event.type", body.get("type", ""))
        span.set_attribute("consumer.group", "fulfillment-service")

        await process_fulfillment(event_data)

    return {"status": "SUCCESS"}
```

## Multi-Step Workflow Tracing

```python
async def order_fulfillment_workflow(order_id: str, ctx: context.Context):
    """Trace a multi-step pub/sub workflow end-to-end."""
    with tracer.start_as_current_span("fulfillment-workflow", context=ctx) as wf_span:
        wf_span.set_attribute("order.id", order_id)

        # Step 1: Reserve inventory
        with tracer.start_as_current_span("reserve-inventory"):
            await inventory_service.reserve(order_id)

        # Step 2: Schedule shipment
        with tracer.start_as_current_span("schedule-shipment"):
            tracking_number = await shipping_service.schedule(order_id)
            trace.get_current_span().set_attribute("tracking.number", tracking_number)

        # Step 3: Notify customer - publish another event (carrying forward trace)
        await publish_order_event(order_id, "shipped", {"trackingNumber": tracking_number})
```

## Viewing the Full Trace in Grafana Tempo

```bash
# TraceQL query to find all spans in an order's lifecycle
# { resource.service.name =~ "order.*" && span.order.id = "ord-001" }

# Find slow fulfillment workflows
# { resource.service.name = "fulfillment-service" && duration > 5s }
```

## Summary

End-to-end pub/sub tracing in Dapr requires propagating W3C trace context through CloudEvent messages. The publisher injects the trace context as CloudEvent extensions, and the subscriber extracts it and creates a child span. This links the entire message flow - from API request through publish through consume through downstream calls - into a single distributed trace.
