# How to Configure Istio Metrics with Prometheus

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Prometheus, Metrics, Monitoring, Kubernetes

Description: Step-by-step guide to configuring Prometheus to scrape and store Istio service mesh metrics from Envoy sidecars and the Istio control plane.

---

Prometheus and Istio are a natural pairing. Istio's Envoy sidecars expose metrics in Prometheus format, and Prometheus is built to scrape exactly this kind of target. But getting the configuration right - especially in a large cluster with hundreds of pods - takes some thought. You need to handle service discovery, relabeling, storage, and retention without blowing up your Prometheus instance.

## Prerequisites

You need a running Istio installation and Prometheus deployed in your cluster. If you don't have Prometheus yet, the quickest way is through the kube-prometheus-stack Helm chart:

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

helm install monitoring prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --set prometheus.prometheusSpec.serviceMonitorSelectorNilUsesHelmValues=false \
  --set prometheus.prometheusSpec.podMonitorSelectorNilUsesHelmValues=false
```

The two `--set` flags are important - they tell the Prometheus Operator to pick up ServiceMonitor and PodMonitor resources from any namespace, not just those created by the Helm chart.

## Scraping istiod Control Plane

istiod exposes metrics on port 15014 at the `/metrics` endpoint. Create a ServiceMonitor to scrape it:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: istiod
  namespace: monitoring
  labels:
    release: monitoring
spec:
  namespaceSelector:
    matchNames:
      - istio-system
  selector:
    matchLabels:
      app: istiod
  endpoints:
    - port: http-monitoring
      interval: 30s
      path: /metrics
```

Verify it's working:

```bash
kubectl port-forward svc/prometheus-operated 9090:9090 -n monitoring
```

Open `http://localhost:9090/targets` and look for the istiod target. It should show as UP.

## Scraping Envoy Sidecar Metrics

Every pod with an Istio sidecar exposes merged metrics on port 15020 at `/stats/prometheus`. Istio merges the application's Prometheus metrics with the Envoy proxy metrics on this port (when `enablePrometheusMerge` is true, which is the default).

Use a PodMonitor to scrape all sidecar proxies:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PodMonitor
metadata:
  name: envoy-stats
  namespace: monitoring
  labels:
    release: monitoring
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

The selector uses `security.istio.io/tlsMode` which Istio adds to every injected pod. This ensures we only scrape pods that actually have sidecars.

## Scraping the Ingress Gateway

The ingress gateway also exposes metrics. Create a ServiceMonitor for it:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: istio-ingressgateway
  namespace: monitoring
  labels:
    release: monitoring
spec:
  namespaceSelector:
    matchNames:
      - istio-system
  selector:
    matchLabels:
      istio: ingressgateway
  endpoints:
    - port: http-envoy-prom
      path: /stats/prometheus
      interval: 30s
```

## Plain Prometheus Configuration

If you're not using the Prometheus Operator, add these scrape configs to your `prometheus.yml`:

```yaml
scrape_configs:
  # Scrape istiod
  - job_name: istiod
    kubernetes_sd_configs:
      - role: endpoints
        namespaces:
          names:
            - istio-system
    relabel_configs:
      - source_labels:
          - __meta_kubernetes_service_name
          - __meta_kubernetes_endpoint_port_name
        action: keep
        regex: istiod;http-monitoring

  # Scrape Envoy sidecars
  - job_name: envoy-stats
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
      - source_labels: [__meta_kubernetes_pod_name]
        target_label: pod
      - source_labels: [__meta_kubernetes_namespace]
        target_label: namespace
      - action: labeldrop
        regex: __meta_kubernetes_pod_label_(.+)

  # Scrape ingress gateway
  - job_name: istio-gateway
    kubernetes_sd_configs:
      - role: pod
        namespaces:
          names:
            - istio-system
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_label_istio]
        action: keep
        regex: ingressgateway
      - source_labels: [__address__]
        action: replace
        regex: ([^:]+)(?::\d+)?
        replacement: ${1}:15020
        target_label: __address__
```

## Configuring Scrape Intervals

The scrape interval determines how often Prometheus pulls metrics. The default in many setups is 15 seconds, which can be aggressive for large meshes.

For a cluster with 500+ pods, consider these intervals:

```yaml
# istiod - lower frequency is fine
- port: http-monitoring
  interval: 30s

