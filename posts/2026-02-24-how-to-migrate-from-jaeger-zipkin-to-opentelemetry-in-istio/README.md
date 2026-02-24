# How to Migrate from Jaeger/Zipkin to OpenTelemetry in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, OpenTelemetry, Jaeger, Zipkin, Migration, Tracing

Description: A practical migration guide for moving your Istio tracing setup from Jaeger or Zipkin to OpenTelemetry with minimal disruption to your observability.

---

Many Istio installations started with Jaeger or Zipkin for distributed tracing because those were the first-class integrations Istio offered. Now that OpenTelemetry has matured and Istio has solid OTLP support, migrating to OpenTelemetry makes sense. You get a vendor-neutral protocol, better tooling, and a unified pipeline for metrics, traces, and logs. The migration can be done gradually without losing trace visibility.

## Why Migrate?

Before getting into the how, here is why teams are making this move:

- **Protocol standardization** - OTLP is becoming the standard. Jaeger and Zipkin both accept OTLP now, so the protocol layer is the same regardless of backend.
- **Unified pipeline** - instead of separate pipelines for metrics (Prometheus) and traces (Jaeger/Zipkin), you get one collector handling everything.
- **Better sampling** - the OpenTelemetry Collector supports tail-based sampling, which keeps error and slow traces while sampling normal ones. Jaeger/Zipkin clients only support head-based sampling.
- **Vendor flexibility** - OTLP export works with any backend. Switching from Jaeger to Tempo or a commercial service is a configuration change, not an infrastructure project.

## Current State: Jaeger Integration

A typical Istio + Jaeger setup looks like this in the IstioOperator:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    enableTracing: true
    defaultConfig:
      tracing:
        sampling: 1.0
        zipkin:
          address: jaeger-collector.observability:9411
```

Istio sends traces to Jaeger using the Zipkin protocol (Jaeger accepts Zipkin-compatible spans on port 9411). The Envoy proxies generate Zipkin-format spans and push them to the Jaeger collector.

## Current State: Zipkin Integration

If you are using Zipkin directly:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    enableTracing: true
    defaultConfig:
      tracing:
        sampling: 1.0
        zipkin:
          address: zipkin.observability:9411
```

The setup is nearly identical. Istio treats both Jaeger and Zipkin the same way at the protocol level.

## Migration Strategy: Dual-Write Approach

The safest migration path runs both the old and new systems in parallel. This way, you can verify the new pipeline is working before decommissioning the old one.

### Phase 1: Deploy OpenTelemetry Collector

Deploy a collector that accepts OTLP and forwards traces to your existing Jaeger/Zipkin as well as any new backend:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: otel-collector-config
  namespace: observability
data:
  config.yaml: |
    receivers:
      otlp:
        protocols:
          grpc:
            endpoint: 0.0.0.0:4317
          http:
            endpoint: 0.0.0.0:4318
      zipkin:
        endpoint: 0.0.0.0:9411

    processors:
      batch:
        timeout: 5s
        send_batch_size: 512
      memory_limiter:
        check_interval: 5s
        limit_mib: 512

    exporters:
      # Keep sending to existing Jaeger
      otlp/jaeger:
        endpoint: "jaeger-collector.observability:4317"
        tls:
          insecure: true

      # New backend (e.g., Tempo)
      otlp/tempo:
        endpoint: "tempo.observability:4317"
        tls:
          insecure: true

      debug:
        verbosity: basic

    service:
      pipelines:
        traces:
          receivers: [otlp, zipkin]
          processors: [memory_limiter, batch]
          exporters: [otlp/jaeger, otlp/tempo, debug]
```

Deploy the collector:

```bash
kubectl apply -f otel-collector.yaml
```

The collector accepts both OTLP and Zipkin protocols and fans out to both backends. This means you can switch Istio to use OTLP while still keeping Jaeger populated.

### Phase 2: Update Istio to Use OpenTelemetry

Switch Istio from Zipkin to OpenTelemetry protocol:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    enableTracing: true
    defaultConfig:
      tracing:
        sampling: 1.0
    extensionProviders:
    - name: otel-tracing
      opentelemetry:
        service: otel-collector.observability.svc.cluster.local
        port: 4317
    defaultProviders:
      tracing:
      - otel-tracing
```

```bash
istioctl install -f istio-otel.yaml
```

After applying, restart your workloads to pick up the new tracing configuration:

```bash
kubectl rollout restart deployment -n default
kubectl rollout restart deployment -n production
```

### Phase 3: Verify Dual-Write

Check that traces appear in both backends:

