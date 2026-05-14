# How to Create Grafana Dashboards for Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Grafana, Prometheus, Monitoring, Dashboard, Observability

Description: Learn how to build custom Grafana dashboards for Flux CD using Prometheus metrics to monitor reconciliation health, performance, and resource status.

---

Flux CD exposes Prometheus metrics from each of its controllers, providing data on reconciliation duration, errors, and controller activity. Resource readiness and suspension state can be exported with kube-state-metrics custom resource state metrics. By building Grafana dashboards around these metrics, you gain real-time visibility into your GitOps pipeline health. This guide covers the key Flux metrics, how to create meaningful dashboard panels, and how to manage dashboards as code through Flux.

## Flux CD Metrics Overview

Flux controllers expose metrics on port 8080 at the `/metrics` endpoint. The primary metric families are:

- **gotk_reconcile_duration_seconds**: Histogram of reconciliation durations per controller and resource.
- **controller_runtime_reconcile_total**: Counter of total reconciliation attempts.
- **controller_runtime_reconcile_errors_total**: Counter of failed reconciliations.
- **controller_runtime_reconcile_time_seconds**: Histogram of controller reconciliation time.
- **gotk_resource_info**: kube-state-metrics custom resource metric with Flux resource metadata, including `ready` and `suspended` labels.

## Prerequisites

- Kubernetes cluster with Flux CD and Prometheus installed
- kube-state-metrics configured to export Flux custom resource state metrics
- Grafana instance (self-hosted or Grafana Cloud)
- Prometheus configured to scrape Flux controller metrics

## Step 1: Configure Prometheus to Scrape Flux Metrics

If using the Prometheus Operator, create a PodMonitor for Flux controllers:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PodMonitor
metadata:
  name: flux-system
  namespace: monitoring
  labels:
    app.kubernetes.io/part-of: flux
spec:
  namespaceSelector:
    matchNames:
      - flux-system
  selector:
    matchExpressions:
      - key: app
        operator: In
        values:
          - helm-controller
          - source-controller
          - kustomize-controller
          - notification-controller
          - image-automation-controller
          - image-reflector-controller
  podMetricsEndpoints:
    - port: http-prom
      interval: 30s
      path: /metrics
```

If you expose Flux controller metrics through Services, you can create a ServiceMonitor instead:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: flux-system
  namespace: monitoring
spec:
  namespaceSelector:
    matchNames:
      - flux-system
  selector:
    matchLabels:
      app.kubernetes.io/part-of: flux
  endpoints:
    - port: http-prom
      path: /metrics
      interval: 30s
```

## Step 2: Build the Reconciliation Overview Panel

Create a stat panel showing the overall reconciliation health:

**Ready Resources Count:**
```promql
count(gotk_resource_info{ready="True"})
```

**Not Ready Resources:**
```promql
count(gotk_resource_info{ready!="True"})
```

**Suspended Resources:**
```promql
count(gotk_resource_info{suspended="True"})
```

**Reconciliation Success Rate (%):**
```promql
count(gotk_resource_info{ready="True"})
/
count(gotk_resource_info)
* 100
```

Use the stat panel type in Grafana with thresholds: green above 95%, yellow between 80-95%, red below 80%.

## Step 3: Build Reconciliation Duration Panels

**P95 Reconciliation Duration by Resource (Time Series):**
```promql
histogram_quantile(0.95,
  sum(rate(gotk_reconcile_duration_seconds_bucket[10m]))
  by (le, kind, name, namespace)
)
```

**Average Reconciliation Duration by Controller (Bar Gauge):**
```promql
sum(rate(gotk_reconcile_duration_seconds_sum[30m]))
by (kind)
/
sum(rate(gotk_reconcile_duration_seconds_count[30m]))
by (kind)
```

**Top 10 Slowest Reconciliations (Table):**
```promql
topk(10,
  histogram_quantile(0.99,
    sum(rate(gotk_reconcile_duration_seconds_bucket[1h]))
    by (le, kind, name, namespace)
  )
)
```

## Step 4: Build Error and Event Panels

