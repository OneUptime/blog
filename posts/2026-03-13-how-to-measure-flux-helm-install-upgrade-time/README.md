# How to Measure Flux Helm Install/Upgrade Time

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Performance, Benchmarking, Helm, Install, Upgrade

Description: Measure and analyze how long Flux takes to perform Helm install and upgrade operations to identify performance bottlenecks in Helm-based deployments.

---

## Why Helm Install and Upgrade Time Matters

Helm install and upgrade operations are among the most time-consuming steps in a Flux reconciliation cycle for HelmRelease objects. Each operation involves template rendering, dry-run validation (if enabled), and the actual installation or upgrade against the Kubernetes API server. When you manage many HelmReleases, slow individual operations compound into long total reconciliation times.

## Key Metrics

### HelmRelease Reconciliation Duration

```promql
gotk_reconcile_duration_seconds_bucket{kind="HelmRelease"}
gotk_reconcile_duration_seconds_sum{kind="HelmRelease"}
gotk_reconcile_duration_seconds_count{kind="HelmRelease"}
```

This captures the full reconciliation duration including chart download, template rendering, and the install or upgrade operation.

### Controller Runtime Metrics

```promql
controller_runtime_reconcile_time_seconds_bucket{controller="helmrelease"}
```

This provides the controller-runtime view of reconciliation timing.

## Measuring with Prometheus

### Average Helm Reconciliation Duration

```bash
kubectl -n flux-system port-forward deploy/helm-controller 8080:8080
```

In another terminal:

```bash
curl -s localhost:8080/metrics | \
  grep 'gotk_reconcile_duration_seconds_sum{kind="HelmRelease"'
```

```bash
curl -s localhost:8080/metrics | \
  grep 'gotk_reconcile_duration_seconds_count{kind="HelmRelease"'
```

### PromQL Queries

```promql
# Average Helm install/upgrade time

sum(rate(gotk_reconcile_duration_seconds_sum{kind="HelmRelease"}[10m]))
/
sum(rate(gotk_reconcile_duration_seconds_count{kind="HelmRelease"}[10m]))
```

```promql
# P95 Helm install/upgrade time
histogram_quantile(0.95,
  sum by (le) (rate(gotk_reconcile_duration_seconds_bucket{kind="HelmRelease"}[10m]))
)
```

```promql
# Reconciliation throughput (operations per second)
rate(controller_runtime_reconcile_total{controller="helmrelease"}[5m])
```

## Timing Individual HelmRelease Operations

### Trigger and Measure

```bash
START=$(date +%s)

kubectl annotate helmrelease my-release -n my-namespace \
  reconcile.fluxcd.io/requestedAt="$(date +%s)" --overwrite

kubectl wait helmrelease my-release -n my-namespace \
  --for=condition=Ready --timeout=600s

END=$(date +%s)
echo "Helm operation completed in $((END - START)) seconds"
```

### Check the HelmRelease Status

```bash
kubectl get helmrelease my-release -n my-namespace -o yaml | \
  grep -A 20 'status:'
```

The status section includes the last attempted revision, last attempted release action and duration, release history, and conditions with timestamps that help you reconstruct the timeline.

## Analyzing Helm Controller Logs

Inspect helm-controller logs for operation details:

```bash
kubectl logs -n flux-system deploy/helm-controller -f | \
  grep -E 'install|upgrade|reconcil|duration'
```

Look for log entries that indicate:
- When template rendering started and finished
- When the dry-run completed (if enabled)
- When the actual install or upgrade started and finished
- Any retries due to conflicts

## Comparing Install vs Upgrade Performance

Install and upgrade performance varies by chart and cluster state. Upgrades often have additional work because Helm is updating an existing release instead of creating a new one. To measure each type separately, look at the helm-controller logs or `.status.history` for `install` vs `upgrade` action types.

## Common Causes of Slow Helm Operations

1. **Large charts**: Charts that render thousands of resources take longer to template and apply.
2. **CRD installation**: Charts that include CRDs in the install step are slower because CRD creation involves additional API server validation.
3. **Hook execution**: Helm hooks (pre-install, post-install, pre-upgrade, post-upgrade) run as Kubernetes Jobs and add time proportional to their execution duration.
4. **Timeout waiting**: Helm waits for resources to become ready by default. Slow rollouts increase the total time.
5. **API server load**: Concurrent HelmRelease operations put pressure on the API server, which can slow down individual operations.

## Optimizing Helm Operation Time

### Disable Install Remediation Retries for Testing

During benchmarking, you may want to disable retries to get clean measurements:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-release
spec:
  install:
    remediation:
      retries: 0
  upgrade:
    remediation:
      retries: 0
```

### Skip Tests

Helm tests run after install and upgrade only when enabled. Keep them disabled during benchmarking to avoid adding test execution time to the reconciliation:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-release
spec:
  test:
    enable: false
```

## Summary

Measuring Helm install and upgrade time helps you identify which HelmReleases are the slowest in your cluster. Use Prometheus metrics for aggregate analysis, trigger individual operations for specific measurements, and analyze controller logs for detailed breakdowns. Focus on reducing chart complexity, minimizing hooks, and tuning concurrency to improve overall Helm performance in Flux.