```bash
# Check collector is receiving OTLP spans
kubectl logs -n observability -l app=otel-collector --tail=30

# Verify Jaeger still has new traces
kubectl port-forward -n observability svc/jaeger-query 16686:16686
# Open http://localhost:16686 and search for recent traces

# Verify the new backend has traces too
kubectl port-forward -n observability svc/tempo 3200:3200
# Query for recent traces
```

### Phase 4: Remove Old Jaeger Exporter

Once you are confident the new backend is working, remove the Jaeger exporter from the collector:

```yaml
service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [otlp/tempo]
```

And eventually decommission the Jaeger/Zipkin deployment:

```bash
kubectl delete deployment jaeger -n observability
kubectl delete service jaeger-collector jaeger-query -n observability
```

## Migrating Context Propagation

If your applications use Jaeger-specific client libraries for context propagation, you need to migrate them to OpenTelemetry:

**Before (Jaeger client):**

```python
# Python with jaeger-client
from jaeger_client import Config

config = Config(
    config={
        'sampler': {'type': 'const', 'param': 1},
        'local_agent': {'reporting_host': 'localhost', 'reporting_port': 6831},
    },
    service_name='my-service',
)
tracer = config.initialize_tracer()
```

**After (OpenTelemetry SDK):**

```python
# Python with opentelemetry
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource

resource = Resource.create({"service.name": "my-service"})
provider = TracerProvider(resource=resource)
exporter = OTLPSpanExporter(endpoint="otel-collector:4317", insecure=True)
provider.add_span_processor(BatchSpanProcessor(exporter))
trace.set_tracer_provider(provider)

tracer = trace.get_tracer(__name__)
```

**Before (Go with Jaeger):**

```go
// Go with Jaeger client
import "github.com/uber/jaeger-client-go"

cfg := jaegercfg.Configuration{
    ServiceName: "my-service",
    Sampler: &jaegercfg.SamplerConfig{
        Type:  "const",
        Param: 1,
    },
}
tracer, closer, _ := cfg.NewTracer()
```

**After (Go with OpenTelemetry):**

```go
// Go with OpenTelemetry
import (
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
    "go.opentelemetry.io/otel/sdk/trace"
    "go.opentelemetry.io/otel/sdk/resource"
    semconv "go.opentelemetry.io/otel/semconv/v1.21.0"
)

exporter, _ := otlptracegrpc.New(ctx,
    otlptracegrpc.WithEndpoint("otel-collector:4317"),
    otlptracegrpc.WithInsecure(),
)
tp := trace.NewTracerProvider(
    trace.WithBatcher(exporter),
    trace.WithResource(resource.NewWithAttributes(
        semconv.SchemaURL,
        semconv.ServiceName("my-service"),
    )),
)
otel.SetTracerProvider(tp)
```

## Header Propagation Compatibility

During migration, you might have a mix of services using different tracing libraries. Make sure header propagation is compatible:

Istio supports both B3 and W3C Trace Context headers. Configure the mesh to propagate both:

The OpenTelemetry SDK can be configured to extract and inject both formats:

```python
from opentelemetry.propagators.b3 import B3MultiFormat
from opentelemetry.propagate import set_global_textmap
from opentelemetry.propagators.composite import CompositePropagator
from opentelemetry.trace.propagation import TraceContextTextMapPropagator

set_global_textmap(CompositePropagator([
    TraceContextTextMapPropagator(),
    B3MultiFormat(),
]))
```

This ensures that services using the old B3 headers and services using the new W3C Trace Context headers can participate in the same trace.

## Rollback Plan

If something goes wrong during migration, rollback is straightforward:

```yaml
# Revert Istio to Zipkin protocol
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    enableTracing: true
    defaultConfig:
      tracing:
        sampling: 1.0
        zipkin:
          address: jaeger-collector.observability:9411
```

```bash
istioctl install -f istio-jaeger.yaml
kubectl rollout restart deployment -n default
```

The dual-write approach means Jaeger still has data even after switching to OTLP, so you don't lose visibility during the transition.

## Timeline Suggestion

- **Week 1**: Deploy OTel Collector with dual-write, verify it works
- **Week 2**: Switch Istio to OTLP, keep dual-write running
- **Week 3**: Migrate application-level tracing libraries
- **Week 4**: Remove old Jaeger exporter, run solely on new pipeline
- **Week 5**: Decommission old Jaeger/Zipkin infrastructure

The migration from Jaeger or Zipkin to OpenTelemetry is mostly a configuration exercise. The dual-write approach through the OTel Collector makes it safe to do in production without any gap in visibility. Take your time, verify each step, and you will end up with a more flexible and maintainable observability pipeline.
