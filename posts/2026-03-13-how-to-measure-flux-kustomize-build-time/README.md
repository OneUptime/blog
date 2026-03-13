# How to Measure Flux Kustomize Build Time

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Performance, Benchmarking, Kustomize, Build Time

Description: Measure and optimize the time Flux spends running Kustomize builds during reconciliation to identify bottlenecks in your GitOps pipeline.

---

## Why Kustomize Build Time Matters

The kustomize-controller spends a significant portion of each reconciliation cycle running Kustomize builds. This involves reading base and overlay files, applying patches, performing variable substitution, and validating the output. For complex Kustomization hierarchies with many overlays and patches, build time can dominate the overall reconciliation duration.

## Metrics for Kustomize Build Time

### Overall Reconciliation Duration

The primary metric is the reconciliation duration for Kustomization objects:

```promql
gotk_reconcile_duration_seconds_bucket{kind="Kustomization"}
gotk_reconcile_duration_seconds_sum{kind="Kustomization"}
gotk_reconcile_duration_seconds_count{kind="Kustomization"}
```

This includes the entire reconciliation cycle (artifact download, Kustomize build, validation, and apply), but the build step is typically the largest component.

## Measuring Build Time with Prometheus

### Average Kustomize Reconciliation Duration

```bash
kubectl exec -n flux-system deploy/kustomize-controller -- \
  curl -s localhost:8080/metrics | \
  grep 'gotk_reconcile_duration_seconds_sum{kind="Kustomization"'
```

```bash
kubectl exec -n flux-system deploy/kustomize-controller -- \
  curl -s localhost:8080/metrics | \
  grep 'gotk_reconcile_duration_seconds_count{kind="Kustomization"'
```

### PromQL Queries for Dashboards

```promql
# Average reconciliation duration
rate(gotk_reconcile_duration_seconds_sum{kind="Kustomization"}[10m])
/
rate(gotk_reconcile_duration_seconds_count{kind="Kustomization"}[10m])
```

```promql
# P99 reconciliation duration
histogram_quantile(0.99,
  rate(gotk_reconcile_duration_seconds_bucket{kind="Kustomization"}[10m])
)
```

## Measuring Individual Kustomization Build Time

### Trigger and Time a Specific Kustomization

```bash
START=$(date +%s)

kubectl annotate kustomization my-app -n flux-system \
  reconcile.fluxcd.io/requestedAt="$(date +%s)" --overwrite

kubectl wait kustomization my-app -n flux-system \
  --for=condition=Ready --timeout=300s

END=$(date +%s)
echo "Reconciliation completed in $((END - START)) seconds"
```

### Check Controller Logs for Build Details

Enable debug logging to see detailed timing information:

```bash
# Temporarily increase log verbosity
kubectl patch deployment kustomize-controller -n flux-system \
  --type=json \
  -p='[{"op":"replace","path":"/spec/template/spec/containers/0/args","value":["--events-addr=http://notification-controller.flux-system.svc.cluster.local./","--watch-all-namespaces=true","--log-level=debug","--log-encoding=json","--enable-leader-election","--concurrent=10"]}]'
```

Then watch the logs:

```bash
kubectl logs -n flux-system deploy/kustomize-controller -f | \
  grep -E 'build|reconcil'
```

Remember to set the log level back to `info` after debugging:

```bash
# Revert through your GitOps repo or patch back
```

## Identifying Slow Kustomizations

List all Kustomizations and check their last reconciliation time:

```bash
flux get kustomizations --all-namespaces
```

Kustomizations that take noticeably longer than others are candidates for optimization.

## Running Kustomize Build Locally

To isolate build time from network and apply overhead, run the Kustomize build locally:

```bash
# Clone your repository
git clone https://github.com/my-org/my-repo.git
cd my-repo

# Time the Kustomize build
time kustomize build clusters/my-cluster/apps/my-app
```

If the local build is fast but the Flux reconciliation is slow, the bottleneck is in the apply phase or artifact download, not the build itself.

## Common Causes of Slow Kustomize Builds

1. **Remote bases**: Kustomization files that reference remote Git URLs force a network fetch during build time. Use local references instead.
2. **Large number of resources**: Building hundreds of resources in a single Kustomization is slower than splitting them into smaller units.
3. **Complex patches**: Strategic merge patches and JSON patches on large resources add processing time.
4. **Variable substitution**: Post-build substitutions with many variables add overhead.
5. **Deeply nested overlays**: Each layer of overlay nesting multiplies the build work.

## Summary

Measuring Kustomize build time helps you identify the slowest parts of your GitOps pipeline. Use Prometheus metrics for aggregate analysis, trigger individual reconciliations for specific measurements, and run local builds to isolate build time from other reconciliation steps. Focus optimization efforts on Kustomizations with the longest build durations.
