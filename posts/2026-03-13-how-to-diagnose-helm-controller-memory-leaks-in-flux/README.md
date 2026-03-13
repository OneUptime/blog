# How to Diagnose Helm Controller Memory Leaks in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Troubleshooting, Helm Controller, Memory Leaks, Helm, Performance, Monitoring

Description: Learn how to identify, diagnose, and fix memory leaks in the Flux Helm Controller caused by release history accumulation, large chart rendering, and reconciliation loops.

---

Memory leaks in the Helm Controller appear as gradually increasing memory consumption that eventually triggers OOMKilled restarts. The Helm Controller is particularly susceptible to memory growth because it renders Helm templates, manages release history stored as Kubernetes secrets, and handles multiple concurrent reconciliations. This guide explains how to diagnose and resolve Helm Controller memory leaks.

## Prerequisites

Before you begin, ensure you have the following:

- A Kubernetes cluster with Flux installed
- kubectl configured to access your cluster
- Prometheus or another metrics collection system (recommended)
- Permissions to view pods, logs, secrets, and metrics in the flux-system namespace

## Step 1: Confirm Memory Leak Behavior

Distinguish between a memory leak (gradual growth) and insufficient allocation (immediate OOMKill). Monitor memory over time:

```bash
kubectl top pod -n flux-system -l app=helm-controller
```

Run this command at regular intervals. Record the values to see if memory increases steadily without being reclaimed.

Check how frequently the pod restarts:

```bash
kubectl get pod -n flux-system -l app=helm-controller -o jsonpath='{.items[0].status.containerStatuses[0].restartCount}'
```

If restarts happen at increasing intervals (e.g., every 2 hours, then every 4 hours as limits are raised), this strongly suggests a memory leak.

## Step 2: Monitor with Prometheus

Query memory usage over time:

```
container_memory_working_set_bytes{namespace="flux-system", container="manager", pod=~"helm-controller.*"}
```

Calculate the rate of memory growth:

```
deriv(container_memory_working_set_bytes{namespace="flux-system", container="manager", pod=~"helm-controller.*"}[2h])
```

A consistently positive derivative confirms a memory leak.

## Step 3: Identify Leak Causes

### Accumulated Helm Release Secrets

The Helm Controller reads release history from Kubernetes secrets. Each Helm release revision creates a new secret. If `maxHistory` is not set, secrets accumulate indefinitely:

```bash
kubectl get secrets --all-namespaces -l owner=helm --no-headers | wc -l
```

Check secrets per release:

```bash
kubectl get secrets --all-namespaces -l owner=helm -o jsonpath='{range .items[*]}{.metadata.namespace}{"\t"}{.metadata.name}{"\n"}{end}' | sort | head -50
```

If you see many revisions for a single release (e.g., v1 through v50), the controller is loading all of them into memory during reconciliation. Set `maxHistory` on your HelmReleases:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
spec:
  maxHistory: 5
  # ... rest of spec
```

Clean up excess historical secrets:

```bash
# List all revision secrets for a specific release
kubectl get secrets -n <namespace> -l name=<release-name>,owner=helm --sort-by=.metadata.creationTimestamp

# Delete old revisions, keeping only the latest few
kubectl delete secret -n <namespace> sh.helm.release.v1.<release-name>.v1
kubectl delete secret -n <namespace> sh.helm.release.v1.<release-name>.v2
```

### Large Chart Values in Memory

Charts with very large values files or deeply nested structures consume memory during template rendering. Check which HelmReleases have large inline values:

```bash
kubectl get helmreleases --all-namespaces -o json | jq '[.items[] | {name: .metadata.name, namespace: .metadata.namespace, valuesSize: (.spec.values | tostring | length)}] | sort_by(.valuesSize) | reverse | .[:10]'
```

Move large values to ConfigMaps to reduce the memory footprint during reconciliation:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
spec:
  valuesFrom:
    - kind: ConfigMap
      name: my-app-values
      valuesKey: values.yaml
```

### Reconciliation Loops

A HelmRelease that continuously drifts and re-reconciles can leak memory if each reconciliation cycle does not fully clean up:

```bash
kubectl logs -n flux-system deploy/helm-controller | grep -c "Reconciliation finished"
```

Check for HelmReleases stuck in a loop:

```bash
flux get helmreleases --all-namespaces | grep -i "false\|failed"
```

### Failed Upgrades Not Being Cleaned Up

Failed Helm upgrade attempts can leave resources in memory. Check for remediation settings:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
spec:
  upgrade:
    remediation:
      retries: 3
      remediateLastFailure: true
  rollback:
    cleanupOnFail: true
```

## Step 4: Profile Memory Usage

For deep investigation, use Go pprof:

```bash
kubectl port-forward -n flux-system deploy/helm-controller 8080:8080
```

Capture a heap profile:

```bash
curl -s http://localhost:8080/debug/pprof/heap > helm-heap.prof
go tool pprof helm-heap.prof
```

In pprof, use `top` to find the largest allocators and `list <function>` to see the specific code paths.

## Step 5: Apply Fixes

### Set maxHistory on All HelmReleases

```bash
# Check which HelmReleases lack maxHistory
kubectl get helmreleases --all-namespaces -o jsonpath='{range .items[*]}{.metadata.namespace}{"\t"}{.metadata.name}{"\t"}{.spec.maxHistory}{"\n"}{end}'
```

### Reduce Concurrency

Lower the number of concurrent reconciliations:

```bash
kubectl patch deployment helm-controller -n flux-system --type='json' -p='[{"op": "add", "path": "/spec/template/spec/containers/0/args/-", "value": "--concurrent=3"}]'
```

### Increase Memory Limits

As a temporary measure while fixing root causes:

```bash
kubectl patch deployment helm-controller -n flux-system --type='json' -p='[{"op": "replace", "path": "/spec/template/spec/containers/0/resources/limits/memory", "value": "2Gi"}]'
```

### Update Flux

Check for and apply updates that may contain memory leak fixes:

```bash
flux version
flux check --pre
```

## Step 6: Verify the Fix

After applying changes, monitor the controller for at least 24 hours:

```bash
watch -n 60 kubectl top pod -n flux-system -l app=helm-controller
```

Confirm restarts have stopped:

```bash
kubectl get pod -n flux-system -l app=helm-controller -w
```

## Prevention Tips

- Always set `maxHistory` on HelmRelease resources (3-5 is a good default)
- Periodically audit and clean up accumulated Helm release secrets
- Use `valuesFrom` with ConfigMaps instead of large inline values
- Configure proper remediation strategies for failed upgrades
- Set up Prometheus alerts for memory growth trends
- Keep Flux updated to benefit from memory leak fixes
- Monitor the number of HelmRelease resources and their reconciliation frequency

## Summary

Helm Controller memory leaks are most commonly caused by accumulated release history secrets, large chart values loaded into memory, reconciliation loops, and failed upgrade artifacts not being cleaned up. Setting `maxHistory` on all HelmReleases, cleaning up stale secrets, moving large values to ConfigMaps, and keeping Flux updated are the most effective remediation and prevention strategies.
