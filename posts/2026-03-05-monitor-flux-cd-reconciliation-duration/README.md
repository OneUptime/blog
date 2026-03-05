# How to Monitor Flux CD Reconciliation Duration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Monitoring, Prometheus, Performance

Description: Learn how to monitor and alert on Flux CD reconciliation duration to identify slow deployments and performance bottlenecks in your GitOps pipeline.

---

Reconciliation duration is a critical performance metric for Flux CD. It measures how long it takes for Flux to apply changes from Git to the cluster. Long reconciliation times delay deployments and can indicate performance issues with the cluster, the Git repository, or the manifests being applied. This guide covers how to monitor, visualize, and alert on reconciliation duration.

## Understanding Reconciliation Duration

Flux CD tracks reconciliation duration through the `gotk_reconcile_duration_seconds` histogram metric. This metric is exposed by each Flux controller and includes the following labels:

- `kind` - The resource kind (Kustomization, HelmRelease, GitRepository, etc.)
- `name` - The resource name
- `namespace` - The resource namespace

The histogram has standard bucket boundaries, allowing you to compute percentiles and averages.

## Step 1: Query Raw Duration Metrics

Start by exploring the raw metrics available from Flux controllers.

```bash
# Port-forward to the kustomize-controller
kubectl port-forward -n flux-system deployment/kustomize-controller 8080:8080 &

# View raw histogram buckets
curl -s http://localhost:8080/metrics | grep gotk_reconcile_duration_seconds

# Example output:
# gotk_reconcile_duration_seconds_bucket{kind="Kustomization",name="flux-system",namespace="flux-system",le="0.1"} 0
# gotk_reconcile_duration_seconds_bucket{kind="Kustomization",name="flux-system",namespace="flux-system",le="0.25"} 5
# gotk_reconcile_duration_seconds_bucket{kind="Kustomization",name="flux-system",namespace="flux-system",le="0.5"} 15
# gotk_reconcile_duration_seconds_sum{kind="Kustomization",name="flux-system",namespace="flux-system"} 42.5
# gotk_reconcile_duration_seconds_count{kind="Kustomization",name="flux-system",namespace="flux-system"} 100
```

## Step 2: Calculate Average Duration

Compute the average reconciliation duration over a time window.

```yaml
# PromQL: Average reconciliation duration per resource over the last 5 minutes
# This gives you the mean time per reconciliation
avg by (kind, name, namespace) (
  rate(gotk_reconcile_duration_seconds_sum[5m])
  /
  rate(gotk_reconcile_duration_seconds_count[5m])
)
```

## Step 3: Calculate Percentile Duration

Percentiles are more useful than averages for understanding reconciliation performance because they show the worst-case experience.

```yaml
# PromQL: P50 (median) reconciliation duration
histogram_quantile(0.50,
  sum by (le, kind, name, namespace) (
    rate(gotk_reconcile_duration_seconds_bucket[5m])
  )
)

# PromQL: P95 reconciliation duration
histogram_quantile(0.95,
  sum by (le, kind, name, namespace) (
    rate(gotk_reconcile_duration_seconds_bucket[5m])
  )
)

# PromQL: P99 reconciliation duration
histogram_quantile(0.99,
  sum by (le, kind, name, namespace) (
    rate(gotk_reconcile_duration_seconds_bucket[5m])
  )
)
```

## Step 4: Create Recording Rules for Duration Metrics

Pre-compute duration percentiles for dashboard performance.

```yaml
# infrastructure/monitoring/flux-duration-rules.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: flux-duration-rules
  namespace: monitoring
spec:
  groups:
    - name: flux-reconciliation-duration
      interval: 30s
      rules:
        # Average duration by kind
        - record: flux:reconcile:avg_duration_seconds
          expr: |
            avg by (kind) (
              rate(gotk_reconcile_duration_seconds_sum[5m])
              /
              rate(gotk_reconcile_duration_seconds_count[5m])
            )

        # P50 duration by kind and namespace
        - record: flux:reconcile:p50_duration_seconds
          expr: |
            histogram_quantile(0.50,
              sum by (le, kind, namespace) (
                rate(gotk_reconcile_duration_seconds_bucket[5m])
              )
            )

        # P95 duration by kind and namespace
        - record: flux:reconcile:p95_duration_seconds
          expr: |
            histogram_quantile(0.95,
              sum by (le, kind, namespace) (
                rate(gotk_reconcile_duration_seconds_bucket[5m])
              )
            )

        # P99 duration by kind
        - record: flux:reconcile:p99_duration_seconds
          expr: |
            histogram_quantile(0.99,
              sum by (le, kind) (
                rate(gotk_reconcile_duration_seconds_bucket[5m])
              )
            )

        # Maximum observed duration (approximation using the highest bucket)
        - record: flux:reconcile:max_duration_seconds
          expr: |
            max by (kind, namespace) (
              rate(gotk_reconcile_duration_seconds_sum[5m])
              /
              rate(gotk_reconcile_duration_seconds_count[5m])
            )
```

