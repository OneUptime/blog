# How to Measure Flux Kustomize Build Time

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Performance, Benchmarking, Kustomize, Build Time

Description: Measure and optimize the time Flux spends running Kustomize builds during reconciliation to identify bottlenecks in your GitOps pipeline.

---

## Why Kustomize Build Time Matters

The kustomize-controller spends part of each reconciliation cycle generating manifests with Kustomize. This involves reading base and overlay files and applying patches, followed by Flux post-build substitution, validation against the Kubernetes API, and server-side apply. For complex Kustomization hierarchies with many overlays and patches, build time can be a significant part of the overall reconciliation duration.

## Metrics for Kustomization Reconciliation Time

### Overall Reconciliation Duration

The primary metric is the reconciliation duration for Kustomization objects:

```promql
gotk_reconcile_duration_seconds_bucket{kind="Kustomization"}
gotk_reconcile_duration_seconds_sum{kind="Kustomization"}
gotk_reconcile_duration_seconds_count{kind="Kustomization"}
```

This includes the entire reconciliation cycle, including artifact download, manifest generation, validation, and apply. Flux does not expose a separate built-in Prometheus metric for only the Kustomize build step, so use this metric as a starting point and compare it with local build timings.

## Measuring Reconciliation Time with Prometheus

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

If the controller image does not include `curl`, port-forward the metrics endpoint instead:

```bash
kubectl -n flux-system port-forward deploy/kustomize-controller 8080:8080
curl -s localhost:8080/metrics | grep 'gotk_reconcile_duration_seconds'
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

## Measuring Individual Kustomization Reconciliation Time

### Trigger and Time a Specific Kustomization Reconciliation

```bash
START=$(date +%s)

kubectl annotate --field-manager=flux-client-side-apply \
  kustomization/my-app -n flux-system \
  reconcile.fluxcd.io/requestedAt="$(date +%s)" --overwrite

kubectl wait kustomization/my-app -n flux-system \
  --for=condition=ready --timeout=300s

END=$(date +%s)
echo "Reconciliation completed in $((END - START)) seconds"
```

### Check Controller Logs for Reconciliation Details

Enable debug logging to see more detailed reconciliation information. In GitOps-managed installations, add the log-level flag through your Flux customization instead of replacing the whole container argument list:

```yaml
- op: add
  path: /spec/template/spec/containers/0/args/-
  value: --log-level=debug
```

Then watch the logs:

```bash
flux logs --kind=Kustomization --name=my-app --namespace=flux-system --since=10m
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

If the local build is fast but the Flux reconciliation is slow, the bottleneck is likely in another reconciliation phase, such as artifact download, validation, health checks, or server-side apply.

## Common Causes of Slow Kustomize Builds or Reconciliations

1. **Remote bases**: Kustomization files that reference remote Git URLs force a network fetch during build time. Use local references instead.
2. **Large number of resources**: Building hundreds of resources in a single Kustomization is slower than splitting them into smaller units.
3. **Complex patches**: Strategic merge patches and JSON patches on large resources add processing time.
4. **Variable substitution**: Flux post-build substitutions with many variables add reconciliation overhead.
5. **Deeply nested overlays**: Each layer of overlay nesting multiplies the build work.

## Summary

Measuring Kustomization reconciliation time helps you identify the slowest parts of your GitOps pipeline. Use Prometheus metrics for aggregate analysis, trigger individual reconciliations for specific measurements, and run local builds to isolate Kustomize build time from other reconciliation steps. Focus optimization efforts on Kustomizations with the longest reconciliation durations.
