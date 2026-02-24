# How to Configure Tracing Settings in MeshConfig

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Tracing, MeshConfig, Observability, Distributed Tracing

Description: A practical guide to configuring distributed tracing settings in Istio MeshConfig including sampling rates, trace providers, and custom headers.

---

Distributed tracing shows you the full journey of a request through your mesh - every service it touches, how long each hop takes, and where failures occur. Istio integrates tracing directly into the sidecar proxies, so you get tracing without modifying your application code (with one important caveat that we will cover). MeshConfig is where you control tracing behavior across the entire mesh.

## How Tracing Works in Istio

When a request enters the mesh, the sidecar generates a trace span. As the request moves through services, each sidecar adds its own span. The spans are sent to a tracing backend (like Jaeger, Zipkin, or an OpenTelemetry collector) where they are assembled into a complete trace.

There is one thing Istio cannot do automatically: propagate trace headers between incoming and outgoing requests within your application. Your application must forward headers like `x-request-id`, `x-b3-traceid`, `x-b3-spanid`, and others from incoming requests to any outgoing requests it makes. Without this, you get disconnected spans instead of a connected trace.

## Basic Tracing Configuration

Enable tracing and configure the sampling rate:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    enableTracing: true
    defaultConfig:
      tracing:
        sampling: 1.0
```

The `sampling` value is a percentage (0.0 to 100.0). A value of 1.0 means 1% of requests are traced. For development, you might use 100.0 (trace everything). For production, 1.0 or lower is common to reduce overhead and storage costs.

## Configuring Trace Providers

### Zipkin

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
          address: zipkin.istio-system:9411
```

### OpenTelemetry Collector

For modern setups, sending traces to an OpenTelemetry collector is the recommended approach:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    enableTracing: true
    extensionProviders:
      - name: otel
        opentelemetry:
          service: otel-collector.observability.svc.cluster.local
          port: 4317
    defaultConfig:
      tracing:
        sampling: 1.0
```

Then use the Telemetry API to activate the provider:

```yaml
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: mesh-tracing
  namespace: istio-system
spec:
  tracing:
    - providers:
        - name: otel
      randomSamplingPercentage: 1.0
```

### Jaeger

Jaeger is compatible with the Zipkin protocol, so you can use the Zipkin configuration:

```yaml
meshConfig:
  defaultConfig:
    tracing:
      zipkin:
        address: jaeger-collector.observability:9411
```

Or use the OpenTelemetry path if your Jaeger instance supports OTLP:

```yaml
meshConfig:
  extensionProviders:
    - name: jaeger-otel
      opentelemetry:
        service: jaeger-collector.observability.svc.cluster.local
        port: 4317
```

## Setting Sampling Rate

The sampling rate is a tradeoff between visibility and overhead. Higher sampling gives you more data but costs more in terms of CPU, network, and storage.

### Mesh-Wide Sampling

```yaml
meshConfig:
  defaultConfig:
    tracing:
      sampling: 5.0  # 5% of requests
```

### Per-Workload Sampling

Override the sampling rate for specific services using pod annotations:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-service
spec:
  template:
    metadata:
      annotations:
        proxy.istio.io/config: |
          tracing:
            sampling: 100.0
```

This traces every request to the payment service while keeping the mesh default at a lower rate. Useful for services you are actively debugging.

### Using the Telemetry API

The Telemetry API provides more flexible sampling control:

```yaml
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: production-tracing
  namespace: production
spec:
  tracing:
    - providers:
        - name: otel
      randomSamplingPercentage: 10.0
```

Different namespaces can have different sampling rates:

```yaml
# High sampling for staging
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: staging-tracing
  namespace: staging
spec:
  tracing:
    - providers:
        - name: otel
      randomSamplingPercentage: 50.0
```

## Custom Trace Tags

Add custom tags to all spans for better filtering and correlation:

```yaml
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: custom-tags
  namespace: istio-system
spec:
  tracing:
    - providers:
        - name: otel
      customTags:
        environment:
          literal:
            value: production
        cluster:
          literal:
            value: us-east-1
        user-id:
          header:
            name: x-user-id
            defaultValue: unknown
```

Tag types:
- `literal`: Static value
- `header`: Extract from request header
- `environment`: Extract from environment variable

## Trace Context Propagation

As mentioned earlier, your application must propagate trace headers. The headers Istio uses depend on the tracing system:

For Zipkin/B3 format:
- `x-request-id`
- `x-b3-traceid`
- `x-b3-spanid`
- `x-b3-parentspanid`
- `x-b3-sampled`
- `x-b3-flags`

For W3C Trace Context (used by OpenTelemetry):
- `traceparent`
- `tracestate`

Here is a simple example of header propagation in Python:

```python
import requests
from flask import Flask, request

app = Flask(__name__)

TRACE_HEADERS = [
    'x-request-id', 'x-b3-traceid', 'x-b3-spanid',
    'x-b3-parentspanid', 'x-b3-sampled', 'x-b3-flags',
    'traceparent', 'tracestate',
]

@app.route('/api/order')
def create_order():
    headers = {}
    for h in TRACE_HEADERS:
        val = request.headers.get(h)
        if val:
            headers[h] = val

    # Forward trace headers to downstream calls
    resp = requests.get('http://inventory-service:8080/check', headers=headers)
    return resp.text
```

## Verifying Tracing Configuration

Check that tracing is configured on a specific proxy:

```bash
istioctl proxy-config bootstrap deploy/my-service -n default -o json | \
  grep -A20 "tracing"
```

Generate some test traffic and verify traces appear in your backend:

```bash
# Send a few requests
for i in $(seq 1 10); do
  kubectl exec deploy/sleep -c sleep -n sample -- \
    curl -sS http://httpbin.sample:8000/headers
done
```

Then check your tracing UI (Jaeger, Zipkin, etc.) for the traces.

## Reducing Tracing Overhead

For high-traffic production environments, tracing overhead can add up. Here are strategies to minimize it:

1. Keep sampling rates low (0.1-1% for high-traffic services)
2. Use the Telemetry API to set higher sampling only on services being debugged
3. Use OpenTelemetry collector with tail-based sampling, which makes sampling decisions after seeing the complete trace (keeping all error traces while sampling successful ones)
4. Set a maximum tag length to prevent large headers from inflating span data

```yaml
meshConfig:
  defaultConfig:
    tracing:
      sampling: 0.1
      max_path_tag_length: 256
```

Tracing configuration in MeshConfig is straightforward to set up but requires thought about sampling rates and trace header propagation. Start with a conservative sampling rate, verify that traces are complete (not disconnected), and tune the sampling based on your debugging needs and storage budget.
