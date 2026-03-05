# How to Configure Custom Prometheus Metrics for Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Prometheus, Custom Metrics, Monitoring

Description: Learn how to extend Flux CD's default Prometheus metrics with custom recording rules, business metrics, and derived indicators for deeper observability.

---

While Flux CD controllers expose a comprehensive set of built-in metrics, you often need custom metrics that combine or transform these into more actionable indicators. This guide covers how to create custom Prometheus recording rules, derive business-relevant metrics, and build custom exporters that complement Flux CD's native metrics.

## Built-In Flux CD Metrics

Before creating custom metrics, understand what Flux already provides at the `/metrics` endpoint on each controller:

- `gotk_reconcile_condition` - Gauge with labels `type`, `status`, `kind`, `name`, `namespace`
- `gotk_reconcile_duration_seconds` - Histogram with labels `kind`, `name`, `namespace`
- `gotk_suspend_status` - Gauge (1 = suspended, 0 = active)
- `controller_runtime_reconcile_total` - Counter with label `result` (success/error/requeue)
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
            sum by (kind) (gotk_reconcile_condition{type="Ready", status="True"})

        - record: flux:resources:not_ready_total
          expr: |
            sum by (kind) (gotk_reconcile_condition{type="Ready", status="False"})

        # Reconciliation success rate over the last 5 minutes
        - record: flux:reconciliation:success_rate_5m
          expr: |
            sum by (controller) (rate(controller_runtime_reconcile_total{result="success"}[5m]))
            /
            sum by (controller) (rate(controller_runtime_reconcile_total[5m]))

        # Average reconciliation duration by kind
        - record: flux:reconciliation:avg_duration_seconds
          expr: |
            avg by (kind, namespace) (
              rate(gotk_reconcile_duration_seconds_sum[5m])
              /
              rate(gotk_reconcile_duration_seconds_count[5m])
            )

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
            sum by (namespace) (gotk_reconcile_condition{type="Ready", status="True"})
            /
            count by (namespace) (gotk_reconcile_condition{type="Ready"})

        # Suspended resource count per namespace
        - record: flux:namespace:suspended_count
          expr: |
            sum by (namespace) (gotk_suspend_status)
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
            summary: "Namespace {{ $labels.namespace }} health is {{ $value | humanizePercentage }}"
            description: "More than 20% of Flux resources in namespace {{ $labels.namespace }} are not ready."

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
          command: ["python", "/app/exporter.py"]
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

    TENANT_LAST_RECONCILE_AGE = Gauge(
        'flux_tenant_last_reconcile_age_seconds',
        'Seconds since last successful reconciliation',
        ['namespace', 'kind', 'name']
    )

    def collect_metrics():
        """Collect custom Flux metrics from the Kubernetes API."""
        config.load_incluster_config()
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

        for ns, count in ns_counts.items():
            TENANT_RESOURCE_COUNT.labels(
                namespace=ns, kind="Kustomization"
            ).set(count)

    if __name__ == "__main__":
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
    gotk_reconcile_condition{type="Ready"}
      * on(namespace) group_left(tenant)
    label_replace(
      kube_namespace_labels{label_toolkit_fluxcd_io_tenant!=""},
      "tenant", "$1", "label_toolkit_fluxcd_io_tenant", "(.*)"
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
