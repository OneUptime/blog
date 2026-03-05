# How to Set Up Prometheus Metrics for Flux CD Controllers

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Prometheus, Metrics, Monitoring, Observability

Description: Learn how to set up Prometheus to scrape and visualize metrics from Flux CD controllers for monitoring reconciliation health and performance.

---

Flux CD controllers expose Prometheus metrics that provide deep insight into reconciliation status, duration, and errors. Setting up Prometheus to scrape these metrics and creating dashboards to visualize them is essential for operating Flux at scale.

## Metrics Exposed by Flux Controllers

Each Flux controller exposes metrics on port 8080 at the `/metrics` endpoint. The main controllers and their key metrics are:

**source-controller**: Manages GitRepository, HelmRepository, HelmChart, OCIRepository, and Bucket resources.

**kustomize-controller**: Manages Kustomization resources and applies manifests to the cluster.

**helm-controller**: Manages HelmRelease resources and performs Helm operations.

**notification-controller**: Manages Provider and Alert resources for event forwarding.

**image-reflector-controller**: Manages ImageRepository and ImagePolicy resources.

**image-automation-controller**: Manages ImageUpdateAutomation resources.

## Core Metrics

All Flux controllers expose these common metrics:

```text
# Reconciliation condition (gauge)
gotk_reconcile_condition{kind, name, namespace, type, status}

# Reconciliation duration (histogram)
gotk_reconcile_duration_seconds_bucket{kind, le}
gotk_reconcile_duration_seconds_sum{kind}
gotk_reconcile_duration_seconds_count{kind}

# Suspend status (gauge)
gotk_suspend{kind, name, namespace}
```

## Setting Up ServiceMonitors

If you use the Prometheus Operator (kube-prometheus-stack), create ServiceMonitor resources to scrape Flux controllers:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: flux-system
  namespace: flux-system
  labels:
    app.kubernetes.io/part-of: flux
spec:
  namespaceSelector:
    matchNames:
      - flux-system
  selector:
    matchLabels:
      app.kubernetes.io/part-of: flux
  endpoints:
    - port: http-prom
      interval: 30s
      scrapeTimeout: 10s
      path: /metrics
```

Ensure your Prometheus instance is configured to discover ServiceMonitors in the `flux-system` namespace. If using kube-prometheus-stack, add the namespace to the `serviceMonitorNamespaceSelector`:

```yaml
# In the kube-prometheus-stack HelmRelease values
prometheus:
  prometheusSpec:
    serviceMonitorNamespaceSelector:
      matchLabels:
        kubernetes.io/metadata.name: flux-system
```

Or use an empty selector to match all namespaces:

```yaml
prometheus:
  prometheusSpec:
    serviceMonitorNamespaceSelector: {}
    serviceMonitorSelector: {}
```

## Prometheus Scrape Config (Without Operator)

If you use Prometheus without the Operator, add scrape configs directly:

```yaml
scrape_configs:
  - job_name: 'flux-system'
    kubernetes_sd_configs:
      - role: service
        namespaces:
          names:
            - flux-system
    relabel_configs:
      - source_labels: [__meta_kubernetes_service_label_app_kubernetes_io_part_of]
        regex: flux
        action: keep
      - source_labels: [__meta_kubernetes_service_port_name]
        regex: http-prom
        action: keep
```

## Essential PromQL Queries

### Reconciliation Health

```promql
# Percentage of resources in Ready state
sum(gotk_reconcile_condition{type="Ready", status="True"})
/
count(gotk_reconcile_condition{type="Ready"})
* 100

# Resources not in Ready state (failing)
gotk_reconcile_condition{type="Ready", status="False"}

# Resources in Ready state grouped by kind
sum by (kind) (gotk_reconcile_condition{type="Ready", status="True"})
```

### Reconciliation Performance

```promql
# P95 reconciliation duration by controller kind
histogram_quantile(0.95,
  sum by (kind, le) (
    rate(gotk_reconcile_duration_seconds_bucket[5m])
  )
)

