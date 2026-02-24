# How to Export Istio Traces via OpenTelemetry Protocol

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, OpenTelemetry, Distributed Tracing, OTLP, Kubernetes

Description: How to configure Istio to export distributed traces using the OpenTelemetry Protocol for vendor-neutral trace collection and analysis.

---

Distributed tracing is one of the most valuable features Istio provides. Every request that flows through the mesh generates trace spans automatically, showing you the full path a request takes across your services. Historically, Istio exported traces to Jaeger or Zipkin. Now, with OpenTelemetry support, you can export traces using the OTLP protocol, which gives you the freedom to send them to any backend that speaks OpenTelemetry.

## How Istio Generates Traces

When a request enters the mesh, the first Envoy proxy it hits creates a root span. As the request propagates through the mesh (service A calls service B, which calls service C), each proxy creates child spans. These spans contain:

- Service name (source and destination)
- Operation name (HTTP method and path, or gRPC service/method)
- Duration (how long the request took at each hop)
- Status (success or error)
- Tags (HTTP status code, request protocol, etc.)

The key thing to understand is that Istio only generates the proxy-level spans. It doesn't instrument your application code. If you want spans from inside your application, your code needs its own OpenTelemetry instrumentation. The proxy spans and application spans connect through trace context propagation headers.

## Configuring the OpenTelemetry Tracing Provider

Set up Istio to use an OpenTelemetry tracing provider:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    enableTracing: true
    extensionProviders:
    - name: otel-tracing
      opentelemetry:
        service: otel-collector.istio-system.svc.cluster.local
        port: 4317
    defaultProviders:
      tracing:
      - otel-tracing
```

```bash
istioctl install -f istio-otel-tracing.yaml
```

This tells every Envoy sidecar to send trace spans to the OpenTelemetry Collector via gRPC on port 4317.

## Deploying the Collector for Traces

Configure the collector to receive and process traces:

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
      probabilistic_sampler:
        sampling_percentage: 10
    exporters:
      otlp:
        endpoint: "jaeger.monitoring:4317"
        tls:
          insecure: true
      debug:
        verbosity: basic
    service:
      pipelines:
        traces:
          receivers: [otlp]
          processors: [memory_limiter, probabilistic_sampler, batch]
          exporters: [otlp, debug]
```

Deploy the collector:

```bash
kubectl apply -f otel-collector.yaml
```

## Controlling Trace Sampling

Sampling determines what percentage of requests generate traces. You have two layers of sampling control:

**Istio-level sampling (at the proxy):**

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      tracing:
        sampling: 10.0
```

This means 10% of requests will have trace spans generated. The remaining 90% won't generate any tracing data at the proxy.

**Collector-level sampling (at the collector):**

```yaml
processors:
  probabilistic_sampler:
    sampling_percentage: 50
```

This drops 50% of traces that arrive at the collector. Combined with 10% proxy sampling, you end up keeping 5% of all requests.

## Per-Namespace and Per-Workload Tracing

Use the Telemetry API for granular control:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: high-sample-tracing
  namespace: checkout
spec:
  tracing:
  - providers:
    - name: otel-tracing
    randomSamplingPercentage: 50.0
---
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: low-sample-tracing
  namespace: internal-tools
spec:
  tracing:
  - providers:
    - name: otel-tracing
    randomSamplingPercentage: 0.1
```

This traces 50% of checkout requests but only 0.1% of internal tool requests.

For a specific workload:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: payment-tracing
  namespace: checkout
spec:
  selector:
    matchLabels:
      app: payment-service
  tracing:
  - providers:
    - name: otel-tracing
    randomSamplingPercentage: 100.0
```

## Adding Custom Span Tags

Enrich your trace spans with custom attributes:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: custom-span-tags
  namespace: default
spec:
  tracing:
  - providers:
    - name: otel-tracing
    customTags:
      cluster_name:
        literal:
          value: "production-us-east"
      user_id:
        header:
          name: x-user-id
          defaultValue: "anonymous"
      deploy_version:
        environment:
          name: DEPLOY_VERSION
          defaultValue: "unknown"
```

Custom tags help you filter and search traces later. Adding things like cluster name, user ID, or deployment version makes trace analysis much more productive.

