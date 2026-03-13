# How to Diagnose Source Controller Memory Leaks in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Troubleshooting, Source Controller, Memory Leak, Performance, Monitoring

Description: Learn how to identify, diagnose, and fix memory leaks in the Flux Source Controller using Prometheus metrics, profiling tools, and configuration adjustments.

---

Memory leaks in the Source Controller manifest as a gradual increase in memory consumption over time, eventually leading to OOMKilled pod restarts. Unlike sudden crashes, memory leaks are harder to diagnose because the controller appears to function normally until it reaches its memory limit. This guide explains how to identify, diagnose, and resolve Source Controller memory leaks in Flux.

## Prerequisites

Before you begin, ensure you have the following:

- A Kubernetes cluster with Flux installed
- kubectl configured to access your cluster
- Prometheus or another metrics collection system (recommended)
- Permissions to view pods, logs, and metrics in the flux-system namespace

## Step 1: Confirm a Memory Leak Exists

First, distinguish between a memory leak and simply insufficient memory allocation. A memory leak shows a steadily increasing memory footprint over time, while an undersized allocation shows consistent OOMKilled events at roughly the same memory threshold.

Check the restart history:

```bash
kubectl get pod -n flux-system -l app=source-controller -o jsonpath='{.items[0].status.containerStatuses[0].restartCount}'
```

Monitor memory usage over time:

```bash
kubectl top pod -n flux-system -l app=source-controller
```

Run this command repeatedly over several hours to observe the trend. If memory consistently grows without plateauing, you likely have a memory leak.

## Step 2: Analyze Prometheus Metrics

The Source Controller exposes Prometheus metrics at `/metrics`. Query for memory usage patterns:

```promql
container_memory_working_set_bytes{namespace="flux-system", container="manager", pod=~"source-controller.*"}
```

To see the rate of memory growth:

```promql
rate(container_memory_working_set_bytes{namespace="flux-system", container="manager", pod=~"source-controller.*"}[1h])
```

A positive rate that does not decrease indicates a memory leak. Set up an alert for this:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: flux-memory-leak-alert
  namespace: flux-system
spec:
  groups:
  - name: flux.memory
    rules:
    - alert: SourceControllerMemoryLeak
      expr: |
        predict_linear(container_memory_working_set_bytes{namespace="flux-system", container="manager", pod=~"source-controller.*"}[6h], 3600 * 24) > 1.5 * kube_pod_container_resource_limits{namespace="flux-system", container="manager", pod=~"source-controller.*", resource="memory"}
      for: 30m
      labels:
        severity: warning
      annotations:
        summary: "Source Controller memory leak detected"
        description: "Source Controller memory is projected to exceed limits within 24 hours."
```

## Step 3: Identify the Leak Source

### Large Git Repositories

The Source Controller clones Git repositories into memory. Large repositories or repositories with extensive history can cause memory to grow:

```bash
kubectl logs -n flux-system deploy/source-controller | grep -i "git\|clone\|fetch" | tail -20
```

Check the sizes of your GitRepository sources:

```bash
flux get sources git --all-namespaces
```

### Artifact Caching

The Source Controller caches fetched artifacts. If the cache is not properly bounded, it can grow without limit:

```bash
kubectl exec -n flux-system deploy/source-controller -- du -sh /data
```

### Frequent Reconciliation

Sources configured with very short intervals cause frequent fetches and increase memory churn:

```bash
kubectl get gitrepositories --all-namespaces -o jsonpath='{range .items[*]}{.metadata.namespace}{"\t"}{.metadata.name}{"\t"}{.spec.interval}{"\n"}{end}'
```

Look for intervals shorter than 1 minute, which are almost never necessary.

### Helm Repository Index Files

Large Helm repository index files can consume significant memory. Repositories like Bitnami have very large index files:

```bash
kubectl get helmrepositories --all-namespaces -o jsonpath='{range .items[*]}{.metadata.namespace}{"\t"}{.metadata.name}{"\t"}{.spec.url}{"\n"}{end}'
```

Consider using OCI-based Helm repositories which do not require downloading large index files:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: my-charts
  namespace: flux-system
spec:
  type: oci
  url: oci://registry.example.com/charts
  interval: 10m
```

## Step 4: Enable Go Runtime Profiling

For advanced diagnosis, you can enable pprof profiling on the Source Controller to get detailed memory allocation data:

```bash
kubectl port-forward -n flux-system deploy/source-controller 8080:8080
```

In another terminal, capture a heap profile:

```bash
curl -s http://localhost:8080/debug/pprof/heap > heap.prof
go tool pprof heap.prof
```

Inside the pprof shell, use `top` to see the largest memory allocators:

```text
(pprof) top 10
```

Use `web` to generate a visual graph of allocations if you have graphviz installed.

## Step 5: Apply Fixes

### Increase Memory Limits Temporarily

While investigating, increase the memory limit to prevent crashes:

```bash
kubectl patch deployment source-controller -n flux-system --type='json' -p='[{"op": "replace", "path": "/spec/template/spec/containers/0/resources/limits/memory", "value": "2Gi"}]'
```

### Reduce Source Count and Frequency

Consolidate sources where possible and increase intervals:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-repo
  namespace: flux-system
spec:
  interval: 5m
  url: https://github.com/myorg/myrepo
  ref:
    branch: main
  ignore: |
    # Exclude files not needed for deployment
    /docs/
    /tests/
    /*.md
```

### Switch to OCI for Helm Repositories

Replace traditional Helm repositories with OCI-based ones to eliminate large index file downloads:

```bash
flux create source helm my-charts \
  --url=oci://registry.example.com/charts \
  --interval=10m
```

### Update Flux

Memory leaks are often fixed in newer versions of Flux. Check your current version and update if a newer version is available:

```bash
flux version
flux check --pre
```

## Step 6: Monitor After Fixes

After applying fixes, monitor memory usage to confirm the leak is resolved:

```bash
watch -n 30 kubectl top pod -n flux-system -l app=source-controller
```

Check that the restart count stabilizes:

```bash
kubectl get pod -n flux-system -l app=source-controller -o jsonpath='{.items[0].status.containerStatuses[0].restartCount}'
```

## Prevention Tips

- Set up Prometheus alerts for memory growth trends in Flux controllers
- Use OCI-based Helm repositories instead of traditional index-based ones
- Set reasonable reconciliation intervals (5m or longer for most sources)
- Use the `ignore` field in GitRepository to exclude unnecessary files
- Keep Flux updated to benefit from memory leak fixes in newer versions
- Periodically review and clean up unused Source resources
- Monitor the `/metrics` endpoint for Go runtime memory statistics

## Summary

Source Controller memory leaks are typically caused by large Git repositories, unbounded artifact caching, oversized Helm repository index files, or bugs in specific Flux versions. Diagnosing leaks requires monitoring memory trends over time using metrics and profiling tools. Reducing source counts, increasing intervals, switching to OCI Helm repositories, and keeping Flux updated are the most effective remediation strategies.
