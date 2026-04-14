# How to Set Up Dapr Metrics Collection

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Metric, Observability, Prometheus, Kubernetes

Description: Learn how to enable and collect metrics from Dapr sidecars and the control plane using Prometheus for full observability.

---

Dapr exposes Prometheus-compatible metrics from each sidecar and from the control plane components. Setting up metrics collection gives you visibility into request rates, latency, error rates, and resource usage across your microservices.

## How Dapr Exposes Metrics

Each Dapr sidecar exposes metrics on port 9090 by default at the `/metrics` endpoint. The Dapr control plane components (dapr-operator, dapr-sentry, dapr-placement, dapr-scheduler, dapr-sidecar-injector) also expose their own metrics endpoints.

Metrics are enabled by default. You can verify they are working by checking the metrics endpoint on each sidecar.

## Step 1 - Enable Metrics on Dapr Sidecars

Annotate your Kubernetes deployments to enable the metrics port:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
spec:
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "order-service"
        dapr.io/metrics-port: "9090"
    spec:
      containers:
      - name: order-service
        image: myregistry/order-service:latest
```

```bash
kubectl apply -f order-service.yaml
```

## Step 2 - Verify Metrics are Exposed

Port-forward to the sidecar metrics port and inspect the output:

```bash
kubectl port-forward pod/order-service-xxx 9090:9090
curl http://localhost:9090/metrics | grep dapr_
```

You should see metrics like:

```text
dapr_grpc_io_server_server_latency_bucket{...} 0
dapr_http_server_request_count{...} 42
dapr_component_pubsub_ingress_latencies_bucket{...} 5
```

## Step 3 - Configure Prometheus Scraping

Create a ServiceMonitor if using the Prometheus Operator:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: dapr-sidecars
  namespace: monitoring
  labels:
    release: prometheus
spec:
  selector:
    matchLabels:
      app: order-service
  namespaceSelector:
    matchNames:
    - default
  endpoints:
  - port: dapr-metrics
    path: /metrics
    interval: 15s
```

Or add a static scrape job to your `prometheus.yml`:

```yaml
scrape_configs:
  - job_name: 'dapr-sidecars'
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_dapr_io_enabled]
        action: keep
        regex: "true"
      - source_labels: [__meta_kubernetes_pod_ip]
        target_label: __address__
        replacement: "$1:9090"
```

## Step 4 - Enable Control Plane Metrics

The Dapr control plane also exposes metrics. Check the Dapr system namespace:

```bash
kubectl get svc -n dapr-system
```

Add a scrape config for the control plane:

```yaml
scrape_configs:
  - job_name: 'dapr-control-plane'
    static_configs:
      - targets:
        - dapr-operator.dapr-system:9090
        - dapr-sentry.dapr-system:9090
        - dapr-placement-server.dapr-system:9090
```

## Step 5 - Verify Data in Prometheus

Query the Prometheus UI for Dapr metrics:

```bash
kubectl port-forward svc/prometheus 9090:9090 -n monitoring
```

Run a PromQL query:

```text
rate(dapr_http_server_request_count[5m])
```

## Summary

Dapr metrics collection requires enabling the metrics port on sidecars via annotations and configuring Prometheus to scrape both sidecar and control plane endpoints. Once data flows into Prometheus, you can build dashboards and alerts to monitor the health and performance of your Dapr-based microservices. The sidecar metrics are particularly useful for tracking per-service request rates and latency distributions.
