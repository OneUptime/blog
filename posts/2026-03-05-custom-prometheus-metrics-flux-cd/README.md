# How to Configure Custom Prometheus Metrics for Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Prometheus, Custom Metric, Monitoring

Description: Learn how to extend Flux CD's default Prometheus metrics with custom recording rules, business metrics, and derived indicators for deeper observability.

---

While Flux CD controllers and kube-state-metrics can expose a comprehensive set of metrics, you often need custom metrics that combine or transform these into more actionable indicators. This guide covers how to create custom Prometheus recording rules, derive business-relevant metrics, and build custom exporters that complement Flux CD's native metrics.

## Built-In Flux CD Metrics

Before creating custom metrics, understand what Flux already provides at the `/metrics` endpoint on each controller and what the Flux monitoring example exposes through kube-state-metrics:

- `gotk_reconcile_duration_seconds` - Histogram with labels `kind`, `name`, `namespace`
- `gotk_resource_info` - Info metric from kube-state-metrics with labels such as `customresource_kind`, `name`, `exported_namespace`, `ready`, and `suspended`
- `controller_runtime_reconcile_total` - Counter with label `result` (success/error/requeue/requeue_after)
- `controller_runtime_reconcile_errors_total` - Counter of reconciliation errors
- `controller_runtime_reconcile_time_seconds` - Histogram of controller reconciliation time

## Step 1: Create Recording Rules for Derived Metrics

Recording rules pre-compute frequently used queries for better dashboard performance.

```yaml
# infrastructure/monitoring/flux-recording-rules.yaml

apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: flux-recording-rules
  namespace: monitoring
spec:
  groups:
    - name: flux-custom-metrics
      interval: 30s
      rules:
        # Total count of ready vs not-ready resources
        - record: flux:resources:ready_total
          expr: |
            sum by (customresource_kind) (gotk_resource_info{ready="True"})

        - record: flux:resources:not_ready_total
          expr: |
            sum by (customresource_kind) (gotk_resource_info{ready!="True"})

        # Reconciliation success rate over the last 5 minutes
        - record: flux:reconciliation:success_rate_5m
          expr: |
            sum by (controller) (rate(controller_runtime_reconcile_total{result="success"}[5m]))
            /
            sum by (controller) (rate(controller_runtime_reconcile_total[5m]))

        # Average reconciliation duration by kind
        - record: flux:reconciliation:avg_duration_seconds
          expr: |
            sum by (kind, namespace) (rate(gotk_reconcile_duration_seconds_sum[5m]))
            /
            sum by (kind, namespace) (rate(gotk_reconcile_duration_seconds_count[5m]))

        # P95 reconciliation duration by kind
        - record: flux:reconciliation:p95_duration_seconds
          expr: |
            histogram_quantile(0.95,
              sum by (le, kind) (
                rate(gotk_reconcile_duration_seconds_bucket[5m])
              )
            )

        # Per-namespace resource health score (0-1)
        - record: flux:namespace:health_score
          expr: |
            sum by (exported_namespace) (gotk_resource_info{ready="True"})
            /
            count by (exported_namespace) (gotk_resource_info)

        # Suspended resource count per namespace
        - record: flux:namespace:suspended_count
          expr: |
            sum by (exported_namespace) (gotk_resource_info{suspended="true"})
```

## Step 2: Create Alerting Rules Based on Custom Metrics

Use the recording rules to create cleaner alert expressions.

```yaml
# infrastructure/monitoring/flux-custom-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: flux-custom-alerts
  namespace: monitoring
spec:
  groups:
    - name: flux-custom-alerts
      rules:
        # Alert when namespace health drops below 80%
        - alert: FluxNamespaceHealthDegraded
          expr: flux:namespace:health_score < 0.8
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Namespace {{ $labels.exported_namespace }} health is {{ $value | humanizePercentage }}"
            description: "More than 20% of Flux resources in namespace {{ $labels.exported_namespace }} are not ready."

        # Alert when reconciliation success rate drops
        - alert: FluxReconciliationSuccessRateLow
          expr: flux:reconciliation:success_rate_5m < 0.95
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "{{ $labels.controller }} success rate is {{ $value | humanizePercentage }}"
            description: "Controller {{ $labels.controller }} reconciliation success rate has dropped below 95%."

        # Alert on high P95 reconciliation duration
        - alert: FluxReconciliationSlowP95
          expr: flux:reconciliation:p95_duration_seconds > 120
          for: 15m
          labels:
            severity: warning
          annotations:
            summary: "{{ $labels.kind }} P95 reconciliation is {{ $value | humanizeDuration }}"
```

