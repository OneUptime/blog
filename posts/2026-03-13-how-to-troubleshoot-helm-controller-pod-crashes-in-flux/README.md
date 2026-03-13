# How to Troubleshoot Helm Controller Pod Crashes in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Troubleshooting, Helm Controller, Pod Crashes, CrashLoopBackOff, Helm

Description: Learn how to diagnose and fix Helm Controller pod crashes in Flux, including memory issues from large charts, failed releases, and storage backend problems.

---

The Helm Controller manages HelmRelease resources in Flux. It installs, upgrades, tests, and uninstalls Helm charts based on declarative HelmRelease definitions. When this controller crashes, Helm-based deployments cannot be reconciled. This guide covers the most common causes of Helm Controller pod crashes and how to fix them.

## Prerequisites

Before you begin, ensure you have the following:

- A Kubernetes cluster with Flux installed
- kubectl configured to access your cluster
- Permissions to view pods, logs, events, and secrets in the flux-system namespace

## Step 1: Check Pod Status

Examine the Helm Controller pod status:

```bash
kubectl get pods -n flux-system -l app=helm-controller
```

Get detailed pod information:

```bash
kubectl describe pod -n flux-system -l app=helm-controller
```

Check the restart count and termination reason to understand the crash pattern.

## Step 2: Review Logs

Retrieve logs from the previous crashed instance:

```bash
kubectl logs -n flux-system deploy/helm-controller --previous
```

Check current logs for warnings or errors:

```bash
kubectl logs -n flux-system deploy/helm-controller --tail=200
```

## Step 3: Identify Common Crash Causes

### OOMKilled from Large Helm Charts

Helm charts with many templates or large values files consume significant memory during rendering. The controller loads the entire chart and its dependencies into memory:

```bash
kubectl get pod -n flux-system -l app=helm-controller -o jsonpath='{.items[0].status.containerStatuses[0].lastState.terminated.reason}'
```

If `OOMKilled`, increase the memory limit:

```bash
kubectl patch deployment helm-controller -n flux-system --type='json' -p='[{"op": "replace", "path": "/spec/template/spec/containers/0/resources/limits/memory", "value": "2Gi"}]'
```

### Helm Storage Backend Corruption

The Helm Controller stores release metadata as Kubernetes secrets. If these secrets become corrupted or too large, the controller can crash when trying to read them:

```bash
kubectl get secrets -n <release-namespace> -l owner=helm
```

Check for unusually large secrets:

```bash
kubectl get secrets -n <release-namespace> -l owner=helm -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.metadata.annotations.meta\.helm\.sh/release-name}{"\n"}{end}'
```

If you find corrupted release secrets, you may need to remove them and let the controller reinstall the release:

```bash
kubectl delete secret -n <release-namespace> sh.helm.release.v1.<release-name>.v<revision>
```

### Too Many Release Revisions

By default, Helm keeps a history of 10 revisions. If many HelmReleases are being frequently updated, the accumulated secrets can cause memory pressure:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: default
spec:
  maxHistory: 3
  # ... rest of spec
```

### Failed Helm Tests Causing Crash Loops

If a HelmRelease has tests enabled and those tests consistently fail, the controller may enter a tight retry loop that consumes resources:

```bash
kubectl logs -n flux-system deploy/helm-controller | grep -i "test\|hook"
```

Disable tests temporarily to stabilize the controller:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
spec:
  test:
    enable: false
```

### CRD Size Limits

Helm charts that install Custom Resource Definitions with very large schemas can exceed etcd object size limits, causing the controller to crash:

```bash
kubectl logs -n flux-system deploy/helm-controller | grep -i "too large\|etcd\|request entity"
```

Consider using `crds: Skip` in the HelmRelease spec and managing CRDs separately if they are very large.

## Step 4: Check Concurrent Reconciliation

Like other Flux controllers, the Helm Controller supports concurrent reconciliation. Too many concurrent Helm operations can overwhelm the controller:

```bash
kubectl get deploy helm-controller -n flux-system -o jsonpath='{.spec.template.spec.containers[0].args}'
```

Reduce concurrency if needed:

```bash
kubectl patch deployment helm-controller -n flux-system --type='json' -p='[{"op": "add", "path": "/spec/template/spec/containers/0/args/-", "value": "--concurrent=3"}]'
```

## Step 5: Verify Helm Releases

After fixing the controller, check the status of all HelmReleases:

```bash
flux get helmreleases --all-namespaces
```

Look for releases stuck in a failed state that may need manual intervention:

```bash
flux get helmreleases --all-namespaces --status-selector ready=false
```

## Step 6: Restart and Monitor

Restart the controller:

```bash
kubectl rollout restart deployment/helm-controller -n flux-system
kubectl rollout status deployment/helm-controller -n flux-system
```

Watch the controller logs to confirm stability:

```bash
kubectl logs -n flux-system deploy/helm-controller -f
```

## Prevention Tips

- Set `maxHistory` on all HelmReleases to limit the number of stored revisions and reduce memory pressure
- Monitor Helm Controller memory usage and configure alerts for when it approaches the limit
- Break large umbrella charts into smaller, independent HelmReleases
- Use `flux check` regularly to verify controller health
- Clean up stale Helm release secrets periodically
- Consider using `valuesFrom` with ConfigMaps instead of inline values to reduce HelmRelease object size

## Summary

Helm Controller pod crashes are most often caused by memory exhaustion from large charts, corrupted release storage, excessive revision history, or high concurrency. Reviewing logs for specific error messages, managing release history limits, and properly sizing resource limits will resolve most crash scenarios. Keeping charts modular and setting appropriate history limits are the best preventive measures.
