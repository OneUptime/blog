# How to Use Trace Baggage Propagation to Pass Request Context Across Kubernetes Microservices

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Kubernetes, Tracing

Description: Implement OpenTelemetry baggage propagation in Kubernetes microservices to pass request context like user IDs, feature flags, and business metadata across service boundaries.

---

Distributed tracing tracks requests across services, but traces alone don't carry business context. Baggage propagation enables passing arbitrary key-value pairs alongside traces, making request-specific data available to all services in a transaction. This capability unlocks powerful use cases like user-specific debugging, feature flag propagation, and business metric correlation.

This guide demonstrates implementing baggage propagation in Kubernetes microservices.

## Understanding Trace Baggage

Baggage is a set of key-value pairs that propagate with distributed context:
- Travels alongside trace context in HTTP headers
- Available to all services handling the request
- Visible in spans for correlation
- Survives process and network boundaries

Common use cases:
- User identification
- Feature flags
- Tenant IDs in multi-tenant systems
- Request priority or SLA
- A/B test variants
- Debug flags

## Baggage vs Trace Attributes

**Trace Attributes**: Attached to specific spans, not propagated
**Baggage**: Propagates across service boundaries automatically

Use baggage for:
- Data needed by downstream services
- Business context for filtering/grouping
- Runtime configuration decisions

Avoid using baggage for:
- Large payloads (increases overhead)
- Sensitive data (visible in headers)
- Span-specific data

## Implementing Baggage in Go

```go
package main

import (
    "context"
    "net/http"

    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/baggage"
    "go.opentelemetry.io/otel/propagation"
    "go.opentelemetry.io/otel/trace"
)

func initTelemetry() {
    // Configure propagators
    otel.SetTextMapPropagator(
        propagation.NewCompositeTextMapPropagator(
            propagation.TraceContext{},
            propagation.Baggage{},
        ),
    )
}

func handleRequest(w http.ResponseWriter, r *http.Request) {
    ctx := r.Context()

    // Extract user ID from request
    userID := r.Header.Get("X-User-ID")

    // Create baggage
    member, _ := baggage.NewMember("user.id", userID)
    tenantMember, _ := baggage.NewMember("tenant.id", "acme-corp")
    flagMember, _ := baggage.NewMember("feature.new_ui", "true")

    bag, _ := baggage.New(member, tenantMember, flagMember)
    ctx = baggage.ContextWithBaggage(ctx, bag)

    // Create span with baggage
    tracer := otel.Tracer("frontend")
    ctx, span := tracer.Start(ctx, "process-request")
    defer span.End()

    // Add baggage as span attributes for visibility
    for _, member := range baggage.FromContext(ctx).Members() {
        span.SetAttributes(
            attribute.String("baggage."+member.Key(), member.Value()),
        )
    }

    // Call downstream service
    callBackend(ctx)
}

func callBackend(ctx context.Context) {
    client := &http.Client{}
    req, _ := http.NewRequestWithContext(ctx, "GET", "http://backend:8080/api", nil)

    // Propagate context (including baggage)
    otel.GetTextMapPropagator().Inject(ctx, propagation.HeaderCarrier(req.Header))

    resp, _ := client.Do(req)
    defer resp.Body.Close()
}

// In backend service
func backendHandler(w http.ResponseWriter, r *http.Request) {
    ctx := r.Context()

    // Extract propagated context
    ctx = otel.GetTextMapPropagator().Extract(ctx, propagation.HeaderCarrier(r.Header))

    // Access baggage
    bag := baggage.FromContext(ctx)
    userID := bag.Member("user.id").Value()
    tenantID := bag.Member("tenant.id").Value()
    newUIEnabled := bag.Member("feature.new_ui").Value() == "true"

    // Use baggage in business logic
    if newUIEnabled {
        // Serve new UI version
    }

    // Log with baggage context
    logger.Info("Processing request",
        "user_id", userID,
        "tenant_id", tenantID,
    )
}
```

## Implementing Baggage in Python

