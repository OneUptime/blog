# Use Baggage Propagation to Carry Business Context Across All Three Signals

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Baggage, Context Propagation, Multi-Tenant, Business Context

Description: Use OpenTelemetry baggage to propagate business context like user ID and tenant ID across traces, metrics, and logs automatically.

When you are debugging a problem for a specific customer, you need to filter all telemetry, traces, metrics, and logs, by their tenant ID. But if tenant ID is only set at the API gateway and your downstream services do not have it, you end up with incomplete context. OpenTelemetry Baggage solves this by propagating key-value pairs across service boundaries as part of the request context.

## What Is Baggage?

Baggage is a set of key-value pairs that travel alongside trace context through every service in a request chain. When Service A adds `tenant_id=acme-corp` to baggage, every downstream service (B, C, D) can read that value and attach it to their own telemetry.

Baggage is not span, metric, or log data by itself. It is a propagation mechanism. You add values to baggage, and then use those values to enrich spans, metrics, and logs in each service along the request path.

## Setting Baggage at the Entry Point

Set baggage at the edge of your system, typically in an API gateway or the first service that handles the request:

### Python

```python
# gateway.py

from opentelemetry import baggage, context, trace

tracer = trace.get_tracer("api-gateway")

def handle_request(request):
    # Extract user and tenant info from the authenticated request
    user_id = request.headers.get("X-User-ID")
    tenant_id = request.headers.get("X-Tenant-ID")

    # Set baggage values in the current context
    ctx = context.get_current()
    if user_id:
        ctx = baggage.set_baggage("user.id", user_id, context=ctx)
    if tenant_id:
        ctx = baggage.set_baggage("tenant.id", tenant_id, context=ctx)
    ctx = baggage.set_baggage("request.priority", "high", context=ctx)

    # Attach the context so it propagates to downstream calls
    token = context.attach(ctx)
    try:
        with tracer.start_as_current_span("handle_request") as span:
            # Add baggage values as span attributes too
            if user_id:
                span.set_attribute("user.id", user_id)
            if tenant_id:
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
import io.opentelemetry.api.baggage.BaggageBuilder;
import io.opentelemetry.api.trace.Span;
import io.opentelemetry.context.Scope;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

public class ApiGatewayFilter {

    public void handleRequest(HttpServletRequest request, HttpServletResponse response) {
        String userId = request.getHeader("X-User-ID");
        String tenantId = request.getHeader("X-Tenant-ID");

        // Build baggage with business context
        BaggageBuilder baggageBuilder = Baggage.builder();
        if (userId != null) {
            baggageBuilder.put("user.id", userId);
        }
        if (tenantId != null) {
            baggageBuilder.put("tenant.id", tenantId);
        }
        Baggage baggage = baggageBuilder
            .put("request.priority", "normal")
            .build();

        // Make baggage current so it propagates to downstream services
        try (Scope scope = baggage.makeCurrent()) {
            Span span = Span.current();
            if (userId != null) {
                span.setAttribute("user.id", userId);
            }
            if (tenantId != null) {
                span.setAttribute("tenant.id", tenantId);
            }

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
        if tenant_id:
            span.set_attribute("tenant.id", tenant_id)
        if user_id:
            span.set_attribute("user.id", user_id)

        logger.info(
            "Processing order",
            extra={"tenant_id": tenant_id, "user_id": user_id}
        )

        # Baggage continues to propagate to the next service
        result = call_payment_service(order)
        return result
```

## Copying Baggage to Attributes

Manually reading baggage and setting attributes in every service is tedious, but it is the step that makes baggage searchable in telemetry backends. The OpenTelemetry Collector does not receive the original W3C baggage header in OTLP telemetry, so copy baggage to attributes in application code or in an in-process span/log processor before export:

```python
from opentelemetry import baggage

BAGGAGE_ATTRIBUTE_KEYS = ("tenant.id", "user.id", "request.priority")

def add_baggage_attributes(span):
    for key in BAGGAGE_ATTRIBUTE_KEYS:
        value = baggage.get_baggage(key)
        if value is not None:
            span.set_attribute(key, value)
```

Call this helper when you create spans, and use the same keys when you enrich log records or metric measurements. After the values are present as telemetry attributes, the collector can process, filter, redact, or export them like any other span, log, or metric attribute.

## Enabling Baggage Propagation in Declarative Config

Make sure your SDK is configured to propagate baggage:

```yaml
# otel-config.yaml
file_format: "1.0"

propagator:
  composite:
    - tracecontext:  # W3C trace context headers
    - baggage:       # W3C baggage headers

resource:
  attributes:
    - name: service.name
      value: "${SERVICE_NAME}"
```

This tells the SDK to both inject and extract baggage from HTTP headers. The W3C Baggage header format looks like this on the wire:

```text
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
    attributes = {"order.type": order.type}
    if tenant_id is not None:
        attributes["tenant.id"] = tenant_id

    order_counter.add(1, attributes)
```

## Security Considerations

Baggage is sent in HTTP headers, which means:

1. **It is visible in transit.** Do not put secrets, tokens, or PII in baggage. Use it for identifiers like tenant ID and user ID, not for sensitive data like email addresses or credit card numbers.

2. **It increases header size.** Each baggage entry adds to the HTTP header size. Keep entries concise and limit the number of keys.

3. **Downstream services can read it.** If you call third-party APIs, your baggage goes along for the ride unless you strip it. Be aware of what you are propagating.

Validate and limit baggage in application code before adding it to the context. The W3C Baggage specification allows implementations to drop or truncate entries when the combined header is too large or entries are malformed, but portable SDK configuration for `max_entries` or `max_entry_length` is not part of the OpenTelemetry declarative configuration schema.

## Wrapping Up

Baggage propagation is the mechanism that makes business context available everywhere in a distributed request, without every service needing direct access to the source of that context. Set it at the edge, read it anywhere downstream, and copy it to telemetry attributes where you create spans, metric measurements, and log records. The result is traces, metrics, and logs that you can filter by tenant ID, user ID, or any other business dimension, across every service in the request chain.
