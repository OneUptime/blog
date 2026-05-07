# How to Configure ServiceMonitors in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Monitoring, Prometheus, ServiceMonitor

Description: Learn how to create and configure ServiceMonitors in Rancher to scrape Prometheus metrics from Kubernetes services.

ServiceMonitors are custom resources that tell Prometheus which Kubernetes services to scrape for metrics. They are the primary mechanism for adding monitoring targets in Rancher's Prometheus Operator deployment. This guide covers creating ServiceMonitors for various application types and configurations.

## Prerequisites

- Rancher v2.6 or later with the Monitoring chart installed.
- An application that exposes Prometheus-compatible metrics on an HTTP endpoint.
- A Kubernetes Service pointing to the application.

## Understanding ServiceMonitors

A ServiceMonitor defines how Prometheus should discover and scrape metrics from Kubernetes Services. The Prometheus Operator watches for ServiceMonitor resources and automatically updates the Prometheus scrape configuration.

The flow is: **ServiceMonitor** selects a **Service** by labels, which routes to **Pods** that expose a `/metrics` endpoint.

## Step 1: Verify Your Application Exposes Metrics

Before creating a ServiceMonitor, verify your application has a metrics endpoint:

```bash
kubectl port-forward svc/my-app 8080:8080 -n my-namespace
curl http://localhost:8080/metrics
```

You should see Prometheus-formatted metrics like:

```bash
# HELP http_requests_total Total HTTP requests

# TYPE http_requests_total counter
http_requests_total{method="GET",status="200"} 1234
```

## Step 2: Ensure Your Service Has a Named Port

In the examples below, ServiceMonitors reference service ports by name, so make sure your Service has named ports:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-app
  namespace: my-namespace
  labels:
    app: my-app
spec:
  selector:
    app: my-app
  ports:
    - name: http
      port: 8080
      targetPort: 8080
    - name: metrics
      port: 9090
      targetPort: 9090
```

## Step 3: Create a Basic ServiceMonitor

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: my-app-monitor
  namespace: my-namespace
  labels:
    release: rancher-monitoring
spec:
  selector:
    matchLabels:
      app: my-app
  endpoints:
    - port: metrics
      path: /metrics
      interval: 30s
```

Key fields:
- **selector.matchLabels**: Must match the labels on your Service.
- **endpoints[].port**: In this example, it must match a named port on your Service.
- **labels.release: rancher-monitoring**: In the default Rancher Monitoring installation, this lets the cluster Prometheus discover the ServiceMonitor. If you installed the chart with a different release name or changed `serviceMonitorSelector`, use the matching label instead.

Apply:

```bash
kubectl apply -f my-app-servicemonitor.yaml
```

## Step 4: Configure Advanced Endpoint Settings

### Custom Metrics Path

```yaml
endpoints:
  - port: http
    path: /custom/metrics/path
    interval: 30s
```

### Scrape Interval and Timeout

```yaml
endpoints:
  - port: metrics
    interval: 15s
    scrapeTimeout: 10s
```

### Basic Authentication

```yaml
endpoints:
  - port: metrics
    basicAuth:
      username:
        name: metrics-credentials
        key: username
      password:
        name: metrics-credentials
        key: password
```

Create the credentials secret first:

```bash
kubectl create secret generic metrics-credentials \
  --namespace my-namespace \
  --from-literal=username=prometheus \
  --from-literal=password=secret123
```

### Bearer Token Authentication

```yaml
endpoints:
  - port: metrics
    authorization:
      credentials:
        name: metrics-token
        key: token
```

### TLS Configuration

```yaml
endpoints:
  - port: metrics
    scheme: https
    tlsConfig:
      ca:
        secret:
          name: metrics-tls
          key: ca.crt
      cert:
        secret:
          name: metrics-tls
          key: tls.crt
      keySecret:
        name: metrics-tls
        key: tls.key
      insecureSkipVerify: false
```

## Step 5: Configure Metric Relabeling

