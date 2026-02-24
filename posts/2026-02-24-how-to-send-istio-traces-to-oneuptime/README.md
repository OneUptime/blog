# How to Send Istio Traces to OneUptime

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, OneUptime, Tracing, OpenTelemetry, Observability

Description: Configure Istio to export distributed traces to OneUptime using OpenTelemetry for end-to-end request visibility.

---

Distributed tracing is one of the most valuable observability signals you get from Istio. Every request that flows through the mesh gets traced automatically by the Envoy sidecar proxies. The challenge is getting those traces into a system where you can actually search, analyze, and alert on them. Here's how to pipe Istio traces into OneUptime.

## How Istio Tracing Works

When a request enters the mesh, the Envoy proxy generates a trace span for each hop. These spans contain timing information, HTTP metadata, and relationship data that lets you reconstruct the full journey of a request across services.

Istio supports several tracing protocols:

- OpenTelemetry (OTLP)
- Zipkin
- OpenCensus (legacy)

For OneUptime integration, we'll use OpenTelemetry since it's the modern standard and what OneUptime natively supports.

One important thing to understand: Istio can only trace requests that propagate trace headers. Your application code needs to forward headers like `traceparent`, `x-request-id`, `x-b3-traceid`, etc. The sidecar doesn't magically connect spans across services if the application strips these headers.

## Step 1: Configure Istio for OpenTelemetry Tracing

First, configure Istio's mesh to send traces using the OpenTelemetry protocol. You'll point it at an OpenTelemetry Collector that runs in your cluster:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    enableTracing: true
    extensionProviders:
    - name: otel-tracing
      opentelemetry:
        port: 4317
        service: otel-collector.istio-system.svc.cluster.local
        resource_detectors:
          - environment
    defaultConfig:
      tracing:
        sampling: 100.0  # 100% sampling for testing, reduce in production
```

Apply this configuration:

```bash
istioctl install -f istio-tracing-config.yaml -y

# Restart workloads to pick up the new proxy config
kubectl rollout restart deployment -n default
```

Then enable the tracing provider using a Telemetry resource:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: mesh-tracing
  namespace: istio-system
spec:
  tracing:
  - providers:
    - name: otel-tracing
    randomSamplingPercentage: 100
```

```bash
kubectl apply -f mesh-telemetry.yaml
```

## Step 2: Deploy the OpenTelemetry Collector

The collector receives traces from Istio's sidecar proxies and forwards them to OneUptime:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: otel-collector-config
  namespace: istio-system
data:
  config.yaml: |
    receivers:
      otlp:
        protocols:
          grpc:
            endpoint: 0.0.0.0:4317
          http:
            endpoint: 0.0.0.0:4318

    processors:
      batch:
        timeout: 5s
        send_batch_size: 512
      memory_limiter:
        check_interval: 5s
        limit_mib: 512
        spike_limit_mib: 128
      resource:
        attributes:
          - key: environment
            value: production
            action: upsert

    exporters:
      otlp/oneuptime:
        endpoint: "https://otlp.oneuptime.com"
        headers:
          x-oneuptime-token: "${ONEUPTIME_TOKEN}"
        tls:
          insecure: false

    service:
      pipelines:
        traces:
          receivers: [otlp]
          processors: [memory_limiter, batch, resource]
          exporters: [otlp/oneuptime]
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: otel-collector
  namespace: istio-system
spec:
  replicas: 2
  selector:
    matchLabels:
      app: otel-collector
  template:
    metadata:
      labels:
        app: otel-collector
      annotations:
        sidecar.istio.io/inject: "false"
    spec:
      containers:
      - name: otel-collector
        image: otel/opentelemetry-collector-contrib:latest
        args:
        - "--config=/etc/otel/config.yaml"
        env:
        - name: ONEUPTIME_TOKEN
          valueFrom:
            secretKeyRef:
              name: oneuptime-credentials
              key: token
        ports:
        - containerPort: 4317
          name: otlp-grpc
        - containerPort: 4318
          name: otlp-http
        volumeMounts:
        - name: config
          mountPath: /etc/otel
        resources:
          requests:
            cpu: 200m
            memory: 256Mi
          limits:
            cpu: 1000m
            memory: 1Gi
      volumes:
      - name: config
        configMap:
          name: otel-collector-config
