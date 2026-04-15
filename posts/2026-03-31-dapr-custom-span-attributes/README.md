# How to Implement Custom Span Attributes in Dapr Traces

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, OpenTelemetry, Tracing, Span, Observability

Description: Add custom span attributes to Dapr traces to enrich telemetry with business context like tenant ID, feature flags, and request metadata.

---

## Why Custom Span Attributes?

Dapr automatically generates spans for service invocation, pub/sub, and state operations. But default spans lack business context: which tenant made the request, which A/B variant was served, or which product was queried. Custom attributes bridge that gap.

## Setting Up the Dapr Tracing Config

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: dapr-tracing-config
  namespace: default
spec:
  tracing:
    samplingRate: "1"
    otel:
      endpointAddress: "http://otel-collector.monitoring.svc.cluster.local:4318/v1/traces"
      isSecure: false
      protocol: http
```

## Adding Custom Attributes in Python

```python
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter

# Dapr injects W3C trace context - get the active span
tracer = trace.get_tracer("order-service", "1.0.0")

async def process_order(order: dict, tenant_id: str, user_id: str):
    # Get the current span (created by Dapr's sidecar for the incoming request)
    current_span = trace.get_current_span()

    # Add business-context attributes to the Dapr-created span
    current_span.set_attribute("tenant.id", tenant_id)
    current_span.set_attribute("user.id", user_id)
    current_span.set_attribute("order.id", order["orderId"])
    current_span.set_attribute("order.amount", order["amount"])
    current_span.set_attribute("order.item_count", len(order["items"]))
    current_span.set_attribute("feature.checkout_variant", order.get("checkoutVariant", "control"))

    # Create a child span for the business logic
    with tracer.start_as_current_span("validate-order") as span:
        span.set_attribute("validation.rules_applied", 5)
        await validate_order(order)
```

## Adding Custom Attributes in Go

```go
package main

import (
    "context"

    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/trace"
)

var tracer = otel.Tracer("payment-service")

func processPayment(ctx context.Context, payment Payment) error {
    // Enrich the span propagated by Dapr
    span := trace.SpanFromContext(ctx)
    span.SetAttributes(
        attribute.String("payment.method", payment.Method),
        attribute.Float64("payment.amount", payment.Amount),
        attribute.String("payment.currency", payment.Currency),
        attribute.String("customer.tier", payment.CustomerTier),
        attribute.Bool("payment.is_retry", payment.IsRetry),
    )

    // Child span for the payment gateway call
    ctx, gatewaySpan := tracer.Start(ctx, "payment-gateway-call")
    defer gatewaySpan.End()

    gatewaySpan.SetAttributes(
        attribute.String("gateway.name", "stripe"),
        attribute.String("gateway.region", "us-east-1"),
    )

    return chargeGateway(ctx, payment)
}
```

## Propagating Custom Context via Dapr Service Invocation Headers

Dapr does not include a built-in middleware for automatically forwarding HTTP headers as span attributes. Instead, pass custom metadata as headers when invoking Dapr services, then read them in your application code to set span attributes:

```bash
# Pass custom headers when invoking a Dapr service
curl -H "X-Tenant-Id: acme" \
     -H "X-Feature-Variant: checkout-v2" \
     http://localhost:3500/v1.0/invoke/order-service/method/process
```

In the receiving service, extract these headers from the incoming request and add them as span attributes using the OpenTelemetry SDK, as shown in the Python and Go examples above.

## Querying Custom Attributes in Jaeger

```bash
# Search for spans with a specific tenant
curl "http://jaeger:16686/api/traces?service=order-service&tags=%7B%22tenant.id%22%3A%22acme%22%7D"

# Or in Grafana Tempo using TraceQL:
# { span.tenant.id = "acme" && span.order.amount > 1000 }
```

## Summary

Custom span attributes transform raw Dapr traces into rich business telemetry. By enriching the spans that Dapr creates automatically, you can filter traces by tenant, correlate errors with specific feature variants, and understand the business impact of latency spikes. The key is calling `trace.get_current_span()` rather than creating a new root span, so your attributes appear on the same span the sidecar already created.