```python
from opentelemetry import baggage, trace
from opentelemetry.propagate import inject, extract
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.propagators.composite import CompositePropagator
from opentelemetry.propagators.tracecontext import TraceContextTextMapPropagator
from opentelemetry.propagators.baggage import W3CBaggagePropagator

# Initialize with baggage propagation
trace.set_tracer_provider(TracerProvider())
tracer_provider = trace.get_tracer_provider()

otlp_exporter = OTLPSpanExporter(endpoint="otel-collector:4317", insecure=True)
tracer_provider.add_span_processor(BatchSpanProcessor(otlp_exporter))

# Configure propagators
from opentelemetry import propagate
propagate.set_global_textmap(
    CompositePropagator([
        TraceContextTextMapPropagator(),
        W3CBaggagePropagator()
    ])
)

tracer = trace.get_tracer(__name__)

# Frontend service
def handle_request(request):
    # Set baggage
    ctx = baggage.set_baggage("user.id", request.headers.get("X-User-ID"))
    ctx = baggage.set_baggage("tenant.id", "acme-corp", ctx)
    ctx = baggage.set_baggage("feature.new_checkout", "true", ctx)

    with tracer.start_as_current_span("process-request", context=ctx) as span:
        # Add baggage to span attributes
        span.set_attribute("user.id", baggage.get_baggage("user.id", ctx))
        span.set_attribute("tenant.id", baggage.get_baggage("tenant.id", ctx))

        # Call backend
        call_backend(ctx)

def call_backend(context):
    import requests
    headers = {}

    # Inject context into headers
    inject(headers, context)

    response = requests.get("http://backend:8080/api", headers=headers)
    return response.json()

# Backend service
def backend_handler(request):
    # Extract context from headers
    ctx = extract(request.headers)

    # Access baggage
    user_id = baggage.get_baggage("user.id", ctx)
    tenant_id = baggage.get_baggage("tenant.id", ctx)
    new_checkout = baggage.get_baggage("feature.new_checkout", ctx) == "true"

    with tracer.start_as_current_span("backend-processing", context=ctx) as span:
        span.set_attribute("processing.user_id", user_id)

        if new_checkout:
            # Use new checkout flow
            pass

        # Business logic here
        return process_order(user_id, tenant_id)
```

## Implementing Baggage in Java

```java
import io.opentelemetry.api.OpenTelemetry;
import io.opentelemetry.api.baggage.Baggage;
import io.opentelemetry.api.trace.Span;
import io.opentelemetry.api.trace.Tracer;
import io.opentelemetry.context.Context;
import io.opentelemetry.context.propagation.TextMapGetter;
import io.opentelemetry.context.propagation.TextMapSetter;

public class FrontendService {
    private final Tracer tracer;
    private final OpenTelemetry openTelemetry;

    public FrontendService(OpenTelemetry openTelemetry) {
        this.openTelemetry = openTelemetry;
        this.tracer = openTelemetry.getTracer("frontend");
    }

    public void handleRequest(HttpServletRequest request) {
        // Create baggage
        Baggage baggage = Baggage.builder()
            .put("user.id", request.getHeader("X-User-ID"))
            .put("tenant.id", "acme-corp")
            .put("feature.new_ui", "true")
            .build();

        // Create context with baggage
        Context context = Context.current().with(baggage);

        Span span = tracer.spanBuilder("process-request")
            .setParent(context)
            .startSpan();

        try (Scope scope = context.with(span).makeCurrent()) {
            // Add baggage as span attributes
            baggage.forEach((key, value) -> {
                span.setAttribute("baggage." + key, value.getValue());
            });

            // Call backend
            callBackend(Context.current());
        } finally {
            span.end();
        }
    }

    private void callBackend(Context context) {
        HttpURLConnection conn = // create connection

        // Inject context
        TextMapSetter<HttpURLConnection> setter = (carrier, key, value) ->
            carrier.setRequestProperty(key, value);

        openTelemetry.getPropagators()
            .getTextMapPropagator()
            .inject(context, conn, setter);

        // Make request
    }
}

// Backend service
public class BackendService {
    public void handleRequest(HttpServletRequest request) {
        // Extract context
        TextMapGetter<HttpServletRequest> getter = new TextMapGetter<>() {
            @Override
            public Iterable<String> keys(HttpServletRequest carrier) {
                return Collections.list(carrier.getHeaderNames());
            }

            @Override
            public String get(HttpServletRequest carrier, String key) {
                return carrier.getHeader(key);
            }
        };

        Context context = openTelemetry.getPropagators()
            .getTextMapPropagator()
            .extract(Context.current(), request, getter);

        // Access baggage
        Baggage baggage = Baggage.fromContext(context);
        String userId = baggage.getEntryValue("user.id");
        String tenantId = baggage.getEntryValue("tenant.id");
        boolean newUI = "true".equals(baggage.getEntryValue("feature.new_ui"));

        // Use in business logic
        if (newUI) {
            // Serve new UI
        }
    }
}
```

