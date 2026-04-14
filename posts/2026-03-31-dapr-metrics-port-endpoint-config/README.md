# How to Configure Metrics Port and Endpoint in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Metric, Configuration, Kubernetes, Prometheus

Description: Configure the Dapr sidecar metrics port, path, and namespace settings to customize how Prometheus discovers and scrapes your services.

---

By default, Dapr sidecars expose metrics on port 9090 at the root path `/`. You may need to change these defaults when port 9090 conflicts with your application, when running multiple Dapr-enabled containers, or when your Prometheus setup uses custom scrape paths.

## Default Metrics Configuration

Without any configuration, the Dapr sidecar exposes:
- Port: `9090`
- Path: `/` (the metrics server responds to any path, so `/metrics` also works)
- Enabled: `true`

Verify the default metrics endpoint is working:

```bash
kubectl port-forward pod/order-service-xxx 9090:9090
curl http://localhost:9090/ | head -20
```

## Changing the Metrics Port

Use the annotation `dapr.io/metrics-port` to change the port:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-service
spec:
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "payment-service"
        dapr.io/metrics-port: "19090"
    spec:
      containers:
      - name: payment-service
        image: myregistry/payment-service:latest
        ports:
        - containerPort: 8080
```

Use a port above 1024 and ensure it does not conflict with your app container.

## Disabling Metrics

To disable metrics for a specific deployment (e.g., in cost-sensitive environments):

```yaml
metadata:
  annotations:
    dapr.io/enabled: "true"
    dapr.io/enable-metrics: "false"
```

Or set the global default in a Dapr Configuration resource:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: daprconfig
  namespace: default
spec:
  metrics:
    enabled: false
```

## Configuring Metrics via Helm

When installing Dapr with Helm, configure metrics globally:

```bash
helm install dapr dapr/dapr \
  --namespace dapr-system \
  --set global.prometheus.enabled=true \
  --set global.prometheus.port=9090
```

## Using a Custom Metrics Namespace

Dapr metrics use the prefix `dapr_` by default. This is built into the sidecar and cannot be changed, but you can use relabeling in Prometheus to add custom prefixes or normalize metric names:

```yaml
scrape_configs:
  - job_name: 'dapr-sidecars'
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_dapr_io_enabled]
        action: keep
        regex: "true"
      - source_labels: [__meta_kubernetes_pod_ip, __meta_kubernetes_pod_annotation_dapr_io_metrics_port]
        separator: ":"
        target_label: __address__
    metric_relabel_configs:
      # Rename a metric
      - source_labels: [__name__]
        regex: "dapr_http_server_(.*)"
        target_label: __name__
        replacement: "mycompany_dapr_http_$1"
```

## Exposing the Metrics Port as a Kubernetes Service

For Prometheus Operator ServiceMonitors, you need a Service with a named port:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: order-service-metrics
  labels:
    app: order-service
spec:
  selector:
    app: order-service
  ports:
  - name: dapr-metrics
    port: 9090
    targetPort: 9090
```

Then create a ServiceMonitor:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: order-service-dapr-metrics
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: order-service
  endpoints:
  - port: dapr-metrics
    path: /metrics
    interval: 30s
```

## Verifying the Configuration

Check that the sidecar started with the correct metrics port:

```bash
kubectl logs deploy/order-service -c daprd | grep -i "metrics"
```

Expected output:

```text
level=info msg="metrics server started on 0.0.0.0:9090/"
```

## Summary

Dapr metrics port configuration uses the `dapr.io/metrics-port` annotation for per-deployment overrides, a Dapr Configuration resource for sidecar-wide defaults, and Helm values (`global.prometheus.*`) for control plane components. When using the Prometheus Operator, expose the metrics port as a named Kubernetes Service port so ServiceMonitors can reference it by name. Always verify the sidecar logs confirm the metrics server started on the expected port before debugging scrape configuration issues.