## Step 3: Create a Custom Exporter for Business Metrics

For metrics not covered by Flux's built-in exporters, create a custom exporter that queries the Kubernetes API.

```yaml
# infrastructure/monitoring/flux-custom-exporter.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: flux-custom-exporter
  namespace: monitoring
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: flux-custom-exporter
rules:
  - apiGroups: ["kustomize.toolkit.fluxcd.io"]
    resources: ["kustomizations"]
    verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: flux-custom-exporter
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: flux-custom-exporter
subjects:
  - kind: ServiceAccount
    name: flux-custom-exporter
    namespace: monitoring
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: flux-custom-exporter
  namespace: monitoring
spec:
  replicas: 1
  selector:
    matchLabels:
      app: flux-custom-exporter
  template:
    metadata:
      labels:
        app: flux-custom-exporter
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9090"
    spec:
      serviceAccountName: flux-custom-exporter
      containers:
        - name: exporter
          image: python:3.11-slim
          command: ["sh", "-c"]
          args:
            - "pip install --no-cache-dir kubernetes prometheus-client && python /app/exporter.py"
          ports:
            - containerPort: 9090
          volumeMounts:
            - name: exporter-script
              mountPath: /app
      volumes:
        - name: exporter-script
          configMap:
            name: flux-exporter-script
```

The exporter script collects custom metrics from the Kubernetes API.

```yaml
# infrastructure/monitoring/flux-exporter-script.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: flux-exporter-script
  namespace: monitoring
data:
  exporter.py: |
    """Custom Flux CD metrics exporter."""
    from prometheus_client import start_http_server, Gauge
    from kubernetes import client, config
    import time

    # Define custom metrics
    TENANT_RESOURCE_COUNT = Gauge(
        'flux_tenant_resource_count',
        'Number of Flux resources per tenant namespace',
        ['namespace', 'kind']
    )

    def collect_metrics():
        """Collect custom Flux metrics from the Kubernetes API."""
        custom_api = client.CustomObjectsApi()

        # Count Kustomizations per namespace
        kustomizations = custom_api.list_cluster_custom_object(
            group="kustomize.toolkit.fluxcd.io",
            version="v1",
            plural="kustomizations"
        )
        ns_counts = {}
        for ks in kustomizations.get("items", []):
            ns = ks["metadata"]["namespace"]
            ns_counts[ns] = ns_counts.get(ns, 0) + 1

        TENANT_RESOURCE_COUNT.clear()
        for ns, count in ns_counts.items():
            TENANT_RESOURCE_COUNT.labels(
                namespace=ns, kind="Kustomization"
            ).set(count)

    if __name__ == "__main__":
        config.load_incluster_config()
        start_http_server(9090)
        while True:
            collect_metrics()
            time.sleep(30)
```

## Step 4: Add Labels for Multi-Tenant Filtering

Ensure that custom metrics include namespace labels so they can be filtered by tenant.

```yaml
# Recording rule that adds tenant labels
- record: flux:tenant:resource_status
  expr: |
    gotk_resource_info
      * on(exported_namespace) group_left(tenant)
    label_replace(
      label_replace(
        kube_namespace_labels{label_toolkit_fluxcd_io_tenant!=""},
        "tenant", "$1", "label_toolkit_fluxcd_io_tenant", "(.*)"
      ),
      "exported_namespace", "$1", "namespace", "(.*)"
    )
```

## Step 5: Verify Custom Metrics

Check that your custom metrics are available in Prometheus.

```bash
# Query recording rules
curl -s 'http://localhost:9090/api/v1/query?query=flux:resources:ready_total' | jq .

# Query custom health score
curl -s 'http://localhost:9090/api/v1/query?query=flux:namespace:health_score' | jq .

# Query reconciliation success rate
curl -s 'http://localhost:9090/api/v1/query?query=flux:reconciliation:success_rate_5m' | jq .

# Verify recording rules are loaded
curl -s 'http://localhost:9090/api/v1/rules?type=record' | jq '.data.groups[] | select(.name=="flux-custom-metrics")'
```

## Summary

Custom Prometheus metrics for Flux CD are built through recording rules that derive actionable indicators from built-in metrics, alerting rules that trigger on custom thresholds, and optional custom exporters for metrics not available from Flux controllers directly. Key custom metrics include per-namespace health scores, reconciliation success rates, and tenant-level resource counts. Recording rules improve dashboard performance by pre-computing complex queries, while custom exporters fill gaps in the built-in metric set.