## Propagating Feature Flags

```go
func propagateFeatureFlags(ctx context.Context, flags map[string]bool) context.Context {
    bag := baggage.FromContext(ctx)

    for name, enabled := range flags {
        member, _ := baggage.NewMember(
            fmt.Sprintf("feature.%s", name),
            fmt.Sprintf("%t", enabled),
        )
        bag, _ = bag.SetMember(member)
    }

    return baggage.ContextWithBaggage(ctx, bag)
}

func isFeatureEnabled(ctx context.Context, featureName string) bool {
    bag := baggage.FromContext(ctx)
    value := bag.Member(fmt.Sprintf("feature.%s", featureName)).Value()
    return value == "true"
}
```

## Multi-Tenant Context Propagation

```python
def set_tenant_context(context, tenant_id, tier, region):
    """Set tenant-specific baggage"""
    ctx = baggage.set_baggage("tenant.id", tenant_id, context)
    ctx = baggage.set_baggage("tenant.tier", tier, ctx)
    ctx = baggage.set_baggage("tenant.region", region, ctx)
    return ctx

def get_tenant_context(context):
    """Extract tenant information"""
    return {
        "id": baggage.get_baggage("tenant.id", context),
        "tier": baggage.get_baggage("tenant.tier", context),
        "region": baggage.get_baggage("tenant.region", context),
    }

# Use for tenant-specific behavior
def process_request(context):
    tenant = get_tenant_context(context)

    if tenant["tier"] == "premium":
        # Premium tenant processing
        pass
```

## Conditional Logging with Baggage

```go
func setupLogger(ctx context.Context) *zap.Logger {
    bag := baggage.FromContext(ctx)
    debugEnabled := bag.Member("debug.enabled").Value() == "true"

    config := zap.NewProductionConfig()
    if debugEnabled {
        config.Level = zap.NewAtomicLevelAt(zap.DebugLevel)
    }

    logger, _ := config.Build()
    return logger
}
```

## Monitoring Baggage Usage

Query baggage in traces:

```promql
# Count spans by baggage value
count by (baggage_tenant_id) (traces)

# Filter traces by baggage
{baggage.user.tier="premium"}
```

Track baggage overhead:

```go
func monitorBaggageSize(ctx context.Context) {
    bag := baggage.FromContext(ctx)
    size := 0
    for _, member := range bag.Members() {
        size += len(member.Key()) + len(member.Value())
    }

    metrics.RecordBaggageSize(size)
}
```

## Best Practices

1. **Keep baggage small**: Each key-value pair adds overhead to every request
2. **Use namespaced keys**: Prefix keys (user., feature., tenant.)
3. **Don't store PII**: Baggage is visible in trace backends
4. **Set at entry points**: Add baggage early in request lifecycle
5. **Clean up unused keys**: Remove baggage that's no longer needed
6. **Document conventions**: Maintain a registry of baggage keys
7. **Monitor propagation**: Ensure baggage reaches downstream services

## Security Considerations

```go
// Sanitize baggage before propagation
func sanitizeBaggage(ctx context.Context) context.Context {
    bag := baggage.FromContext(ctx)
    sanitized := baggage.Baggage{}

    for _, member := range bag.Members() {
        // Skip sensitive keys
        if strings.HasPrefix(member.Key(), "auth.") ||
           strings.HasPrefix(member.Key(), "secret.") {
            continue
        }

        // Limit value length
        value := member.Value()
        if len(value) > 256 {
            value = value[:256]
        }

        newMember, _ := baggage.NewMember(member.Key(), value)
        sanitized, _ = sanitized.SetMember(newMember)
    }

    return baggage.ContextWithBaggage(ctx, sanitized)
}
```

## Conclusion

Trace baggage propagation enables passing request-specific context across Kubernetes microservices without explicit parameter passing. This capability powers use cases from feature flags to multi-tenancy to debug flags. Use baggage judiciously, keeping payload size small and avoiding sensitive data. Combined with distributed tracing, baggage provides the business context needed to understand complex distributed transactions. Start with simple use cases like user IDs, then expand to feature flags and tenant context as your team becomes comfortable with the pattern.
