# How to Set Up Observability for Federated Istio Meshes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Federation, Observability, Tracing, Metrics, Kubernetes

Description: How to build a unified observability stack for federated Istio meshes covering distributed tracing, metrics aggregation, and log correlation.

---

When your services span multiple federated Istio meshes, observability becomes both more important and more difficult. A request might start in mesh-west, cross a gateway to mesh-east, call three services there, and return. Without proper observability, you have blind spots at every mesh boundary.

This post covers how to set up distributed tracing, centralized metrics, and log correlation across federated meshes so you get full visibility into cross-mesh request flows.

## Distributed Tracing Across Meshes

Distributed tracing is arguably the most valuable observability tool for federation. It lets you follow a request as it crosses mesh boundaries and see exactly where time is spent.

### Deploying Jaeger or Zipkin

Deploy a centralized tracing backend that both meshes can report to. Jaeger is a common choice:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: jaeger
  namespace: observability
spec:
  replicas: 1
  selector:
    matchLabels:
      app: jaeger
  template:
    metadata:
      labels:
        app: jaeger
    spec:
      containers:
        - name: jaeger
          image: jaegertracing/all-in-one:1.53
          ports:
            - containerPort: 16686  # UI
            - containerPort: 4317   # OTLP gRPC
            - containerPort: 4318   # OTLP HTTP
          env:
            - name: COLLECTOR_OTLP_ENABLED
              value: "true"
---
apiVersion: v1
kind: Service
metadata:
  name: jaeger-collector
  namespace: observability
spec:
  selector:
    app: jaeger
  ports:
    - name: otlp-grpc
      port: 4317
    - name: otlp-http
      port: 4318
    - name: ui
      port: 16686
```

### Configuring Istio to Export Traces

Configure each mesh to send traces to the centralized Jaeger instance. Use the Telemetry API:

```yaml
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: mesh-tracing
  namespace: istio-system
spec:
  tracing:
    - providers:
        - name: jaeger
      randomSamplingPercentage: 10.0
```

And configure the tracing provider in the mesh config:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    extensionProviders:
      - name: jaeger
        opentelemetry:
          port: 4317
          service: jaeger-collector.observability.svc.cluster.local
    defaultConfig:
      tracing:
        sampling: 10.0
```

### Preserving Trace Context Across Gateways

The critical piece for cross-mesh tracing is making sure trace context headers survive the east-west gateway hop. Istio's sidecars automatically propagate these headers:

- `x-request-id`
- `x-b3-traceid`
- `x-b3-spanid`
- `x-b3-parentspanid`
- `x-b3-sampled`
- `traceparent` (W3C Trace Context)
- `tracestate`

The east-west gateway in AUTO_PASSTHROUGH mode preserves these headers because it doesn't terminate the connection. If you're using a different gateway mode, make sure header propagation is configured:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: cross-mesh-tracing
  namespace: istio-system
spec:
  hosts:
    - "*.local"
  gateways:
    - eastwest-gateway
  http:
    - headers:
        request:
          set:
            x-forwarded-client-cert: "%DOWNSTREAM_PEER_SUBJECT%"
      route:
        - destination:
            host: "*.local"
```

Your application services also need to propagate trace headers. If they don't forward the headers on outbound requests, the trace breaks. This is the most common reason for broken traces in federated setups.

## Centralized Metrics with Prometheus Federation

Each mesh has its own Prometheus scraping local metrics. To get a unified view, use Prometheus federation (confusingly, this is different from mesh federation - same word, different concept).

Configure a central Prometheus to scrape from the per-mesh Prometheus instances:

```yaml
scrape_configs:
  - job_name: 'mesh-west-federation'
    scrape_interval: 30s
    honor_labels: true
    metrics_path: '/federate'
    params:
      'match[]':
        - '{__name__=~"istio_.*"}'
        - '{__name__=~"envoy_.*"}'
    static_configs:
      - targets:
          - 'prometheus-west.monitoring.svc:9090'
        labels:
          mesh: 'west'

  - job_name: 'mesh-east-federation'
    scrape_interval: 30s
    honor_labels: true
    metrics_path: '/federate'
    params:
      'match[]':
        - '{__name__=~"istio_.*"}'
        - '{__name__=~"envoy_.*"}'
    static_configs:
      - targets:
          - 'prometheus-east.monitoring.svc:9090'
        labels:
          mesh: 'east'
