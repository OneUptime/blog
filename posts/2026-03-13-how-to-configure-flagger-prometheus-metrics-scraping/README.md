# How to Configure Flagger Prometheus Metrics Scraping

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flagger, Prometheus, Metrics, Kubernetes, Monitoring

Description: Learn how to configure Prometheus metrics scraping for Flagger canary analysis with proper service discovery and scrape configurations.

---

## Introduction

Flagger depends on Prometheus metrics to evaluate canary health during progressive delivery. Without properly configured metrics scraping, Flagger cannot determine whether a new version is performing well or needs to be rolled back. Setting up Prometheus to scrape the right targets with the correct labels is essential for Flagger to function reliably.

This guide covers configuring Prometheus to scrape metrics from your applications, mesh proxies, and ingress controllers for use with Flagger canary analysis. You will learn about scrape configurations, service discovery, and metric relabeling for different Flagger providers.

## Prerequisites

Before you begin, ensure you have:

- A Kubernetes cluster with Flagger installed.
- Prometheus installed (either standalone or via the Prometheus Operator).
- `kubectl` installed and configured.

## Understanding What Flagger Needs from Prometheus

Flagger queries Prometheus for two types of metrics during canary analysis. Built-in metrics include request success rate and request duration. Custom metrics are defined through MetricTemplate resources. The source of these metrics depends on the mesh provider or ingress controller being used.

For Istio, Flagger queries `istio_requests_total` and `istio_request_duration_milliseconds_bucket`. For NGINX Ingress, it queries `nginx_ingress_controller_requests` and `nginx_ingress_controller_request_duration_seconds_bucket`. For Linkerd, it queries `response_total` and `response_latency_ms_bucket`.

## Configuring Prometheus for Application Metrics

Ensure your application pods have the correct Prometheus scrape annotations.

```yaml
# deployment.yaml
# Application with Prometheus scrape annotations
apiVersion: apps/v1
kind: Deployment
metadata:
  name: podinfo
  namespace: test
spec:
  replicas: 2
  selector:
    matchLabels:
      app: podinfo
  template:
    metadata:
      labels:
        app: podinfo
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9898"
        prometheus.io/path: "/metrics"
    spec:
      containers:
        - name: podinfo
          image: stefanprodan/podinfo:6.1.0
          ports:
            - containerPort: 9898
              name: http
```

## Prometheus Scrape Configuration for Kubernetes Pods

Configure Prometheus to discover and scrape Kubernetes pods using pod annotations. Add this job to your Prometheus configuration.

```yaml
# prometheus-config.yaml
# Prometheus scrape configuration for Kubernetes pods
scrape_configs:
  - job_name: kubernetes-pods
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels:
          - __meta_kubernetes_pod_annotation_prometheus_io_scrape
        action: keep
        regex: "true"
      - source_labels:
          - __meta_kubernetes_pod_annotation_prometheus_io_path
        action: replace
        target_label: __metrics_path__
        regex: (.+)
      - source_labels:
          - __address__
          - __meta_kubernetes_pod_annotation_prometheus_io_port
        action: replace
        regex: ([^:]+)(?::\d+)?;(\d+)
        replacement: $1:$2
        target_label: __address__
      - source_labels:
          - __meta_kubernetes_namespace
        action: replace
        target_label: namespace
      - source_labels:
          - __meta_kubernetes_pod_name
        action: replace
        target_label: pod
```

## Configuring Scraping for Istio Metrics

When using Istio, Prometheus needs to scrape the Envoy sidecar proxies for service mesh metrics.

```yaml
# prometheus-istio-scrape.yaml
# Prometheus scrape configuration for Istio Envoy proxies
scrape_configs:
  - job_name: envoy-stats
    metrics_path: /stats/prometheus
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels:
          - __meta_kubernetes_pod_container_port_name
        action: keep
        regex: .*-envoy-prom
      - source_labels:
          - __address__
          - __meta_kubernetes_pod_annotation_prometheus_io_port
        action: replace
        regex: ([^:]+)(?::\d+)?;(\d+)
        replacement: $1:$2
        target_label: __address__
      - source_labels:
          - __meta_kubernetes_namespace
        action: replace
        target_label: namespace
      - source_labels:
          - __meta_kubernetes_pod_name
        action: replace
        target_label: pod
```

