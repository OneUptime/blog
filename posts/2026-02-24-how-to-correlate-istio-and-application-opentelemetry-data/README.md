# How to Correlate Istio and Application OpenTelemetry Data

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, OpenTelemetry, Correlation, Distributed Tracing, Observability

Description: How to connect Istio proxy-generated telemetry with application-level OpenTelemetry instrumentation for complete end-to-end observability.

---

Istio generates telemetry at the proxy level. Your application generates telemetry at the code level. Both tell part of the story, but the real power comes from correlating them. When you can see a proxy-level span showing network latency connected to an application span showing database query time, you get the complete picture of where time is spent. Setting this up requires getting trace context propagation right and aligning resource attributes between the two data sources.

## The Two Layers of Telemetry

**Istio proxy telemetry** captures:
- Network-level request duration (from proxy receive to proxy send)
- TLS handshake time
- Load balancing decisions
- Retry and timeout behavior
- Source and destination service identity

**Application telemetry** captures:
- Business logic execution time
- Database queries
- Cache operations
- External API calls
- Custom business metrics

Neither layer alone tells the full story. A slow request might have fast proxy spans but slow application spans (database problem), or fast application spans but slow proxy spans (network problem). Correlation lets you see both in one view.

## Trace Context Propagation: The Connection Point

The mechanism that connects proxy spans to application spans is trace context propagation. When the Envoy proxy creates a span, it generates a trace ID and span ID. These are passed to the application through HTTP headers. If the application uses OpenTelemetry and extracts these headers, its spans share the same trace ID and become part of the same trace.

The headers Istio uses:

```
traceparent: 00-<trace-id>-<span-id>-<flags>
tracestate: <optional vendor info>
x-request-id: <unique request identifier>
x-b3-traceid: <trace-id>
x-b3-spanid: <span-id>
x-b3-parentspanid: <parent-span-id>
x-b3-sampled: <0 or 1>
```

Istio supports both W3C Trace Context (`traceparent`) and B3 formats. Your application should extract and propagate both for maximum compatibility.

## Setting Up Application Instrumentation

### Python with OpenTelemetry

```python
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.flask import FlaskInstrumentor
from opentelemetry.instrumentation.requests import RequestsInstrumentor
from opentelemetry.propagators.b3 import B3MultiFormat
from opentelemetry.propagate import set_global_textmap
from opentelemetry.propagators.composite import CompositePropagator
from opentelemetry.trace.propagation import TraceContextTextMapPropagator
from opentelemetry.sdk.resources import Resource

# Configure propagators for both W3C and B3
set_global_textmap(CompositePropagator([
    TraceContextTextMapPropagator(),
    B3MultiFormat(),
]))

# Set up the tracer provider
resource = Resource.create({
    "service.name": "order-service",
    "service.namespace": "production",
    "service.version": "2.1.0",
})

provider = TracerProvider(resource=resource)
exporter = OTLPSpanExporter(
    endpoint="otel-collector.observability:4317",
    insecure=True,
)
provider.add_span_processor(BatchSpanProcessor(exporter))
trace.set_tracer_provider(provider)

# Auto-instrument Flask and outgoing HTTP requests
from flask import Flask
app = Flask(__name__)
FlaskInstrumentor().instrument_app(app)
RequestsInstrumentor().instrument()

tracer = trace.get_tracer(__name__)

@app.route('/orders', methods=['POST'])
def create_order():
    with tracer.start_as_current_span("create_order") as span:
        span.set_attribute("order.type", "standard")

        # This outgoing request will carry the trace context
        response = requests.post('http://payment-service/charge', json=order_data)

        with tracer.start_as_current_span("save_to_database"):
            # Database operation
            db.save(order)

        return jsonify({"status": "created"})
```

### Go with OpenTelemetry

```go
package main

import (
    "context"
    "net/http"

    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
    "go.opentelemetry.io/otel/propagation"
    "go.opentelemetry.io/otel/sdk/resource"
    sdktrace "go.opentelemetry.io/otel/sdk/trace"
    semconv "go.opentelemetry.io/otel/semconv/v1.21.0"
    "go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
    "go.opentelemetry.io/contrib/propagators/b3"
)

func initTracer() (*sdktrace.TracerProvider, error) {
    exporter, err := otlptracegrpc.New(context.Background(),
        otlptracegrpc.WithEndpoint("otel-collector.observability:4317"),
        otlptracegrpc.WithInsecure(),
    )
    if err != nil {
        return nil, err
    }

    tp := sdktrace.NewTracerProvider(
        sdktrace.WithBatcher(exporter),
        sdktrace.WithResource(resource.NewWithAttributes(
            semconv.SchemaURL,
            semconv.ServiceName("order-service"),
            semconv.ServiceVersion("2.1.0"),
        )),
    )

    otel.SetTracerProvider(tp)

    // Set up propagators for both W3C and B3
    otel.SetTextMapPropagator(propagation.NewCompositeTextMapPropagator(
        propagation.TraceContext{},
        propagation.Baggage{},
        b3.New(b3.WithInjectEncoding(b3.B3MultipleHeader)),
    ))

    return tp, nil
}

func main() {
    tp, _ := initTracer()
    defer tp.Shutdown(context.Background())

    handler := otelhttp.NewHandler(http.HandlerFunc(orderHandler), "create-order")
    http.Handle("/orders", handler)
    http.ListenAndServe(":8080", nil)
}
```

