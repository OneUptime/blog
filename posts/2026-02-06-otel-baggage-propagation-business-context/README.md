# How to Use Baggage Propagation to Carry Business Context (User ID, Tenant ID) Across All Three Signals

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Baggage, Context Propagation, Multi-Tenant, Business Context

Description: Use OpenTelemetry baggage to propagate business context like user ID and tenant ID across traces, metrics, and logs automatically.

When you are debugging a problem for a specific customer, you need to filter all telemetry, traces, metrics, and logs, by their tenant ID. But if tenant ID is only set at the API gateway and your downstream services do not have it, you end up with incomplete context. OpenTelemetry Baggage solves this by propagating key-value pairs across service boundaries as part of the request context.

## What Is Baggage?

Baggage is a set of key-value pairs that travel alongside trace context through every service in a request chain. When Service A adds `tenant_id=acme-corp` to baggage, every downstream service (B, C, D) can read that value and attach it to their own telemetry.

Baggage is not a telemetry signal itself. It is a propagation mechanism. You add values to baggage, and then use those values to enrich spans, metrics, and logs in each service along the request path.

## Setting Baggage at the Entry Point

Set baggage at the edge of your system, typically in an API gateway or the first service that handles the request:

### Python

```python
# gateway.py
from opentelemetry import baggage, context, trace
from opentelemetry.baggage.propagation import BaggagePropagator

tracer = trace.get_tracer("api-gateway")

def handle_request(request):
    # Extract user and tenant info from the authenticated request
    user_id = request.headers.get("X-User-ID")
    tenant_id = request.headers.get("X-Tenant-ID")

    # Set baggage values in the current context
    ctx = baggage.set_baggage("user.id", user_id)
    ctx = baggage.set_baggage("tenant.id", tenant_id, context=ctx)
    ctx = baggage.set_baggage("request.priority", "high", context=ctx)

    # Attach the context so it propagates to downstream calls
    token = context.attach(ctx)
    try:
        with tracer.start_as_current_span("handle_request") as span:
            # Add baggage values as span attributes too
            span.set_attribute("user.id", user_id)
            span.set_attribute("tenant.id", tenant_id)

            # Call downstream services - baggage is propagated automatically
            response = call_order_service(request)
            return response
    finally:
        context.detach(token)
```

### Java

```java
// ApiGatewayFilter.java
import io.opentelemetry.api.baggage.Baggage;
import io.opentelemetry.api.trace.Span;
import io.opentelemetry.context.Scope;

public class ApiGatewayFilter {

    public void handleRequest(HttpServletRequest request, HttpServletResponse response) {
        String userId = request.getHeader("X-User-ID");
        String tenantId = request.getHeader("X-Tenant-ID");

        // Build baggage with business context
        Baggage baggage = Baggage.builder()
            .put("user.id", userId)
            .put("tenant.id", tenantId)
            .put("request.priority", "normal")
            .build();

        // Make baggage current so it propagates to downstream services
        try (Scope scope = baggage.makeCurrent()) {
            Span span = Span.current();
            span.setAttribute("user.id", userId);
            span.setAttribute("tenant.id", tenantId);

            // Downstream HTTP calls will carry baggage in headers
            orderServiceClient.processOrder(request);
        }
    }
}
```

## Reading Baggage in Downstream Services

Any downstream service can read the baggage values and use them:

### Python

```python
# order_service.py
from opentelemetry import baggage, trace

tracer = trace.get_tracer("order-service")

def process_order(order):
    with tracer.start_as_current_span("process_order") as span:
        # Read baggage set by the upstream gateway
        tenant_id = baggage.get_baggage("tenant.id")
        user_id = baggage.get_baggage("user.id")

        # Add to span attributes for this service too
        span.set_attribute("tenant.id", tenant_id)
        span.set_attribute("user.id", user_id)

        logger.info(
            "Processing order",
            extra={"tenant_id": tenant_id, "user_id": user_id}
        )

        # Baggage continues to propagate to the next service
        result = call_payment_service(order)
        return result
```

## Automatic Baggage-to-Attribute Conversion

Manually reading baggage and setting attributes in every service is tedious. The OpenTelemetry Collector's Baggage Processor automates this:

```yaml
# collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: "0.0.0.0:4317"

processors:
  # Automatically converts baggage entries to span/log/metric attributes
  baggage:
    rules:
      - baggage_key: "tenant.id"
        attribute_key: "tenant.id"
        action: "insert"
      - baggage_key: "user.id"
        attribute_key: "user.id"
        action: "insert"
      - baggage_key: "request.priority"
        attribute_key: "request.priority"
        action: "insert"

  batch:
    timeout: 5s

exporters:
  otlp:
    endpoint: "http://backend:4317"

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [baggage, batch]
      exporters: [otlp]
    logs:
      receivers: [otlp]
      processors: [baggage, batch]
      exporters: [otlp]
```

With this processor, every span and log record that passes through the collector gets `tenant.id` and `user.id` attributes added automatically from the baggage context.

## Enabling Baggage Propagation in Declarative Config

Make sure your SDK is configured to propagate baggage:

```yaml
# otel-config.yaml
file_format: "0.3"

propagator:
  composite:
    - tracecontext  # W3C trace context headers
    - baggage       # W3C baggage headers

resource:
  attributes:
    service.name: "${SERVICE_NAME}"
```

This tells the SDK to both inject and extract baggage from HTTP headers. The W3C Baggage header format looks like this on the wire:

```
baggage: tenant.id=acme-corp,user.id=user-42,request.priority=high
```

## Using Baggage for Metric Dimensions

Baggage values can also be used as metric attributes. In your application code, read baggage and pass it as metric attributes:

```python
# metrics with baggage context
from opentelemetry import baggage, metrics

meter = metrics.get_meter("order-service")
order_counter = meter.create_counter("orders.processed")

def process_order(order):
    tenant_id = baggage.get_baggage("tenant.id")

    # Include tenant_id as a metric attribute
    # Now you can query order rates per tenant
    order_counter.add(1, {
        "tenant.id": tenant_id,
        "order.type": order.type,
    })
```

## Security Considerations

Baggage is sent in HTTP headers, which means:

1. **It is visible in transit.** Do not put secrets, tokens, or PII in baggage. Use it for identifiers like tenant ID and user ID, not for sensitive data like email addresses or credit card numbers.

2. **It increases header size.** Each baggage entry adds to the HTTP header size. Keep entries concise and limit the number of keys.

3. **Downstream services can read it.** If you call third-party APIs, your baggage goes along for the ride unless you strip it. Be aware of what you are propagating.

```yaml
# Limit baggage size in your SDK config
propagator:
  composite: [tracecontext, baggage]
  baggage:
    max_entries: 10           # limit number of baggage entries
    max_entry_length: 256     # limit each entry's value length
```

## Wrapping Up

Baggage propagation is the mechanism that makes business context available everywhere in a distributed request, without every service needing direct access to the source of that context. Set it at the edge, read it anywhere downstream, and use the collector's Baggage Processor to automate the conversion to telemetry attributes. The result is traces, metrics, and logs that you can filter by tenant ID, user ID, or any other business dimension, across every service in the request chain.