## Configuring Scraping for NGINX Ingress Controller

For NGINX Ingress, enable the metrics exporter and configure Prometheus to scrape it.

```yaml
# nginx-ingress-values.yaml
# Helm values for NGINX Ingress with metrics enabled
controller:
  metrics:
    enabled: true
    port: 10254
    service:
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "10254"
```

Add a Prometheus scrape configuration for the NGINX controller.

```yaml
# prometheus-nginx-scrape.yaml
# Prometheus scrape configuration for NGINX Ingress Controller
scrape_configs:
  - job_name: nginx-ingress
    kubernetes_sd_configs:
      - role: pod
        namespaces:
          names:
            - ingress-nginx
    relabel_configs:
      - source_labels:
          - __meta_kubernetes_pod_annotation_prometheus_io_scrape
        action: keep
        regex: "true"
      - source_labels:
          - __meta_kubernetes_pod_annotation_prometheus_io_path
        action: replace
        target_label: __metrics_path__
        regex: (.+)
      - source_labels:
          - __address__
          - __meta_kubernetes_pod_annotation_prometheus_io_port
        action: replace
        regex: ([^:]+)(?::\d+)?;(\d+)
        replacement: $1:$2
        target_label: __address__
```

## Configuring Scraping for Linkerd

Linkerd proxies expose metrics on port 4191. Configure Prometheus to scrape these.

```yaml
# prometheus-linkerd-scrape.yaml
# Prometheus scrape configuration for Linkerd proxies
scrape_configs:
  - job_name: linkerd-proxy
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels:
          - __meta_kubernetes_pod_container_name
        action: keep
        regex: linkerd-proxy
      - source_labels:
          - __meta_kubernetes_pod_container_port_name
        action: keep
        regex: linkerd-admin
      - source_labels:
          - __meta_kubernetes_namespace
        action: replace
        target_label: namespace
      - source_labels:
          - __meta_kubernetes_pod_name
        action: replace
        target_label: pod
```

## Verifying Prometheus Is Scraping Correctly

After configuring scrape targets, verify that Prometheus is collecting the expected metrics.

```bash
# Port-forward to Prometheus
kubectl port-forward svc/prometheus -n monitoring 9090:9090

# Check scrape targets in the Prometheus UI
# Navigate to http://localhost:9090/targets

# Query for a specific metric
curl -s 'http://localhost:9090/api/v1/query' \
  --data-urlencode 'query=up{job="kubernetes-pods"}'
```

Verify that Flagger can reach Prometheus.

```bash
# Check Flagger logs for metric query results
kubectl logs -l app.kubernetes.io/name=flagger \
  -n <flagger-namespace> --tail=50 | grep -i metric
```

## Configuring Flagger's Metrics Server

Ensure Flagger points to the correct Prometheus endpoint.

```yaml
# flagger-values.yaml
# Flagger Helm values with metrics server configuration
metricsServer: http://prometheus-server.monitoring:80
```

If your Prometheus is behind a different service name or port, adjust accordingly.

```bash
# Find the Prometheus service
kubectl get svc -n monitoring | grep prometheus

# Update Flagger's metrics server
helm upgrade flagger flagger/flagger \
  --namespace <flagger-namespace> \
  --set metricsServer=http://<prometheus-service>.<namespace>:<port>
```

## Conclusion

Properly configured Prometheus metrics scraping is fundamental to Flagger's operation. By ensuring that your applications, mesh proxies, and ingress controllers are correctly scraped, you provide Flagger with the data it needs to make informed decisions during canary analysis. Whether you use Istio, NGINX, Linkerd, or another provider, the key is to verify that the metrics Flagger queries are available in Prometheus with the correct labels and values.
