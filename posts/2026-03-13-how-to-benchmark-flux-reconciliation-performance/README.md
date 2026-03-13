# How to Benchmark Flux Reconciliation Performance

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Performance, Benchmarking, Monitoring, Prometheus

Description: Measure and benchmark Flux reconciliation performance using built-in Prometheus metrics and practical testing approaches.

---

## Why Benchmark Flux Reconciliation

Understanding how fast Flux reconciles your resources is essential for capacity planning and performance optimization. Without baseline measurements, you cannot tell whether a configuration change actually improved performance or whether your cluster can handle additional workloads within acceptable latency bounds.

## Key Metrics to Measure

Flux controllers expose Prometheus metrics on port 8080. The most important ones for benchmarking are:

### Reconciliation Duration

```promql
gotk_reconcile_duration_seconds_bucket
gotk_reconcile_duration_seconds_sum
gotk_reconcile_duration_seconds_count
```

This histogram shows how long each reconciliation takes, broken down by kind (Kustomization, HelmRelease, GitRepository, etc.) and result (success or failure).

### Reconciliation Count

```promql
gotk_reconcile_condition
```

This gauge shows the current condition of each reconciled object.

### Controller Runtime Metrics

```promql
controller_runtime_reconcile_total
controller_runtime_reconcile_time_seconds_bucket
controller_runtime_active_workers
```

These show the total number of reconciliations, their duration from the controller-runtime perspective, and how many workers are active.

## Setting Up a Benchmark

### Step 1 - Establish a Baseline

Before making any changes, capture the current reconciliation performance:

```bash
# Get average reconciliation duration for the last hour
kubectl exec -n flux-system deploy/kustomize-controller -- \
  curl -s localhost:8080/metrics | grep gotk_reconcile_duration_seconds_sum

kubectl exec -n flux-system deploy/kustomize-controller -- \
  curl -s localhost:8080/metrics | grep gotk_reconcile_duration_seconds_count
```

Calculate the average: sum divided by count.

### Step 2 - Trigger a Full Reconciliation

Force all Kustomizations to reconcile at once to measure throughput:

```bash
# Annotate all Kustomizations to trigger reconciliation
kubectl get kustomizations --all-namespaces -o name | \
  xargs -I{} kubectl annotate {} -n flux-system \
  reconcile.fluxcd.io/requestedAt="$(date +%s)" --overwrite
```

### Step 3 - Measure the Total Time

Watch the reconciliation progress:

```bash
# Monitor until all Kustomizations show Ready
watch kubectl get kustomizations --all-namespaces
```

Record the time from when you triggered the reconciliation to when all objects show Ready status.

### Step 4 - Use flux CLI for Quick Checks

The Flux CLI provides a convenient way to check reconciliation status:

```bash
# Check all Kustomizations
flux get kustomizations --all-namespaces

# Check all HelmReleases
flux get helmreleases --all-namespaces

# Check all sources
flux get sources all --all-namespaces
```

## Building a Prometheus Dashboard

For ongoing monitoring, create a Grafana dashboard with the following queries:

### Average Reconciliation Duration (Last 5 Minutes)

```promql
rate(gotk_reconcile_duration_seconds_sum[5m])
/
rate(gotk_reconcile_duration_seconds_count[5m])
```

### P99 Reconciliation Duration

```promql
histogram_quantile(0.99,
  rate(gotk_reconcile_duration_seconds_bucket[5m])
)
```

### Reconciliation Throughput

```promql
rate(controller_runtime_reconcile_total[5m])
```

### Active Workers

```promql
controller_runtime_active_workers
```

## Comparing Before and After

When benchmarking a specific optimization (like increasing concurrency), follow this process:

1. Capture baseline metrics for at least 30 minutes
2. Apply the optimization
3. Wait for the controller to restart and stabilize (5 minutes)
4. Capture post-optimization metrics for at least 30 minutes
5. Compare average and P99 reconciliation durations

## Automated Benchmarking Script

```bash
#!/bin/bash
# benchmark-flux.sh - Measure Flux reconciliation performance

NAMESPACE="flux-system"
CONTROLLERS=("source-controller" "kustomize-controller" "helm-controller")

for controller in "${CONTROLLERS[@]}"; do
  echo "=== $controller ==="

  metrics=$(kubectl exec -n "$NAMESPACE" "deploy/$controller" -- \
    curl -s localhost:8080/metrics)

  sum=$(echo "$metrics" | grep 'gotk_reconcile_duration_seconds_sum{' | \
    awk '{total+=$2} END {print total}')
  count=$(echo "$metrics" | grep 'gotk_reconcile_duration_seconds_count{' | \
    awk '{total+=$2} END {print total}')

  if [ "$count" != "0" ] && [ -n "$count" ]; then
    avg=$(echo "scale=3; $sum / $count" | bc)
    echo "  Total reconciliations: $count"
    echo "  Average duration: ${avg}s"
  else
    echo "  No reconciliations recorded"
  fi

  active=$(echo "$metrics" | grep 'controller_runtime_active_workers' | \
    awk '{print $2}')
  echo "  Active workers: $active"
  echo ""
done
```

Make it executable and run:

```bash
chmod +x benchmark-flux.sh
./benchmark-flux.sh
```

## Summary

Benchmarking Flux reconciliation performance starts with collecting baseline metrics from the built-in Prometheus endpoints. Trigger full reconciliation cycles, measure duration and throughput, and build dashboards for ongoing monitoring. Always compare before-and-after metrics when making optimization changes.
