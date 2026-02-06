# How to Troubleshoot Traces Breaking into Disconnected Fragments When One Service Uses B3 and Another Uses W3C

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, B3, W3C, Context Propagation

Description: Fix fragmented traces caused by propagation format mismatches when some services use B3 and others use W3C TraceContext.

Your traces should show a complete call chain from Service A through Service B to Service C. Instead, you see three separate traces, each with one span. The trace IDs do not match because the services are using different context propagation formats. One service sends B3 headers while the other expects W3C TraceContext.

## Understanding Propagation Formats

Different tracing systems use different HTTP headers to propagate trace context:

```
W3C TraceContext:
  traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01

B3 Multi-Header:
  X-B3-TraceId: 4bf92f3577b34da6a3ce929d0e0e4736
  X-B3-SpanId: 00f067aa0ba902b7
  X-B3-Sampled: 1

B3 Single-Header:
  b3: 4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-1
```

If Service A sends `traceparent` but Service B only reads `X-B3-TraceId`, Service B will not find the trace context and will start a new trace.

## Diagnosing the Mismatch

Check what propagation format each service uses:

```bash
# Check environment variables on each service
kubectl exec -it service-a-pod -- env | grep OTEL_PROPAGATORS
kubectl exec -it service-b-pod -- env | grep OTEL_PROPAGATORS

# If service-a has OTEL_PROPAGATORS=tracecontext
# and service-b has OTEL_PROPAGATORS=b3multi
# you have a mismatch
```

Inspect the HTTP headers between services:

```python
# Add middleware to log propagation headers in Service B
@app.before_request
def log_trace_headers():
    headers_of_interest = [
        'traceparent', 'tracestate',           # W3C
        'x-b3-traceid', 'x-b3-spanid', 'b3',  # B3
    ]
    for h in headers_of_interest:
        value = request.headers.get(h)
        if value:
            print(f"Received header {h}: {value}")
```

## Fix 1: Standardize on W3C TraceContext

The simplest fix is to configure all services to use W3C TraceContext:

```bash
# Set on ALL services
export OTEL_PROPAGATORS="tracecontext,baggage"
```

This works if you control all services. If you have legacy Zipkin services that only speak B3, you need a different approach.

## Fix 2: Use a Composite Propagator

Configure services to support both formats simultaneously. The SDK will inject all configured formats and extract from whichever it finds:

```bash
# Support both W3C and B3 propagation
export OTEL_PROPAGATORS="tracecontext,baggage,b3multi"
```

In code:

```python
from opentelemetry import propagate
from opentelemetry.propagators.composite import CompositePropagator
from opentelemetry.trace.propagation import TraceContextTextMapPropagator
from opentelemetry.baggage.propagation import W3CBaggagePropagator
from opentelemetry.propagators.b3 import B3MultiFormat

propagate.set_global_textmap(
    CompositePropagator([
        TraceContextTextMapPropagator(),  # W3C
        W3CBaggagePropagator(),
        B3MultiFormat(),                   # B3 multi-header
    ])
)
```

For Go:

```go
import (
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/propagation"
    "go.opentelemetry.io/contrib/propagators/b3"
)

otel.SetTextMapPropagator(
    propagation.NewCompositeTextMapPropagator(
        propagation.TraceContext{},
        propagation.Baggage{},
        b3.New(b3.WithInjectEncoding(b3.B3MultipleHeader)),
    ),
)
```

With a composite propagator, the outgoing request will include both sets of headers:

```
traceparent: 00-abc123...-def456...-01
X-B3-TraceId: abc123...
X-B3-SpanId: def456...
X-B3-Sampled: 1
```

The receiving service can extract from whichever format it understands.

## Fix 3: Use the Collector as a Propagation Bridge

If you cannot change the SDKs, deploy the Collector between services and configure it to translate between propagation formats. However, the Collector does not actually change propagation headers in pass-through mode. It can re-export with different context, but this only works if the Collector is actively involved in the request path (not just receiving telemetry data).

A better approach is to use a service mesh (like Istio or Linkerd) that can handle header translation:

```yaml
# Istio can be configured to support multiple trace header formats
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      tracing:
        zipkin:
          address: otel-collector.observability:9411
```

## Fix 4: Migrate B3 Services Gradually

If you have a large fleet with a mix of B3 and W3C services, migrate gradually:

1. First, add the composite propagator to all services so they emit both formats
2. Verify traces are complete
3. Then remove the B3 propagator from services one by one
4. Once all services are on W3C only, clean up

```bash
# Phase 1: All services emit both (safe, no breakage)
export OTEL_PROPAGATORS="tracecontext,baggage,b3multi"

# Phase 2: After verification, switch to W3C only
export OTEL_PROPAGATORS="tracecontext,baggage"
```

## Verifying Complete Traces

After applying the fix, verify traces are connected:

```bash
# Generate a test request through the full service chain
curl -v http://service-a/api/test

# Check the trace in your backend
# All spans should share the same trace_id
# The parent-child relationships should be correct
```

Look for:
- A single trace ID across all services
- Proper parent-child span relationships
- No orphaned spans or disconnected fragments

Propagation format mismatches are one of the most common causes of broken traces in heterogeneous environments. The composite propagator approach is the safest migration path because it supports both formats simultaneously without breaking existing integrations.
