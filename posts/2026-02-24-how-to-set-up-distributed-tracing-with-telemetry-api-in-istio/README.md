# How to Set Up Distributed Tracing with Telemetry API in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Telemetry API, Distributed Tracing, Jaeger, Observability

Description: Configure distributed tracing in Istio using the Telemetry API with Jaeger, Zipkin, or OpenTelemetry Collector backends.

---

Distributed tracing shows you the full journey of a request as it passes through multiple services. When a user hits your API and the request touches 8 different microservices before returning a response, tracing lets you see exactly where time was spent and where things went wrong.

Istio makes tracing easier by automatically generating trace spans at the proxy level. The Telemetry API gives you control over sampling rates, trace providers, and custom tags without needing to modify your application code.

## How Tracing Works in Istio

Every Envoy sidecar in your mesh can generate trace spans. When a request arrives at a sidecar, it:

1. Checks for incoming trace headers (B3, W3C Trace Context, etc.)
2. If headers exist, continues the trace. If not, starts a new trace (based on sampling decision).
3. Creates a span for the local processing
4. Forwards trace headers to the upstream service
5. Reports the span to the configured trace backend

The key thing to understand is that Istio's sidecars handle span creation automatically, but your application code needs to propagate trace headers between inbound and outbound requests. Without header propagation, you get disconnected spans instead of a coherent trace.

## Setting Up a Trace Backend

You need somewhere to store and visualize traces. The most common options are:

### Jaeger

Install Jaeger as an Istio addon:

```bash
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.22/samples/addons/jaeger.yaml
```

Verify it's running:

```bash
kubectl get pods -n istio-system -l app=jaeger
```

### Zipkin

```bash
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.22/samples/addons/extras/zipkin.yaml
```

### OpenTelemetry Collector

For production setups, the OpenTelemetry Collector gives you more flexibility:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: otel-collector
  namespace: observability
spec:
  replicas: 1
  selector:
    matchLabels:
      app: otel-collector
  template:
    metadata:
      labels:
        app: otel-collector
    spec:
      containers:
        - name: collector
          image: otel/opentelemetry-collector-contrib:0.93.0
          ports:
            - containerPort: 4317  # gRPC OTLP
            - containerPort: 9411  # Zipkin
          volumeMounts:
            - name: config
              mountPath: /etc/otelcol
      volumes:
        - name: config
          configMap:
            name: otel-collector-config
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: otel-collector-config
  namespace: observability
data:
  config.yaml: |
    receivers:
      zipkin:
        endpoint: 0.0.0.0:9411
      otlp:
        protocols:
          grpc:
            endpoint: 0.0.0.0:4317
    processors:
      batch:
        timeout: 5s
        send_batch_size: 1024
    exporters:
      otlp:
        endpoint: "jaeger-collector.observability:4317"
        tls:
          insecure: true
    service:
      pipelines:
        traces:
          receivers: [zipkin, otlp]
          processors: [batch]
          exporters: [otlp]
---
apiVersion: v1
kind: Service
metadata:
  name: otel-collector
  namespace: observability
spec:
  selector:
    app: otel-collector
  ports:
    - name: grpc-otlp
      port: 4317
      targetPort: 4317
    - name: zipkin
      port: 9411
      targetPort: 9411
```

## Configuring Trace Providers in MeshConfig

Before using the Telemetry API, register your trace provider in MeshConfig:

### Zipkin Provider (works with Jaeger too)

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: istio
  namespace: istio-system
data:
  mesh: |
    extensionProviders:
      - name: zipkin
        zipkin:
          service: zipkin.istio-system.svc.cluster.local
          port: 9411
```

### OpenTelemetry Provider

```yaml
extensionProviders:
  - name: otel-tracing
    opentelemetry:
      service: otel-collector.observability.svc.cluster.local
      port: 4317
```

After updating MeshConfig, restart istiod:

```bash
kubectl rollout restart deployment istiod -n istio-system
```

## Configuring Tracing with the Telemetry API

Now create a Telemetry resource to enable tracing mesh-wide:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: default
  namespace: istio-system
spec:
  tracing:
    - providers:
        - name: zipkin
      randomSamplingPercentage: 1.0