# Envoy sidecars - main source of metrics volume
- port: http-envoy-prom
  interval: 30s

# For very large meshes, 60s is acceptable
- port: http-envoy-prom
  interval: 60s
```

Higher intervals reduce load on both Prometheus and the Envoy proxies, at the cost of slightly less granular data.

## Metric Relabeling to Reduce Cardinality

Istio metrics can generate a huge number of time series. You can drop unused labels or entire metrics through relabeling:

```yaml
podMetricsEndpoints:
  - path: /stats/prometheus
    port: http-envoy-prom
    interval: 30s
    metricRelabelings:
      # Drop internal Envoy metrics we don't need
      - sourceLabels: [__name__]
        regex: envoy_cluster_lb_.*
        action: drop
      - sourceLabels: [__name__]
        regex: envoy_cluster_upstream_cx_connect_ms_.*
        action: drop
      # Drop high-cardinality labels
      - action: labeldrop
        regex: (source_principal|destination_principal)
      # Keep only Istio standard metrics + a few envoy ones
      - sourceLabels: [__name__]
        regex: (istio_requests_total|istio_request_duration_milliseconds_bucket|istio_request_bytes_bucket|istio_response_bytes_bucket|istio_tcp_.*|envoy_server_live|envoy_server_memory_allocated|envoy_server_memory_heap_size)
        action: keep
```

That last rule is aggressive - it only keeps the standard Istio metrics and a few Envoy server stats. Use it when you need to control storage costs.

## Prometheus Resource Sizing

Istio metrics can consume significant resources. Here's a rough sizing guide:

- Each pod with a sidecar generates about 500-800 active time series
- For 100 pods, expect ~50k-80k time series from Envoy alone
- istiod adds another ~1000 time series

Plan your Prometheus resources accordingly:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: Prometheus
metadata:
  name: prometheus
  namespace: monitoring
spec:
  replicas: 2
  retention: 15d
  resources:
    requests:
      memory: 4Gi
      cpu: "2"
    limits:
      memory: 8Gi
      cpu: "4"
  storage:
    volumeClaimTemplate:
      spec:
        storageClassName: fast-ssd
        resources:
          requests:
            storage: 100Gi
```

## Enabling Prometheus Metrics Merging

Istio can merge your application's Prometheus metrics with sidecar metrics on a single port. This is enabled by default, but you can control it:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    enablePrometheusMerge: true
```

With merging enabled, if your application exposes metrics on its own Prometheus endpoint, Istio will include those metrics when Prometheus scrapes port 15020. You annotate your pods to tell Istio where to find your app metrics:

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
```

## Testing Your Setup

Run a quick validation to make sure everything is connected:

```bash
# Check Prometheus targets
kubectl port-forward svc/prometheus-operated 9090:9090 -n monitoring

# Query for Istio metrics
curl -s 'http://localhost:9090/api/v1/query?query=istio_requests_total' | python3 -m json.tool | head -20
```

Generate some traffic and verify metrics are updating:

```bash
# Generate traffic
for i in $(seq 1 100); do
  kubectl exec deploy/sleep -- curl -s http://httpbin:8000/get > /dev/null
done

# Check the metric
curl -s 'http://localhost:9090/api/v1/query?query=sum(istio_requests_total{destination_workload="httpbin"})' | python3 -m json.tool
```

## Troubleshooting

If metrics aren't showing up:

1. Check that the sidecar is actually exposing metrics:
```bash
kubectl exec <pod> -c istio-proxy -- curl -s localhost:15020/stats/prometheus | head
```

2. Verify Prometheus can reach the targets - look at the Targets page for errors

3. Check for RBAC issues - Prometheus needs permission to discover pods across namespaces:
```bash
kubectl auth can-i list pods --as=system:serviceaccount:monitoring:prometheus-operator-prometheus --all-namespaces
```

4. Make sure the PodMonitor/ServiceMonitor labels match what your Prometheus Operator is looking for

Getting Prometheus and Istio working together properly takes some initial configuration effort, but once it's running, you get deep visibility into every request in your mesh without touching any application code.
