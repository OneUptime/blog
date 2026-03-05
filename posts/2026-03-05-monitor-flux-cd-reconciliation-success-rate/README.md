# How to Monitor Flux CD Reconciliation Success Rate

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Monitoring, Prometheus, SLOs

Description: Learn how to monitor Flux CD reconciliation success rates using Prometheus metrics to track deployment reliability and set up SLO-based alerting.

---

Reconciliation success rate measures the percentage of Flux CD reconciliations that complete without errors. This is one of the most important metrics for a GitOps platform because it directly reflects deployment reliability. A drop in success rate means changes are not being applied to the cluster as expected. This guide covers how to calculate, monitor, and alert on reconciliation success rates.

## Key Metrics for Success Rate

Flux CD exposes several metrics relevant to success rate calculation:

- `gotk_reconcile_condition{type="Ready"}` - Current condition of each resource (status="True" means healthy)
- `controller_runtime_reconcile_total{result="success"}` - Counter of successful reconciliations
- `controller_runtime_reconcile_total{result="error"}` - Counter of failed reconciliations
- `controller_runtime_reconcile_errors_total` - Counter of reconciliation errors

## Step 1: Calculate the Instantaneous Success Rate

The simplest success rate calculation uses the `gotk_reconcile_condition` gauge.

```yaml
# PromQL: Percentage of resources in Ready state
# Returns a value between 0 and 1
sum(gotk_reconcile_condition{type="Ready", status="True"})
/
count(gotk_reconcile_condition{type="Ready"})
```

For per-namespace (per-tenant) success rate:

```yaml
# PromQL: Per-namespace health percentage
sum by (namespace) (gotk_reconcile_condition{type="Ready", status="True"})
/
count by (namespace) (gotk_reconcile_condition{type="Ready"})
```

## Step 2: Calculate the Reconciliation Success Rate Over Time

Use the counter-based metrics for a time-window success rate.

```yaml
# PromQL: Success rate over the last 5 minutes by controller
sum by (controller) (rate(controller_runtime_reconcile_total{result="success"}[5m]))
/
sum by (controller) (rate(controller_runtime_reconcile_total[5m]))

# PromQL: Error rate over the last 5 minutes (inverse of success)
sum by (controller) (rate(controller_runtime_reconcile_errors_total[5m]))
/
sum by (controller) (rate(controller_runtime_reconcile_total[5m]))
```

## Step 3: Create Recording Rules

Pre-compute success rates for efficient dashboarding and alerting.

```yaml
# infrastructure/monitoring/flux-success-rate-rules.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: flux-success-rate-rules
  namespace: monitoring
spec:
  groups:
    - name: flux-success-rate
      interval: 30s
      rules:
        # Overall cluster success rate (instant)
        - record: flux:cluster:ready_ratio
          expr: |
            sum(gotk_reconcile_condition{type="Ready", status="True"})
            /
            count(gotk_reconcile_condition{type="Ready"})

        # Per-namespace success rate (instant)
        - record: flux:namespace:ready_ratio
          expr: |
            sum by (namespace) (gotk_reconcile_condition{type="Ready", status="True"})
            /
            count by (namespace) (gotk_reconcile_condition{type="Ready"})

        # Per-kind success rate (instant)
        - record: flux:kind:ready_ratio
          expr: |
            sum by (kind) (gotk_reconcile_condition{type="Ready", status="True"})
            /
            count by (kind) (gotk_reconcile_condition{type="Ready"})

        # Controller reconciliation success rate (5m window)
        - record: flux:controller:success_rate_5m
          expr: |
            sum by (controller) (rate(controller_runtime_reconcile_total{result="success"}[5m]))
            /
            sum by (controller) (rate(controller_runtime_reconcile_total[5m]))

        # Controller reconciliation success rate (1h window)
        - record: flux:controller:success_rate_1h
          expr: |
            sum by (controller) (rate(controller_runtime_reconcile_total{result="success"}[1h]))
            /
            sum by (controller) (rate(controller_runtime_reconcile_total[1h]))

        # Per-namespace reconciliation error count
        - record: flux:namespace:error_count_5m
          expr: |
            sum by (namespace) (increase(controller_runtime_reconcile_errors_total[5m]))

        # Not-ready resource count
        - record: flux:cluster:not_ready_count
          expr: |
            sum(gotk_reconcile_condition{type="Ready", status="False"})
```

## Step 4: Set Up SLO-Based Alerts

Define Service Level Objectives for reconciliation success and alert when they are breached.

