# How to Integrate Istio with Jaeger for Tracing

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Jaeger, Distributed Tracing, Observability, Kubernetes

Description: A hands-on guide to setting up Jaeger distributed tracing with Istio to trace requests across microservices and debug latency issues.

---

Distributed tracing is one of those features that you don't realize you need until you're debugging a latency issue across five microservices. Jaeger, originally built by Uber, is one of the most popular open-source tracing backends. When integrated with Istio, it captures traces automatically for every request flowing through the mesh, giving you a visual timeline of how requests propagate across your services.

## How Tracing Works in Istio

Envoy sidecars generate trace spans for every request they handle. Each span includes timing data, HTTP metadata, and the relationship to other spans in the same trace. Envoy sends these spans to a tracing collector (Jaeger in this case).

One critical thing to understand: Istio generates the spans, but your application needs to propagate trace context headers. When Service A calls Service B, Service A's sidecar creates a span and adds trace headers to the outgoing request. Service B's sidecar creates another span using those headers. But if Service B then calls Service C, it needs to forward the same trace headers. If B doesn't pass them along, the trace breaks.

The headers to propagate are:

- `x-request-id`
- `x-b3-traceid`
- `x-b3-spanid`
- `x-b3-parentspanid`
- `x-b3-sampled`
- `x-b3-flags`
- `b3`
- `traceparent`
- `tracestate`

Most HTTP frameworks have middleware or libraries that handle this automatically.

## Installing Jaeger

The quickest way for testing:

```bash
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/jaeger.yaml
```

Verify it's running:

```bash
kubectl get pods -n istio-system -l app=jaeger
```

This deploys Jaeger with in-memory storage, which means traces are lost when the pod restarts. Good for testing, not for production.

## Configuring Istio for Jaeger

Istio needs to know where to send traces. Configure this through the mesh config:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    enableTracing: true
    defaultConfig:
      tracing:
        sampling: 100.0
        zipkin:
          address: jaeger-collector.istio-system.svc:9411
    extensionProviders:
    - name: jaeger
      zipkin:
        service: jaeger-collector.istio-system.svc.cluster.local
        port: 9411
```

The sampling rate of 100.0 means 100% of requests are traced. For production, set this much lower - typically 1.0 (1%) to keep overhead manageable.

If you prefer to use the Telemetry API (recommended for newer Istio versions):

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: mesh-tracing
  namespace: istio-system
spec:
  tracing:
  - providers:
    - name: jaeger
    randomSamplingPercentage: 100.0
```

## Accessing the Jaeger UI

```bash
istioctl dashboard jaeger
```

This opens the Jaeger UI in your browser. You'll see a search interface where you can:

- Select a service from the dropdown
- Filter by operation (HTTP method + path)
- Set a time range
- Filter by tags (e.g., `http.status_code=500`)
- Set minimum and maximum duration

## Generating Test Traces

Deploy a sample application to see traces:

```bash
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/bookinfo/platform/kube/bookinfo.yaml
```

Send some traffic:

```bash
for i in $(seq 1 20); do
  kubectl exec deploy/sleep -- curl -s -o /dev/null http://productpage:9080/productpage
done
```

Now open Jaeger, select `productpage.default` as the service, and click "Find Traces". You should see traces showing the full request flow: productpage -> reviews -> ratings.

## Reading Traces

Each trace shows up as a row with the service name, number of spans, and total duration. Click on a trace to expand it.

The trace view shows a timeline:

```text
productpage (200ms total)
├── reviews (150ms)
│   └── ratings (50ms)
└── details (30ms)
```

Each span shows:
- Start time and duration
- Service name and operation
- HTTP method, URL, status code
- Any errors or warnings

The gaps between spans represent network latency and processing overhead. If there's a large gap between when a span ends and the next one starts, there might be queuing or processing delay in the application.

## Finding Slow Requests

Jaeger's search lets you filter by duration:

1. Select the service
2. Set "Min Duration" to something like `500ms`
3. Click "Find Traces"

This shows only slow requests, making it easy to find performance bottlenecks.

## Comparing Traces

Jaeger supports trace comparison. Select two traces and click "Compare" to see a side-by-side diff. This is useful for comparing a fast request with a slow request to spot what's different.