### Node.js with OpenTelemetry

```javascript
const { NodeTracerProvider } = require('@opentelemetry/sdk-trace-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-grpc');
const { BatchSpanProcessor } = require('@opentelemetry/sdk-trace-base');
const { Resource } = require('@opentelemetry/resources');
const { SEMRESATTRS_SERVICE_NAME } = require('@opentelemetry/semantic-conventions');
const { W3CTraceContextPropagator } = require('@opentelemetry/core');
const { B3Propagator, B3InjectEncoding } = require('@opentelemetry/propagator-b3');
const { CompositePropagator } = require('@opentelemetry/core');
const { registerInstrumentations } = require('@opentelemetry/instrumentation');
const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http');
const { ExpressInstrumentation } = require('@opentelemetry/instrumentation-express');

const opentelemetry = require('@opentelemetry/api');

// Configure propagators
opentelemetry.propagation.setGlobalPropagator(
  new CompositePropagator({
    propagators: [
      new W3CTraceContextPropagator(),
      new B3Propagator({ injectEncoding: B3InjectEncoding.MULTI_HEADER }),
    ],
  })
);

const provider = new NodeTracerProvider({
  resource: new Resource({
    [SEMRESATTRS_SERVICE_NAME]: 'order-service',
  }),
});

const exporter = new OTLPTraceExporter({
  url: 'grpc://otel-collector.observability:4317',
});

provider.addSpanProcessor(new BatchSpanProcessor(exporter));
provider.register();

registerInstrumentations({
  instrumentations: [
    new HttpInstrumentation(),
    new ExpressInstrumentation(),
  ],
});
```

## The Critical Requirement: Header Forwarding

Even if your application has OpenTelemetry instrumentation, traces will be broken if the application doesn't forward context headers to downstream services. This is the single most common reason for disconnected traces.

The Envoy proxy creates the trace context for inbound requests. Your application MUST:

1. Extract the trace context from incoming request headers
2. Use that context as the parent for any spans it creates
3. Inject the context into headers of outgoing requests

OpenTelemetry auto-instrumentation libraries (like the ones shown above) handle this automatically for supported frameworks. If you use a framework that doesn't have auto-instrumentation, you need to manually propagate:

```python
from opentelemetry import propagate

# Incoming request: extract context
incoming_headers = dict(request.headers)
ctx = propagate.extract(incoming_headers)

# Create a span with the extracted context as parent
with tracer.start_as_current_span("my-operation", context=ctx):
    # Outgoing request: inject context
    outgoing_headers = {}
    propagate.inject(outgoing_headers)
    response = requests.get('http://next-service/api', headers=outgoing_headers)
```

## Correlating Metrics with Traces

To connect metrics to traces, use exemplars. OpenTelemetry metrics can include trace IDs as exemplars, linking a specific metric data point to the trace that produced it:

```python
from opentelemetry import metrics
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter

meter = metrics.get_meter(__name__)
request_counter = meter.create_counter(
    "app.requests",
    description="Number of requests processed",
)

# When recording a metric, the current span context is automatically captured as an exemplar
request_counter.add(1, {"endpoint": "/orders", "method": "POST"})
```

## Resource Attribute Alignment

For correlation to work well in backends like Grafana, resource attributes should be consistent between Istio and application telemetry:

```yaml
# Istio custom tags (in Telemetry resource)
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: resource-tags
  namespace: default
spec:
  tracing:
  - providers:
    - name: otel
    customTags:
      service.namespace:
        literal:
          value: "production"
      k8s.cluster.name:
        literal:
          value: "us-east-1"
```

Make sure your application sets the same attributes:

```python
resource = Resource.create({
    "service.name": "order-service",
    "service.namespace": "production",
    "k8s.cluster.name": "us-east-1",
})
```

## Viewing Correlated Data

In a properly configured system, a single trace shows both proxy and application spans. In Grafana Tempo or Jaeger, you will see:

```
[proxy] ingress -> order-service (2ms)
  [app] create_order (150ms)
    [app] validate_input (5ms)
    [proxy] egress -> payment-service (80ms)
      [proxy] ingress -> payment-service (78ms)
        [app] process_payment (70ms)
          [app] charge_card (60ms)
    [app] save_to_database (55ms)
```

The proxy spans show the network time. The application spans show the business logic time. Together, they account for the full request duration.

## Debugging Correlation Issues

If proxy and application spans appear as separate traces:

```bash
# Check if the application is receiving trace headers
kubectl exec $POD -c my-app -- curl -v http://localhost:8080/orders -H "traceparent: 00-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-bbbbbbbbbbbbbbbb-01"

# Verify the trace ID matches in both proxy and app logs
kubectl logs $POD -c istio-proxy | grep "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
kubectl logs $POD -c my-app | grep "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
```

If the trace IDs don't match, the application is creating new traces instead of using the propagated context. Check your propagator configuration and make sure the auto-instrumentation is actually extracting the incoming headers.

Correlation between Istio and application telemetry is what turns raw observability data into actionable insights. The setup requires attention to trace context propagation and consistent resource attributes, but once it's working, you get a unified view of network and application behavior that makes debugging distributed systems significantly easier.