```

This enables tracing for 1% of all requests. For production, 1-5% is typical. For development, you can set it to 100%.

Apply and generate some traffic:

```bash
kubectl apply -f tracing-telemetry.yaml

# Generate traffic
for i in $(seq 1 100); do
  curl -s http://your-service/api/test
done
```

## Controlling Sampling Rate

The sampling rate determines what fraction of requests generate traces. This is the most important tuning knob for tracing.

### Fixed Sampling

```yaml
spec:
  tracing:
    - providers:
        - name: zipkin
      randomSamplingPercentage: 5.0  # 5% of requests
```

### Different Rates per Namespace

Set a low rate mesh-wide and higher rates for specific namespaces:

```yaml
# Mesh-wide: 1% sampling
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: default
  namespace: istio-system
spec:
  tracing:
    - providers:
        - name: zipkin
      randomSamplingPercentage: 1.0
---
# Development namespace: 100% sampling
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: high-sampling
  namespace: dev
spec:
  tracing:
    - providers:
        - name: zipkin
      randomSamplingPercentage: 100.0
```

## Adding Custom Tags to Traces

Custom tags enrich your traces with additional context:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: default
  namespace: istio-system
spec:
  tracing:
    - providers:
        - name: zipkin
      randomSamplingPercentage: 5.0
      customTags:
        environment:
          literal:
            value: "production"
        region:
          environment:
            name: "REGION"
            defaultValue: "unknown"
        user_id:
          header:
            name: "x-user-id"
            defaultValue: "anonymous"
```

Three types of custom tags:

- **literal**: A fixed value, same for all traces
- **environment**: Read from an environment variable on the proxy
- **header**: Read from a request header

Custom tags show up as span attributes in your trace backend, making it easier to filter and search.

## Header Propagation

This is the part that trips people up. Istio's sidecars generate spans automatically, but your application code must forward trace headers between incoming and outgoing requests. Without this, you get individual spans for each service but they're not connected into a single trace.

The headers your application needs to propagate:

For B3 format (default):
- `x-request-id`
- `x-b3-traceid`
- `x-b3-spanid`
- `x-b3-parentspanid`
- `x-b3-sampled`
- `x-b3-flags`

For W3C Trace Context:
- `traceparent`
- `tracestate`

In a Python Flask app, this looks like:

```python
import requests
from flask import Flask, request

app = Flask(__name__)

TRACE_HEADERS = [
    'x-request-id', 'x-b3-traceid', 'x-b3-spanid',
    'x-b3-parentspanid', 'x-b3-sampled', 'x-b3-flags',
    'traceparent', 'tracestate',
]

@app.route('/api/process')
def process():
    headers = {}
    for h in TRACE_HEADERS:
        if h in request.headers:
            headers[h] = request.headers[h]

    # Forward headers to downstream service
    response = requests.get('http://downstream-service/api/data', headers=headers)
    return response.text
```

## Viewing Traces

Access your trace backend:

```bash
# Jaeger
istioctl dashboard jaeger

# Zipkin
istioctl dashboard zipkin
```

Or port-forward directly:

```bash
kubectl port-forward svc/tracing 16686:16686 -n istio-system
```

In the Jaeger UI, search for traces by service name, operation, tags, or duration. Look for:

- Long traces that indicate latency bottlenecks
- Traces with error spans
- Traces with unusual numbers of spans (might indicate retry storms)

## Troubleshooting

**No traces appearing**: Check that the sampling rate isn't 0%. Also verify the provider configuration in MeshConfig matches the actual service endpoint.

**Disconnected spans**: Your application isn't propagating trace headers. Add header forwarding to your application code.

**Missing spans**: Make sure the sidecar is injected on all services in the request path. Services without sidecars don't generate spans.

**Traces only have one span**: Same as disconnected spans - header propagation issue, or the downstream service doesn't have a sidecar.

```bash
# Verify sidecar injection
kubectl get pods -n your-namespace -o jsonpath='{.items[*].spec.containers[*].name}' | tr ' ' '\n' | sort | uniq
```

You should see `istio-proxy` in the container list for every pod.

Distributed tracing with the Telemetry API is straightforward to set up. The biggest time investment is making sure your applications propagate trace headers correctly. Once that's in place, you get end-to-end request visibility across your entire mesh for free.