**Reconciliation Error Rate by Controller (Time Series):**
```promql
sum(rate(controller_runtime_reconcile_errors_total[5m])) by (controller)
```

**Total Errors in Last Hour (Stat):**
```promql
sum(increase(controller_runtime_reconcile_errors_total[1h]))
```

**Error Rate as Percentage of Total Reconciliations:**
```promql
sum(rate(controller_runtime_reconcile_errors_total[5m]))
/
sum(rate(controller_runtime_reconcile_total[5m]))
* 100
```

## Step 5: Build Resource Status Tables

**All Kustomizations Status (Table):**
```promql
gotk_resource_info{customresource_kind="Kustomization"}
```

Display with columns: exported_namespace, name, ready, and suspended, and use value mappings for the `ready` label with color coding.

**All HelmReleases Status:**
```promql
gotk_resource_info{customresource_kind="HelmRelease"}
```

**All Sources Status:**
```promql
gotk_resource_info{customresource_kind=~"GitRepository|HelmRepository|OCIRepository|Bucket"}
```

## Step 6: Manage Dashboards as Code with Flux

Store your Grafana dashboards in Git and deploy them through Flux using the Grafana Operator or ConfigMaps:

### Using ConfigMaps (Grafana sidecar)

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: flux-dashboard
  namespace: monitoring
  labels:
    grafana_dashboard: "true"
data:
  flux-dashboard.json: |
    {
      "title": "Flux CD Overview",
      "uid": "flux-cd-custom",
      "panels": [
        {
          "title": "Ready Resources",
          "type": "stat",
          "targets": [
            {
              "expr": "count(gotk_resource_info{ready=\"True\"})"
            }
          ],
          "gridPos": { "h": 4, "w": 6, "x": 0, "y": 0 }
        },
        {
          "title": "Not Ready Resources",
          "type": "stat",
          "targets": [
            {
              "expr": "count(gotk_resource_info{ready!=\"True\"}) or vector(0)"
            }
          ],
          "gridPos": { "h": 4, "w": 6, "x": 6, "y": 0 }
        }
      ]
    }
```

### Using the Grafana Operator

```yaml
apiVersion: grafana.integreatly.org/v1beta1
kind: GrafanaDashboard
metadata:
  name: flux-cd-overview
  namespace: monitoring
spec:
  instanceSelector:
    matchLabels:
      dashboards: grafana
  json: |
    {
      "title": "Flux CD Overview",
      "uid": "flux-cd-custom",
      "panels": []
    }
```

## Step 7: Import the Community Dashboard

Grafana.com has a Flux dashboard with ID **16714** that can be imported as a starting point, but check its queries against the Flux and kube-state-metrics versions you run:

```bash
# Download the dashboard JSON

curl -s https://grafana.com/api/dashboards/16714/revisions/latest/download \
  -o flux-community-dashboard.json
```

Store it in a ConfigMap managed by Flux for automatic deployment.

## Step 8: Set Up Dashboard Alerts

Use PrometheusRule resources for recording rules that dashboard panels and alerts can reuse:

```yaml
# Recording rules for efficient alerting
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: flux-recording-rules
  namespace: flux-system
spec:
  groups:
    - name: flux.rules
      interval: 30s
      rules:
        - record: flux:reconcile_condition:ready_ratio
          expr: |
            count(gotk_resource_info{ready="True"})
            / count(gotk_resource_info)
        - record: flux:reconcile:error_rate_5m
          expr: |
            sum(rate(controller_runtime_reconcile_errors_total[5m])) by (controller)
```

## Summary

Building Grafana dashboards for Flux CD involves scraping metrics from Flux controllers with Prometheus, exporting Flux resource state with kube-state-metrics, creating panels for reconciliation health, duration, errors, and resource status, and managing the dashboard definitions as code through Flux. The key metrics are `gotk_resource_info` for resource readiness and suspension state, `gotk_reconcile_duration_seconds` for performance, and `controller_runtime_reconcile_errors_total` for error tracking. Start with an existing Flux dashboard such as Grafana.com dashboard ID 16714 and extend it with custom panels tailored to your environment.