Filter, rename, or drop metrics before they are stored:

```yaml
endpoints:
  - port: metrics
    metricRelabelings:
      # Drop metrics with high cardinality
      - sourceLabels: [__name__]
        regex: "go_gc_.*"
        action: drop

      # Rename a metric
      - sourceLabels: [__name__]
        regex: "old_metric_name"
        targetLabel: __name__
        replacement: "new_metric_name"

      # Keep only specific metrics
      - sourceLabels: [__name__]
        regex: "http_requests_total|http_request_duration_seconds.*|up"
        action: keep

      # Add a label
      - targetLabel: environment
        replacement: "production"
```

## Step 6: Configure Target Relabeling

Modify labels before scraping:

```yaml
endpoints:
  - port: metrics
    relabelings:
      # Add a custom label from pod labels
      - sourceLabels: [__meta_kubernetes_pod_label_version]
        targetLabel: app_version

      # Use pod name as instance label
      - sourceLabels: [__meta_kubernetes_pod_name]
        targetLabel: instance
```

## Step 7: Monitor Multiple Ports

If your application exposes metrics on multiple ports:

```yaml
spec:
  selector:
    matchLabels:
      app: my-app
  endpoints:
    - port: http-metrics
      path: /metrics
      interval: 30s
    - port: grpc-metrics
      path: /metrics
      interval: 60s
```

## Step 8: Cross-Namespace ServiceMonitors

Create a ServiceMonitor that targets services in a different namespace:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: cross-namespace-monitor
  namespace: cattle-monitoring-system
  labels:
    release: rancher-monitoring
spec:
  namespaceSelector:
    matchNames:
      - production
      - staging
  selector:
    matchLabels:
      monitored: "true"
  endpoints:
    - port: metrics
```

Or monitor all namespaces:

```yaml
spec:
  namespaceSelector:
    any: true
  selector:
    matchLabels:
      monitored: "true"
```

## Step 9: Verify the ServiceMonitor

Check that Prometheus is scraping your target:

```bash
# List all ServiceMonitors
kubectl get servicemonitors --all-namespaces

# Check Prometheus targets
kubectl port-forward -n cattle-monitoring-system svc/rancher-monitoring-prometheus 9090:9090
```

Open `http://localhost:9090/targets` and look for your service.

If the target is not appearing, check:

1. In the default Rancher Monitoring installation, the ServiceMonitor has the `release: rancher-monitoring` label.
2. The Service labels match the ServiceMonitor selector.
3. The port name in the ServiceMonitor matches the Service port name.
4. Prometheus can discover the ServiceMonitor namespace (check `serviceMonitorNamespaceSelector`), and the ServiceMonitor can discover the target Service namespace (check `namespaceSelector`).

Check the Prometheus Operator logs for errors:

```bash
kubectl logs -n cattle-monitoring-system -l app=rancher-monitoring-operator
```

## Step 10: Common ServiceMonitor Examples

### NGINX Ingress Controller

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: nginx-ingress-monitor
  namespace: ingress-nginx
  labels:
    release: rancher-monitoring
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: ingress-nginx
  endpoints:
    - port: metrics
      interval: 30s
```

### Redis

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: redis-monitor
  namespace: databases
  labels:
    release: rancher-monitoring
spec:
  selector:
    matchLabels:
      app: redis
  endpoints:
    - port: metrics
      interval: 30s
```

### PostgreSQL (with exporter)

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: postgres-monitor
  namespace: databases
  labels:
    release: rancher-monitoring
spec:
  selector:
    matchLabels:
      app: postgres-exporter
  endpoints:
    - port: metrics
      interval: 30s
```

## Summary

ServiceMonitors are the standard way to configure Prometheus scraping in Rancher. They work by selecting Kubernetes Services based on labels and defining how to scrape their metrics endpoints. In a default Rancher Monitoring installation, include the `release: rancher-monitoring` label, use named service ports for `endpoints[].port`, and verify your targets appear in the Prometheus UI after creation.