## Step 5: Set Up Duration Alerts

Alert when reconciliation takes too long.

```yaml
# infrastructure/monitoring/flux-duration-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: flux-duration-alerts
  namespace: monitoring
spec:
  groups:
    - name: flux-duration-alerts
      rules:
        # Alert when average Kustomization reconciliation exceeds 60 seconds
        - alert: FluxKustomizationReconcileSlow
          expr: |
            flux:reconcile:avg_duration_seconds{kind="Kustomization"} > 60
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Kustomization reconciliation is slow"
            description: "Average Kustomization reconciliation duration is {{ $value | humanizeDuration }}."

        # Alert when P95 exceeds 5 minutes
        - alert: FluxReconcileP95High
          expr: |
            flux:reconcile:p95_duration_seconds > 300
          for: 15m
          labels:
            severity: warning
          annotations:
            summary: "{{ $labels.kind }} P95 reconciliation is {{ $value | humanizeDuration }}"
            description: "The 95th percentile reconciliation duration for {{ $labels.kind }} in {{ $labels.namespace }} exceeds 5 minutes."

        # Alert when HelmRelease reconciliation exceeds 10 minutes
        - alert: FluxHelmReleaseSlow
          expr: |
            flux:reconcile:p95_duration_seconds{kind="HelmRelease"} > 600
          for: 10m
          labels:
            severity: critical
          annotations:
            summary: "HelmRelease reconciliation is critically slow"
            description: "P95 HelmRelease reconciliation in {{ $labels.namespace }} exceeds 10 minutes."

        # Alert when reconciliation duration is increasing over time
        - alert: FluxReconcileDurationIncreasing
          expr: |
            deriv(flux:reconcile:avg_duration_seconds[1h]) > 0.1
          for: 30m
          labels:
            severity: info
          annotations:
            summary: "{{ $labels.kind }} reconciliation duration is trending up"
            description: "Average reconciliation duration for {{ $labels.kind }} is increasing."
```

## Step 6: Build a Duration Monitoring Dashboard

Create a Grafana dashboard focused on reconciliation duration.

```yaml
# Key panels for a duration dashboard:

# Panel 1: Average Duration by Kind (Time Series)
# Query: flux:reconcile:avg_duration_seconds

# Panel 2: P50 vs P95 vs P99 Duration (Time Series)
# Query 1: flux:reconcile:p50_duration_seconds
# Query 2: flux:reconcile:p95_duration_seconds
# Query 3: flux:reconcile:p99_duration_seconds

# Panel 3: Duration Heatmap
# Query: sum by (le) (rate(gotk_reconcile_duration_seconds_bucket[5m]))

# Panel 4: Slowest Resources Table
# Query: topk(10, flux:reconcile:avg_duration_seconds)

# Panel 5: Duration by Namespace (for multi-tenant)
# Query: flux:reconcile:p95_duration_seconds by (namespace)
```

## Step 7: Investigate Slow Reconciliations

When you detect slow reconciliations, use these commands to investigate.

```bash
# Check the reconciliation status and timing
flux get kustomizations -A -o wide

# Look at events for slow resources
kubectl describe kustomization <name> -n <namespace>

# Check controller logs for the slow resource
kubectl logs -n flux-system deployment/kustomize-controller | \
  grep "<resource-name>"

# Check if the source fetch is slow
flux get sources git -A -o wide

# Check resource count in the Kustomization
kubectl get kustomization <name> -n <namespace> -o jsonpath='{.status.inventory.entries}' | jq length
```

## Common Causes of Slow Reconciliation

- Large number of resources in a single Kustomization
- Slow Git repository cloning (large repos, slow network)
- Helm chart dependencies that take time to download
- Cluster API server under load
- Complex Kustomize overlays with many patches

## Summary

Monitoring Flux CD reconciliation duration involves querying the `gotk_reconcile_duration_seconds` histogram metric to compute averages and percentiles. Create recording rules to pre-compute these values for efficient dashboarding, and set up alerts for when duration exceeds acceptable thresholds. Track both P95 and average duration, as P95 reveals worst-case performance while averages show overall trends. When slow reconciliation is detected, investigate the source fetch time, resource count, and controller logs to identify the bottleneck.
