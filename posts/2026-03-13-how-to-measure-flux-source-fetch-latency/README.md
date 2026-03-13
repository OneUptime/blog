# How to Measure Flux Source Fetch Latency

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Performance, Benchmarking, Source Controller, Latency

Description: Learn how to measure and analyze the time it takes for the Flux source-controller to fetch artifacts from Git repositories, Helm repositories, and OCI registries.

---

## Why Source Fetch Latency Matters

The source-controller is the first step in the Flux reconciliation pipeline. Every Kustomization or HelmRelease depends on an artifact produced by the source-controller. If source fetching is slow, the entire delivery pipeline is delayed regardless of how fast the downstream controllers are.

## Key Metrics for Source Fetch Latency

The source-controller exposes several Prometheus metrics that help you understand fetch performance.

### Reconciliation Duration by Kind

```promql
gotk_reconcile_duration_seconds_bucket{kind="GitRepository"}
gotk_reconcile_duration_seconds_bucket{kind="HelmRepository"}
gotk_reconcile_duration_seconds_bucket{kind="HelmChart"}
gotk_reconcile_duration_seconds_bucket{kind="OCIRepository"}
gotk_reconcile_duration_seconds_bucket{kind="Bucket"}
```

These histograms include the entire reconciliation cycle for each source kind, which includes fetching, checksum verification, and artifact storage.

### Artifact Update Timestamp

Each source object has a `.status.artifact.lastUpdateTime` field that records when the artifact was last updated:

```bash
kubectl get gitrepository my-repo -n flux-system \
  -o jsonpath='{.status.artifact.lastUpdateTime}'
```

## Measuring Fetch Latency with Metrics

### Average Fetch Time per Source Kind

```bash
kubectl exec -n flux-system deploy/source-controller -- \
  curl -s localhost:8080/metrics | \
  grep 'gotk_reconcile_duration_seconds_sum{kind="GitRepository"}'
```

```bash
kubectl exec -n flux-system deploy/source-controller -- \
  curl -s localhost:8080/metrics | \
  grep 'gotk_reconcile_duration_seconds_count{kind="GitRepository"}'
```

Divide sum by count to get the average duration.

### Using PromQL for Historical Analysis

If you have Prometheus running in your cluster, use these queries:

```promql
# Average Git fetch latency over 15 minutes
rate(gotk_reconcile_duration_seconds_sum{kind="GitRepository"}[15m])
/
rate(gotk_reconcile_duration_seconds_count{kind="GitRepository"}[15m])
```

```promql
# P95 Helm repository fetch latency
histogram_quantile(0.95,
  rate(gotk_reconcile_duration_seconds_bucket{kind="HelmRepository"}[15m])
)
```

## Measuring Individual Source Fetch Time

### Trigger and Time a Specific Source

```bash
# Record the start time
START=$(date +%s)

# Trigger reconciliation
kubectl annotate gitrepository my-repo -n flux-system \
  reconcile.fluxcd.io/requestedAt="$(date +%s)" --overwrite

# Wait for the reconciliation to complete
kubectl wait gitrepository my-repo -n flux-system \
  --for=condition=Ready --timeout=120s

# Calculate duration
END=$(date +%s)
echo "Fetch completed in $((END - START)) seconds"
```

### Check Source Status Details

```bash
kubectl get gitrepository my-repo -n flux-system -o yaml | \
  grep -A 5 'status:'
```

Look at the `lastHandledReconcileAt` and `artifact.lastUpdateTime` fields to understand timing.

## Identifying Slow Sources

List all sources with their last reconciliation duration using the Flux CLI:

```bash
flux get sources git --all-namespaces
flux get sources helm --all-namespaces
flux get sources chart --all-namespaces
flux get sources oci --all-namespaces
```

Sources that are not Ready or that show old timestamps may be experiencing fetch issues.

## Common Causes of High Source Fetch Latency

1. **Large Git repositories**: Cloning a repository with extensive history takes time. Consider using shallow clones or sparse checkout.
2. **Large Helm repository indexes**: HTTP-based Helm repositories with many charts have large index files. Enable caching or switch to OCI.
3. **Network latency**: Sources hosted in different regions or behind slow connections add latency.
4. **Authentication overhead**: OAuth token refresh or SSH key negotiation can add delay.
5. **Rate limiting**: Container registries and Git hosting services may throttle requests.

## Building a Latency Dashboard

Create a Grafana dashboard with panels for:

- Average fetch latency by source kind (line chart)
- P99 fetch latency by source kind (line chart)
- Fetch error rate (counter)
- Number of sources by kind (stat)
- Longest individual fetch time (table)

## Summary

Measuring source fetch latency gives you visibility into the first and often slowest stage of the Flux pipeline. Use the built-in Prometheus metrics to establish baselines, identify slow sources, and track the impact of optimizations like caching, shallow clones, and concurrency tuning.