```

Make sure to add the `mesh` label so you can distinguish metrics from different meshes in your queries.

## Cross-Mesh Dashboards

Build Grafana dashboards that show the complete picture. Here are essential panels:

**Cross-mesh request flow:**

```promql
sum(rate(istio_requests_total{
  source_cluster!=destination_cluster
}[5m])) by (source_cluster, destination_cluster, destination_service_name, response_code)
```

**Gateway throughput:**

```promql
sum(rate(istio_requests_total{
  destination_service_name="istio-eastwestgateway"
}[5m])) by (source_cluster)
```

**End-to-end latency for cross-mesh requests:**

```promql
histogram_quantile(0.95, sum(rate(istio_request_duration_milliseconds_bucket{
  source_cluster!=destination_cluster
}[5m])) by (le, source_cluster, destination_cluster))
```

**Gateway overhead (the latency added by the gateway hop):**

```promql
histogram_quantile(0.95, sum(rate(istio_request_duration_milliseconds_bucket{
  destination_service_name="istio-eastwestgateway",
  reporter="source"
}[5m])) by (le))
```

## Log Correlation

Correlate logs across meshes using the trace ID. Configure Istio access logging to include the trace ID:

```yaml
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: access-logging
  namespace: istio-system
spec:
  accessLogging:
    - providers:
        - name: envoy
      filter:
        expression: "response.code >= 400 || connection.mtls == false"
```

The default Envoy access log format includes `%REQ(X-REQUEST-ID)%`, which you can use to correlate logs across meshes.

For structured logging, consider using a custom access log format:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    accessLogFile: /dev/stdout
    accessLogEncoding: JSON
    accessLogFormat: |
      {
        "trace_id": "%REQ(X-B3-TRACEID)%",
        "span_id": "%REQ(X-B3-SPANID)%",
        "source": "%DOWNSTREAM_REMOTE_ADDRESS%",
        "destination": "%UPSTREAM_HOST%",
        "method": "%REQ(:METHOD)%",
        "path": "%REQ(PATH)%",
        "response_code": "%RESPONSE_CODE%",
        "duration": "%DURATION%",
        "mesh": "west"
      }
```

Ship these logs to a centralized logging platform like Elasticsearch, Loki, or Splunk. Then you can search by trace ID to see the complete request path across both meshes.

## Setting Up Kiali for Multi-Mesh Visualization

Kiali provides a service graph that visualizes traffic flows. For federation, you can set up Kiali to show cross-mesh connections:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: kiali
  namespace: istio-system
data:
  config.yaml: |
    external_services:
      prometheus:
        url: "http://prometheus-central.monitoring:9090"
      tracing:
        enabled: true
        url: "http://jaeger-collector.observability:16686"
    clustering:
      clusters:
        - name: cluster-west
          secret_name: cluster-west-secret
        - name: cluster-east
          secret_name: cluster-east-secret
```

With this configuration, Kiali shows traffic flowing across mesh boundaries in its service graph, making it easy to spot issues visually.

## Alerting on Observability Gaps

It's not enough to set up observability. You also need to alert when observability itself breaks:

```yaml
groups:
  - name: observability-health
    rules:
      - alert: TracingCollectorDown
        expr: up{job="jaeger-collector"} == 0
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Tracing collector is down, traces are being lost"

      - alert: CrossMeshMetricsMissing
        expr: absent(istio_requests_total{source_cluster="cluster-west", destination_cluster="cluster-east"})
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "No cross-mesh metrics detected for 15 minutes"
```

Good observability in federated meshes requires effort across all three pillars: traces, metrics, and logs. Each one gives you a different perspective. Traces show you the request flow, metrics show you trends and patterns, and logs give you the details when something goes wrong. Together, they give you the visibility you need to operate federated meshes with confidence.