## Production Jaeger Setup

For production, you need persistent storage and proper scaling. The most common setup uses Elasticsearch or Cassandra as the backend.

### Using Elasticsearch

Deploy Jaeger with the Jaeger Operator:

```bash
# Install the Jaeger Operator
kubectl create namespace observability
kubectl apply -f https://github.com/jaegertracing/jaeger-operator/releases/download/v1.51.0/jaeger-operator.yaml -n observability
```

Create a Jaeger instance with Elasticsearch:

```yaml
apiVersion: jaegertracing.io/v1
kind: Jaeger
metadata:
  name: jaeger-production
  namespace: istio-system
spec:
  strategy: production
  storage:
    type: elasticsearch
    options:
      es:
        server-urls: https://elasticsearch.logging.svc:9200
        index-prefix: jaeger
        tls:
          ca: /es/certificates/ca.crt
    secretName: jaeger-es-secret
  collector:
    replicas: 2
    resources:
      limits:
        cpu: "1"
        memory: 1Gi
  query:
    replicas: 2
    resources:
      limits:
        cpu: 500m
        memory: 512Mi
```

### Using Cassandra

```yaml
apiVersion: jaegertracing.io/v1
kind: Jaeger
metadata:
  name: jaeger-production
  namespace: istio-system
spec:
  strategy: production
  storage:
    type: cassandra
    options:
      cassandra:
        servers: cassandra.database.svc
        keyspace: jaeger_v1_production
    cassandraCreateSchema:
      datacenter: dc1
      mode: prod
```

## Adjusting Sampling Rate

100% sampling is expensive. For production, reduce it:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: mesh-tracing
  namespace: istio-system
spec:
  tracing:
  - providers:
    - name: jaeger
    randomSamplingPercentage: 1.0
```

You can also set different rates for different services:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: critical-service-tracing
  namespace: production
spec:
  selector:
    matchLabels:
      app: payment-service
  tracing:
  - providers:
    - name: jaeger
    randomSamplingPercentage: 10.0
```

This traces 10% of requests for the payment service while the mesh default handles everything else at 1%.

## Adding Custom Tags

Add custom tags to spans through the Telemetry API:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: custom-tags
  namespace: istio-system
spec:
  tracing:
  - providers:
    - name: jaeger
    customTags:
      environment:
        literal:
          value: production
      cluster:
        literal:
          value: us-east-1
      user_id:
        header:
          name: x-user-id
          defaultValue: "unknown"
```

These tags appear on every span and can be searched in Jaeger.

## Troubleshooting

### No Traces Appearing

1. Check that the Jaeger collector is receiving data:

```bash
kubectl logs -n istio-system deployment/jaeger -c jaeger | grep "span"
```

2. Verify the tracing configuration is applied:

```bash
istioctl pc bootstrap productpage-v1-abc123.default -o json | grep -A 20 "tracing"
```

3. Make sure sampling is not zero:

```bash
kubectl get telemetry -A -o yaml | grep randomSamplingPercentage
```

### Broken Traces (Missing Spans)

If traces show disconnected spans instead of a connected tree, the application isn't propagating trace headers. Add header propagation to your application code.

For example, in Python with Flask:

```python
import requests
from flask import Flask, request

app = Flask(__name__)

TRACE_HEADERS = [
    'x-request-id', 'x-b3-traceid', 'x-b3-spanid',
    'x-b3-parentspanid', 'x-b3-sampled', 'x-b3-flags',
    'b3', 'traceparent', 'tracestate'
]

@app.route('/api')
def api():
    headers = {h: request.headers.get(h) for h in TRACE_HEADERS if request.headers.get(h)}
    response = requests.get('http://backend:8080/data', headers=headers)
    return response.text
```

### High Collector Latency

If the Jaeger collector can't keep up, spans get dropped. Check collector metrics and scale up:

```bash
kubectl scale deployment jaeger-collector -n istio-system --replicas=3
```

## Summary

Jaeger with Istio gives you distributed tracing without modifying your application code (beyond header propagation). Start with the sample addon for development, set up a production instance with persistent storage for production, and tune sampling rates to balance visibility with overhead. The combination of Jaeger traces, Prometheus metrics, and Grafana dashboards gives you complete observability for your service mesh.