## Context Propagation Headers

For traces to work end-to-end, your application needs to propagate trace context headers between requests. Istio uses these headers:

- `traceparent` (W3C Trace Context)
- `tracestate` (W3C Trace Context)
- `x-request-id`
- `x-b3-traceid`, `x-b3-spanid`, `x-b3-parentspanid`, `x-b3-sampled` (B3 format)

Your application doesn't need to understand these headers. It just needs to copy them from incoming requests to outgoing requests. In most HTTP frameworks, this means extracting the headers from the incoming request and attaching them to any outgoing HTTP calls.

Example in Python:

```python
import requests
from flask import Flask, request

app = Flask(__name__)

PROPAGATION_HEADERS = [
    'traceparent', 'tracestate',
    'x-request-id',
    'x-b3-traceid', 'x-b3-spanid',
    'x-b3-parentspanid', 'x-b3-sampled', 'x-b3-flags',
]

@app.route('/api/data')
def get_data():
    headers = {h: request.headers.get(h) for h in PROPAGATION_HEADERS if request.headers.get(h)}
    response = requests.get('http://backend-service/data', headers=headers)
    return response.json()
```

## Exporting to Different Backends

The collector can send traces to various backends:

**Jaeger:**

```yaml
exporters:
  otlp:
    endpoint: "jaeger-collector.monitoring:4317"
    tls:
      insecure: true
```

**Tempo (Grafana):**

```yaml
exporters:
  otlp:
    endpoint: "tempo.monitoring:4317"
    tls:
      insecure: true
```

**Zipkin:**

```yaml
exporters:
  zipkin:
    endpoint: "http://zipkin.monitoring:9411/api/v2/spans"
```

**Cloud providers (example: Google Cloud Trace):**

```yaml
exporters:
  googlecloud:
    project: my-gcp-project
```

## Verifying Traces Are Working

Generate some traffic and check:

```bash
# Generate traffic
kubectl run curl-test --image=curlimages/curl:7.85.0 --rm -it -- \
  sh -c "for i in \$(seq 1 20); do curl -s http://my-service/api; done"

# Check collector logs
kubectl logs -n istio-system -l app=otel-collector --tail=30

# Check Envoy tracing stats
POD=$(kubectl get pod -l app=my-service -o jsonpath='{.items[0].metadata.name}')
kubectl exec $POD -c istio-proxy -- pilot-agent request GET /stats | grep tracing
```

Look for `tracing.opentelemetry.spans_sent` in the stats output.

## Trace Processing in the Collector

Add processing steps to enrich or filter traces:

```yaml
processors:
  attributes:
    actions:
    - key: environment
      value: production
      action: upsert
  span:
    name:
      from_attributes:
      - http.method
      - http.route
      separator: " "
  tail_sampling:
    decision_wait: 10s
    policies:
    - name: errors-only
      type: status_code
      status_code:
        status_codes:
        - ERROR
    - name: slow-requests
      type: latency
      latency:
        threshold_ms: 1000
    - name: sample-rest
      type: probabilistic
      probabilistic:
        sampling_percentage: 5
```

Tail-based sampling is particularly powerful. Instead of deciding at the start whether to trace a request, you wait until the trace is complete and then decide based on the outcome. This lets you keep all error traces and slow traces while sampling normal traces at a low rate.

## Troubleshooting Traces

If traces don't appear in your backend:

```bash
# Check if tracing is enabled
istioctl analyze -n default

# Verify the extension provider
kubectl get configmap istio -n istio-system -o jsonpath='{.data.mesh}' | grep -A 10 extensionProviders

# Check proxy logs for tracing errors
kubectl logs -l app=my-service -c istio-proxy | grep -i "trace\|otel\|grpc"

# Test collector connectivity from a proxy
kubectl exec $POD -c istio-proxy -- curl -v otel-collector.istio-system:4317
```

If you see traces for some services but not others, check that those services are propagating the context headers correctly. Missing header propagation is the most common reason for broken traces.

OpenTelemetry trace export from Istio gives you the flexibility to use any tracing backend while maintaining the automatic instrumentation that the mesh provides. The combination of proxy-generated spans and application-level OpenTelemetry instrumentation gives you complete visibility into request flows across your entire system.