# Average reconciliation duration
sum by (kind) (rate(gotk_reconcile_duration_seconds_sum[5m]))
/
sum by (kind) (rate(gotk_reconcile_duration_seconds_count[5m]))

# Reconciliation rate (reconciliations per second)
sum by (kind) (rate(gotk_reconcile_duration_seconds_count[5m]))
```

### Suspended Resources

```promql
# Count of suspended resources
sum by (kind) (gotk_suspend == 1)

# List suspended resources
gotk_suspend == 1
```

## Alerting Rules

Create PrometheusRule resources for critical alerts:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: flux-alerts
  namespace: monitoring
spec:
  groups:
    - name: flux.reconciliation
      rules:
        - alert: FluxReconciliationFailure
          expr: gotk_reconcile_condition{type="Ready", status="False"} == 1
          for: 15m
          labels:
            severity: critical
          annotations:
            summary: "{{ $labels.kind }}/{{ $labels.name }} reconciliation failing"
            description: "{{ $labels.kind }} {{ $labels.namespace }}/{{ $labels.name }} has not been reconciling successfully for 15 minutes."

        - alert: FluxReconciliationSlow
          expr: |
            histogram_quantile(0.99,
              sum by (kind, le) (
                rate(gotk_reconcile_duration_seconds_bucket[15m])
              )
            ) > 300
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "{{ $labels.kind }} reconciliation is slow"
            description: "P99 reconciliation duration for {{ $labels.kind }} exceeds 5 minutes."

        - alert: FluxSuspendedResource
          expr: gotk_suspend == 1
          for: 24h
          labels:
            severity: info
          annotations:
            summary: "{{ $labels.kind }}/{{ $labels.name }} has been suspended for over 24 hours"
```

## Grafana Dashboard Setup

### Importing the Official Dashboard

The Flux project provides an official Grafana dashboard. Import it by ID:

1. In Grafana, go to Dashboards and click Import
2. Enter dashboard ID **16714**
3. Select your Prometheus data source

### Custom Dashboard Panels

Create additional panels for specific needs:

**Reconciliation Status Table**:

```promql
gotk_reconcile_condition{type="Ready"}
```

Format as a table with columns: kind, namespace, name, status.

**Controller Resource Usage** (requires cAdvisor metrics):

```promql
# Memory usage by Flux controller
sum by (container) (
  container_memory_working_set_bytes{namespace="flux-system", container!=""}
)

# CPU usage by Flux controller
sum by (container) (
  rate(container_cpu_usage_seconds_total{namespace="flux-system", container!=""}[5m])
)
```

## Verifying Metrics Collection

Confirm that Prometheus is scraping Flux metrics:

```bash
# Check that the ServiceMonitor targets are up in Prometheus
kubectl port-forward -n monitoring svc/prometheus-operated 9090:9090

# Open http://localhost:9090/targets and look for flux-system targets
```

Test a query:

```bash
curl -s 'http://localhost:9090/api/v1/query?query=gotk_reconcile_condition' | jq '.data.result | length'
```

## Troubleshooting

**No metrics from Flux controllers**: Verify the controllers expose the metrics port. Check that the Service objects in `flux-system` have the `http-prom` port:

```bash
kubectl get svc -n flux-system -o wide
```

**ServiceMonitor not picked up**: Ensure the labels on the ServiceMonitor match the Prometheus operator's `serviceMonitorSelector`. Check the Prometheus operator logs for discovery issues.

**High cardinality**: If you have many Flux resources, the `gotk_reconcile_condition` metric may have high cardinality. Monitor Prometheus memory usage and consider increasing retention or using recording rules.

Setting up Prometheus metrics for Flux controllers transforms your GitOps platform from a black box into an observable system. With proper dashboards and alerts, you can detect reconciliation failures early, track performance trends, and maintain confidence in your deployment pipeline.
