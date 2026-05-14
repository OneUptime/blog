# How to Set Up Prometheus Metrics for Flux CD Controllers

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Prometheus, Metric, Monitoring, Observability

Description: Learn how to set up Prometheus to scrape and visualize metrics from Flux CD controllers for monitoring reconciliation health and performance.

---

Flux CD controllers expose Prometheus metrics that provide deep insight into reconciliation duration and controller behavior. With kube-state-metrics configured for Flux custom resources, Prometheus can also expose resource readiness and suspension state. Setting up Prometheus to scrape these metrics and creating dashboards to visualize them is essential for operating Flux at scale.

## Metrics Exposed by Flux Controllers

Each Flux controller exposes metrics on port 8080 at the `/metrics` endpoint. The main controllers are:

**source-controller**: Manages GitRepository, HelmRepository, HelmChart, OCIRepository, and Bucket resources.

**kustomize-controller**: Manages Kustomization resources and applies manifests to the cluster.

**helm-controller**: Manages HelmRelease resources and performs Helm operations.

**notification-controller**: Manages Provider and Alert resources for event forwarding.

**image-reflector-controller**: Manages ImageRepository and ImagePolicy resources.

**image-automation-controller**: Manages ImageUpdateAutomation resources.

## Core Metrics

Flux controllers expose these reconciliation duration metrics:

```text
# Reconciliation duration (histogram)
gotk_reconcile_duration_seconds_bucket{kind, name, namespace, le}
gotk_reconcile_duration_seconds_sum{kind, name, namespace}
gotk_reconcile_duration_seconds_count{kind, name, namespace}

# Resource readiness and suspension state from kube-state-metrics
gotk_resource_info{customresource_kind, exported_namespace, name, ready, suspended}
```

## Setting Up PodMonitors

If you use the Prometheus Operator (kube-prometheus-stack), create a PodMonitor resource to scrape Flux controllers:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PodMonitor
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
    matchExpressions:
      - key: app
        operator: In
        values:
          - source-controller
          - kustomize-controller
          - helm-controller
          - notification-controller
          - image-reflector-controller
          - image-automation-controller
  podMetricsEndpoints:
    - port: http-prom
      interval: 30s
      scrapeTimeout: 10s
      path: /metrics
```

Ensure your Prometheus instance is configured to discover PodMonitors in the `flux-system` namespace. If using kube-prometheus-stack, add the namespace to the `podMonitorNamespaceSelector`:

```yaml
# In the kube-prometheus-stack HelmRelease values
prometheus:
  prometheusSpec:
    podMonitorNamespaceSelector:
      matchLabels:
        kubernetes.io/metadata.name: flux-system
```

Or use an empty selector to match all namespaces:

```yaml
prometheus:
  prometheusSpec:
    podMonitorNamespaceSelector: {}
    podMonitorSelector: {}
```

## Prometheus Scrape Config (Without Operator)

If you use Prometheus without the Operator, add scrape configs directly:

```yaml
scrape_configs:
  - job_name: 'flux-system'
    kubernetes_sd_configs:
      - role: pod
        namespaces:
          names:
            - flux-system
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_label_app]
        regex: (source-controller|kustomize-controller|helm-controller|notification-controller|image-reflector-controller|image-automation-controller)
        action: keep
      - source_labels: [__meta_kubernetes_pod_container_port_name]
        regex: http-prom
        action: keep
```

## Essential PromQL Queries

### Reconciliation Health

```promql
# Percentage of resources in Ready state
sum(gotk_resource_info{ready="True"})
/
count(gotk_resource_info)
* 100

# Resources not in Ready state (failing)
gotk_resource_info{ready!="True"}

# Resources in Ready state grouped by kind
sum by (customresource_kind) (gotk_resource_info{ready="True"})
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
sum by (customresource_kind) (gotk_resource_info{suspended="true"})

# List suspended resources
gotk_resource_info{suspended="true"}
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
          expr: gotk_resource_info{ready!="True"} == 1
          for: 15m
          labels:
            severity: critical
          annotations:
            summary: "{{ $labels.customresource_kind }}/{{ $labels.name }} reconciliation failing"
            description: "{{ $labels.customresource_kind }} {{ $labels.exported_namespace }}/{{ $labels.name }} has not been reconciling successfully for 15 minutes."

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
          expr: gotk_resource_info{suspended="true"} == 1
          for: 24h
          labels:
            severity: info
          annotations:
            summary: "{{ $labels.customresource_kind }}/{{ $labels.name }} has been suspended for over 24 hours"
```

## Grafana Dashboard Setup

### Importing the Official Dashboard

The Flux project provides example Grafana dashboards in the `fluxcd/flux2-monitoring-example` repository. Import the dashboard JSON files into Grafana:

1. Download the dashboard JSON files from `monitoring/configs/dashboards`
2. In Grafana, go to Dashboards and click Import
3. Select your Prometheus data source

### Custom Dashboard Panels

Create additional panels for specific needs:

**Reconciliation Status Table**:

```promql
gotk_resource_info
```

Format as a table with columns: customresource_kind, exported_namespace, name, ready.

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
# Check that the PodMonitor targets are up in Prometheus
kubectl port-forward -n monitoring svc/prometheus-operated 9090:9090

# Open http://localhost:9090/targets and look for flux-system targets
```

Test a query:

```bash
curl -s 'http://localhost:9090/api/v1/query?query=gotk_reconcile_duration_seconds_count' | jq '.data.result | length'
```

## Troubleshooting

**No metrics from Flux controllers**: Verify the controllers expose the metrics port. Check that the Pods in `flux-system` have the `http-prom` port:

```bash
kubectl get pods -n flux-system -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{range .spec.containers[*].ports[*]}{.name}{"\n"}{end}{end}'
```

**PodMonitor not picked up**: Ensure the labels on the PodMonitor match the Prometheus operator's `podMonitorSelector`. Check the Prometheus operator logs for discovery issues.

**High cardinality**: If you have many Flux resources, the `gotk_resource_info` metric may have high cardinality. Monitor Prometheus memory usage and consider increasing retention or using recording rules.

Setting up Prometheus metrics for Flux controllers transforms your GitOps platform from a black box into an observable system. With proper dashboards and alerts, you can detect reconciliation failures early, track performance trends, and maintain confidence in your deployment pipeline.
