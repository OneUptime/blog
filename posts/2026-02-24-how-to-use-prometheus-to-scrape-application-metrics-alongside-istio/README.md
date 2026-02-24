# How to Use Prometheus to Scrape Application Metrics Alongside Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Prometheus, Application Metrics, Monitoring, Kubernetes

Description: Combine application-level Prometheus metrics with Istio service mesh metrics using metrics merging, separate scrape configs, and unified dashboards.

---

Istio gives you great network-level metrics - request rates, latency, error rates - without touching your application code. But network metrics only tell part of the story. Your application also generates business-level metrics like queue depths, cache hit rates, active users, and custom counters. The real power comes from combining both types of metrics in a single monitoring stack. This guide covers how to scrape your application's Prometheus metrics alongside Istio's metrics without conflicts or gaps.

## The Challenge

When you add an Istio sidecar to a pod, the sidecar intercepts all network traffic. This means Prometheus can't directly scrape your application's metrics endpoint on the pod's IP anymore - the request goes through Envoy first. Also, your pod now has two processes exposing Prometheus metrics: the application on its own port and the Istio proxy on port 15020.

You have two options:

1. **Metrics merging** - Istio merges your app's metrics with proxy metrics on a single port
2. **Separate scraping** - Prometheus scrapes the app and the proxy independently

## Option 1: Istio Metrics Merging (Recommended)

Istio can merge your application's Prometheus metrics with the sidecar's metrics on port 15020. When Prometheus scrapes the sidecar's metrics endpoint, it gets both Istio metrics and your application metrics in a single response.

This is enabled by default in Istio. You just need to annotate your pods:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    metadata:
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "8080"
        prometheus.io/path: /metrics
      labels:
        app: my-app
    spec:
      containers:
        - name: my-app
          image: my-app:latest
          ports:
            - containerPort: 8080
```

The annotations tell Istio:
- `prometheus.io/scrape: "true"` - this pod has application metrics to merge
- `prometheus.io/port: "8080"` - the application's metrics port
- `prometheus.io/path: /metrics` - the metrics endpoint path

When Prometheus scrapes port 15020 on the sidecar, it gets everything:
- All `istio_*` metrics from the Envoy proxy
- All `envoy_*` metrics
- All your application-specific metrics from port 8080

### Verifying Merging Works

```bash
# Check that merged metrics include your app's metrics
kubectl exec <pod-name> -c istio-proxy -- \
  curl -s localhost:15020/stats/prometheus | grep "my_app_"
```

If your application metrics show up, merging is working.

### Controlling Merging

You can disable merging globally if you prefer separate scraping:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    enablePrometheusMerge: false
```

Or disable it per pod:

```yaml
metadata:
  annotations:
    prometheus.istio.io/merge-metrics: "false"
```

## Option 2: Separate Scraping

Some teams prefer to scrape application metrics and Istio metrics separately. This gives you more control over scrape intervals and labeling.

### Application Metrics PodMonitor

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PodMonitor
metadata:
  name: app-metrics
  namespace: monitoring
spec:
  namespaceSelector:
    any: true
  selector:
    matchExpressions:
      - key: app
        operator: Exists
  podMetricsEndpoints:
    - port: http-metrics
      path: /metrics
      interval: 30s
      # Skip the Envoy sidecar container
      filterRunning: true
```

### Istio Sidecar PodMonitor

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PodMonitor
metadata:
  name: istio-sidecar
  namespace: monitoring
spec:
  namespaceSelector:
    any: true
  selector:
    matchExpressions:
      - key: security.istio.io/tlsMode
        operator: Exists
  podMetricsEndpoints:
    - path: /stats/prometheus
      port: http-envoy-prom
      interval: 30s
      relabelings:
        - sourceLabels: [__meta_kubernetes_pod_container_name]
          action: keep
          regex: istio-proxy
```

### Plain Prometheus Configuration

If you're not using the Prometheus Operator:

```yaml
scrape_configs:
  # Application metrics
  - job_name: 'app-metrics'
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: "true"
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_port]
        action: replace
        target_label: __address__
        regex: (.+)
        replacement: ${1}
      - source_labels: [__address__, __meta_kubernetes_pod_annotation_prometheus_io_port]
        action: replace
        regex: ([^:]+)(?::\d+)?;(\d+)
        replacement: $1:$2
        target_label: __address__
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
        action: replace
        target_label: __metrics_path__
        regex: (.+)
      # Skip the sidecar container
      - source_labels: [__meta_kubernetes_pod_container_name]
        action: drop
        regex: istio-proxy

  # Istio sidecar metrics (if not using merging)
  - job_name: 'istio-proxy'
    metrics_path: /stats/prometheus
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_container_name]
        action: keep
        regex: istio-proxy
      - source_labels: [__address__]
        action: replace
        regex: ([^:]+)(?::\d+)?
        replacement: ${1}:15020
        target_label: __address__
```