```yaml
# infrastructure/monitoring/flux-slo-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: flux-slo-alerts
  namespace: monitoring
spec:
  groups:
    - name: flux-slo
      rules:
        # SLO: 99% of resources should be in Ready state
        - alert: FluxClusterSLOBreach
          expr: flux:cluster:ready_ratio < 0.99
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "Flux cluster readiness is {{ $value | humanizePercentage }}"
            description: "Less than 99% of Flux resources are in Ready state. Current: {{ $value | humanizePercentage }}."

        # SLO: Per-namespace readiness should be above 95%
        - alert: FluxNamespaceSLOBreach
          expr: flux:namespace:ready_ratio < 0.95
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Namespace {{ $labels.namespace }} readiness is {{ $value | humanizePercentage }}"
            description: "Namespace {{ $labels.namespace }} has less than 95% of Flux resources in Ready state."

        # Controller error rate exceeds 5% over 5 minutes
        - alert: FluxControllerHighErrorRate
          expr: flux:controller:success_rate_5m < 0.95
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "{{ $labels.controller }} success rate is {{ $value | humanizePercentage }}"
            description: "Controller {{ $labels.controller }} has a reconciliation success rate below 95% over the last 5 minutes."

        # Any resource stuck in not-ready for extended time
        - alert: FluxResourceStuckNotReady
          expr: |
            gotk_reconcile_condition{type="Ready", status="False"} == 1
          for: 30m
          labels:
            severity: warning
          annotations:
            summary: "{{ $labels.kind }}/{{ $labels.name }} stuck in not-ready state"
            description: "{{ $labels.kind }}/{{ $labels.name }} in {{ $labels.namespace }} has been not-ready for 30+ minutes."

        # Zero successful reconciliations (controller may be down)
        - alert: FluxControllerNoReconciliations
          expr: |
            rate(controller_runtime_reconcile_total[10m]) == 0
          for: 15m
          labels:
            severity: critical
          annotations:
            summary: "{{ $labels.controller }} has no reconciliations"
            description: "Controller {{ $labels.controller }} has not performed any reconciliations in 15 minutes. It may be down."
```

## Step 5: Build a Success Rate Dashboard

Key Grafana panels for monitoring success rates.

```yaml
# Panel 1: Cluster-Wide Readiness Gauge
# Query: flux:cluster:ready_ratio * 100
# Visualization: Gauge with thresholds at 95 (yellow) and 99 (green)

# Panel 2: Success Rate by Namespace (Bar Chart)
# Query: flux:namespace:ready_ratio * 100

# Panel 3: Controller Success Rate Over Time (Time Series)
# Query 1: flux:controller:success_rate_5m{controller="kustomize-controller"}
# Query 2: flux:controller:success_rate_5m{controller="helm-controller"}
# Query 3: flux:controller:success_rate_5m{controller="source-controller"}

# Panel 4: Not-Ready Resources (Table)
# Query: gotk_reconcile_condition{type="Ready", status="False"} == 1

# Panel 5: Error Count by Namespace (Time Series)
# Query: flux:namespace:error_count_5m

# Panel 6: SLO Burn Rate
# Query: 1 - flux:cluster:ready_ratio
```

## Step 6: Investigate Failed Reconciliations

When the success rate drops, use these commands to identify failing resources.

```bash
# List all resources that are not ready
flux get all -A --status-selector ready=false

# Get details on a specific failing resource
kubectl describe kustomization <name> -n <namespace>

# Check controller logs for errors
kubectl logs -n flux-system deployment/kustomize-controller \
  --since=10m | grep -i error

# Check events for reconciliation failures
kubectl get events -n flux-system --field-selector reason=ReconciliationFailed

# For helm-controller failures
kubectl logs -n flux-system deployment/helm-controller \
  --since=10m | grep -i error
```

## Step 7: Track Success Rate Trends

Use longer time windows to identify trends in deployment reliability.

```yaml
# PromQL: Daily success rate for trend analysis
sum by (controller) (increase(controller_runtime_reconcile_total{result="success"}[24h]))
/
sum by (controller) (increase(controller_runtime_reconcile_total[24h]))

# PromQL: Weekly success rate
sum by (controller) (increase(controller_runtime_reconcile_total{result="success"}[7d]))
/
sum by (controller) (increase(controller_runtime_reconcile_total[7d]))
```

## Summary

Monitoring Flux CD reconciliation success rate involves tracking both the instant readiness ratio (using `gotk_reconcile_condition`) and the time-windowed success rate (using `controller_runtime_reconcile_total`). Create recording rules that pre-compute these rates at different granularities (cluster, namespace, controller), and set up SLO-based alerts that trigger when success rates drop below acceptable thresholds. A healthy Flux CD deployment should maintain above 99% readiness for all managed resources, with controller success rates above 95%.