---
apiVersion: v1
kind: Service
metadata:
  name: otel-collector
  namespace: istio-system
spec:
  selector:
    app: otel-collector
  ports:
  - name: otlp-grpc
    port: 4317
    targetPort: 4317
  - name: otlp-http
    port: 4318
    targetPort: 4318
```

Apply everything:

```bash
kubectl apply -f otel-collector.yaml
```

Note the `sidecar.istio.io/inject: "false"` annotation on the collector pod. You don't want the collector itself to be part of the mesh, as that would create a tracing loop.

## Step 3: Ensure Header Propagation in Your Applications

This is the part that people often miss. Istio's sidecar can create trace spans, but your application needs to propagate the trace context headers between incoming and outgoing requests. The headers to propagate are:

```
traceparent
tracestate
x-request-id
x-b3-traceid
x-b3-spanid
x-b3-parentspanid
x-b3-sampled
x-b3-flags
```

Here's an example in Python:

```python
import requests
from flask import Flask, request

app = Flask(__name__)

TRACE_HEADERS = [
    'traceparent',
    'tracestate',
    'x-request-id',
    'x-b3-traceid',
    'x-b3-spanid',
    'x-b3-parentspanid',
    'x-b3-sampled',
    'x-b3-flags',
]

@app.route('/api/product')
def get_product():
    # Forward trace headers to downstream services
    headers = {}
    for header in TRACE_HEADERS:
        value = request.headers.get(header)
        if value:
            headers[header] = value

    # Call downstream service with propagated headers
    reviews = requests.get('http://reviews:8080/reviews', headers=headers)
    return {'product': 'widget', 'reviews': reviews.json()}
```

And in Go:

```go
func handler(w http.ResponseWriter, r *http.Request) {
    traceHeaders := []string{
        "traceparent", "tracestate", "x-request-id",
        "x-b3-traceid", "x-b3-spanid", "x-b3-parentspanid",
        "x-b3-sampled", "x-b3-flags",
    }

    // Create outgoing request
    req, _ := http.NewRequest("GET", "http://reviews:8080/reviews", nil)

    // Propagate trace headers
    for _, h := range traceHeaders {
        if val := r.Header.Get(h); val != "" {
            req.Header.Set(h, val)
        }
    }

    client := &http.Client{}
    resp, err := client.Do(req)
    // handle response...
}
```

## Step 4: Adjust Sampling Rate

Running 100% sampling in production will generate massive amounts of data. Set a reasonable sampling rate based on your traffic volume:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: mesh-tracing
  namespace: istio-system
spec:
  tracing:
  - providers:
    - name: otel-tracing
    randomSamplingPercentage: 1.0  # 1% sampling for production
```

You can also set per-namespace sampling rates:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: critical-service-tracing
  namespace: payments
spec:
  tracing:
  - providers:
    - name: otel-tracing
    randomSamplingPercentage: 10.0  # Higher sampling for critical services
```

## Verifying Traces

Generate some traffic and verify traces are flowing:

```bash
# Generate traffic
for i in $(seq 1 50); do
  kubectl exec deploy/sleep -- curl -s http://httpbin:8000/get > /dev/null
done

# Check the collector logs for export activity
kubectl logs -l app=otel-collector -n istio-system --tail=20

# Verify proxy tracing config
istioctl proxy-config bootstrap <pod-name> -n default | grep -A 10 tracing
```

Once traces appear in OneUptime, you'll see the full request path through your services, with latency breakdowns at each hop. This is incredibly powerful for debugging slow requests, identifying bottlenecks, and understanding your service dependencies.