## Handling Port Conflicts

Sometimes your application uses ports that conflict with Istio's reserved ports. Istio reserves these:

- 15000 - Envoy admin
- 15001 - Envoy outbound
- 15004 - Debug
- 15006 - Envoy inbound
- 15020 - Merged Prometheus metrics
- 15021 - Health checks
- 15090 - Envoy Prometheus (deprecated)

If your application exposes metrics on any of these ports, change your application's port.

## Scraping Through the Sidecar (mTLS Considerations)

When Prometheus scrapes your application directly (not through merging), it needs to handle the Istio sidecar. If mTLS is in STRICT mode, plain HTTP scraping won't work because the sidecar will reject the non-mTLS connection.

### Solution 1: Use Merging (Bypasses mTLS Issue)

Merging is the simplest solution because the metrics endpoint on port 15020 is always available in plain HTTP.

### Solution 2: Exclude Prometheus Port from mTLS

Add a port-level exception:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: app-metrics-exception
  namespace: production
spec:
  selector:
    matchLabels:
      app: my-app
  mtls:
    mode: STRICT
  portLevelMtls:
    8080:
      mode: PERMISSIVE
```

This allows plain HTTP on port 8080 (your metrics port) while keeping mTLS strict on all other ports.

### Solution 3: Prometheus with Istio Sidecar

Give Prometheus itself a sidecar so it can use mTLS to scrape targets:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: prometheus
  namespace: monitoring
spec:
  template:
    metadata:
      labels:
        app: prometheus
        sidecar.istio.io/inject: "true"
```

With a sidecar, Prometheus's scrape requests go through Envoy and automatically get mTLS. This is the most secure option but adds complexity to the Prometheus deployment.

## Correlating Application and Istio Metrics

The real value comes from querying both metric types together. For example, correlate application queue depth with request latency:

```promql
# Application metric: queue depth
my_app_queue_depth{service="order-processor"}

# Istio metric: request latency
histogram_quantile(0.99,
  sum(rate(istio_request_duration_milliseconds_bucket{
    reporter="destination",
    destination_workload="order-processor"
  }[5m])) by (le)
)
```

In Grafana, put these on the same dashboard with linked time ranges. When latency spikes, you can immediately check if the queue depth is also elevated.

### Joining Metrics

You can even combine them in a single query using label matching:

```promql
# Application error count per service, alongside Istio error rate
my_app_errors_total{service="api-service"}
and on (pod)
istio_requests_total{destination_workload="api-service"}
```

For this to work, both metrics need a common label (like `pod` or a custom label).

## Adding Common Labels

Make correlation easier by adding common labels to both application and Istio metrics:

```yaml
# Application side: add labels to your metrics library
# (This is language-specific - here's a Go example with prometheus/client_golang)
counter := prometheus.NewCounterVec(
  prometheus.CounterOpts{
    Name: "my_app_requests_total",
    Help: "Total requests processed",
  },
  []string{"service", "namespace"},
)
```

```yaml
# Istio side: add matching labels to Istio metrics
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: custom-tags
  namespace: production
spec:
  metrics:
    - providers:
        - name: prometheus
      overrides:
        - match:
            metric: REQUEST_COUNT
            mode: SERVER
          tagOverrides:
            app_service:
              operation: UPSERT
              value: "destination.workload"
```

## Troubleshooting

### Application Metrics Not Showing Up with Merging

Check that the annotations are correct:

```bash
kubectl get pod <pod-name> -o jsonpath='{.metadata.annotations}' | python3 -m json.tool
```

Verify the application is actually serving metrics:

```bash
kubectl exec <pod-name> -c my-app -- curl -s localhost:8080/metrics | head
```

Check the sidecar merge endpoint:

```bash
kubectl exec <pod-name> -c istio-proxy -- curl -s localhost:15020/stats/prometheus | grep -v "^istio_\|^envoy_" | head
```

### Duplicate Metrics

If you see the same metric twice (once from the app scrape and once from the merged endpoint), you're scraping both. Either disable merging and scrape separately, or remove the direct app scrape and rely on merging.

Having both application metrics and Istio metrics in the same Prometheus instance gives you a complete picture. Network-level metrics tell you about traffic patterns and infrastructure health, while application metrics tell you about business logic and internal state. Together, they make debugging and capacity planning much more effective.
