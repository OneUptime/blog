# How to Fix Flux Reconciliation Stuck at Progressing Forever

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Troubleshooting, Reconciliation, Kustomization, HelmRelease

Description: Learn how to diagnose and fix Flux reconciliation that remains stuck in a Progressing state indefinitely, including common root causes and step-by-step solutions.

---

One of the most frustrating issues Flux operators encounter is a Kustomization or HelmRelease that gets stuck in a `Progressing` state and never transitions to `Ready`. The resource appears to be working, but it never completes. In this post, we will walk through how to diagnose the root cause and get reconciliation moving again.

## Symptoms

You run `flux get kustomizations` or `flux get helmreleases` and see output like this:

```bash
flux get kustomizations
```

```
NAME        REVISION    SUSPENDED   READY   MESSAGE
my-app                  False       Unknown Reconciliation in progress
```

The `READY` column stays at `Unknown` and the `MESSAGE` stays at `Reconciliation in progress` for an extended period, well beyond your configured interval and timeout.

## Diagnostic Commands

Start by gathering detailed information about the stuck resource.

### Check the Kustomization or HelmRelease status

```bash
kubectl describe kustomization my-app -n flux-system
```

Look at the `Status.Conditions` section for clues. Pay attention to the `lastTransitionTime` to see how long it has been stuck.

### Check the Flux controller logs

```bash
kubectl logs -n flux-system deployment/kustomize-controller --since=30m | grep my-app
```

For HelmReleases:

```bash
kubectl logs -n flux-system deployment/helm-controller --since=30m | grep my-app
```

### Check for pending resources in the cluster

```bash
kubectl get pods --all-namespaces --field-selector=status.phase!=Running,status.phase!=Succeeded
```

### Check for stuck finalizers

```bash
kubectl get kustomization my-app -n flux-system -o jsonpath='{.metadata.finalizers}'
```

## Common Root Causes

### 1. Health checks timing out

Flux waits for all deployed resources to become healthy. If a Deployment, StatefulSet, or other resource never reaches a healthy state, the Kustomization stays in `Progressing`.

```bash
kubectl get pods -n my-app-namespace
kubectl describe pod <problematic-pod> -n my-app-namespace
```

### 2. Large manifests exceeding the timeout

If your Kustomization deploys many resources and the default timeout is too short, reconciliation may never complete in time.

### 3. Webhook or admission controller blocking

A validating or mutating webhook may be hanging on requests, causing apply operations to stall.

```bash
kubectl get validatingwebhookconfigurations
kubectl get mutatingwebhookconfigurations
```

### 4. Resource dependency waiting on external conditions

Some resources like CertificateRequests or ExternalSecrets depend on external services. If those services are down, the health check never passes.

## Step-by-Step Fixes

### Fix 1: Increase the timeout

If your deployment genuinely needs more time, increase the timeout on the Kustomization:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  timeout: 10m
  interval: 5m
  # ... rest of spec
```

### Fix 2: Disable health checks temporarily

To unblock reconciliation and investigate separately, disable health checks:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  wait: false
  healthChecks: []
  # ... rest of spec
```

### Fix 3: Force reconciliation

Trigger a manual reconciliation to reset the state:

```bash
flux reconcile kustomization my-app --with-source
```

### Fix 4: Fix the unhealthy downstream resource

Identify which resource is not becoming healthy and fix it directly:

```bash
kubectl get events -n my-app-namespace --sort-by=.lastTimestamp
```

Common issues include image pull errors, resource quota limits, missing ConfigMaps or Secrets, and node scheduling failures.

### Fix 5: Suspend and resume

If reconciliation is completely stuck, suspend and resume the resource:

```bash
flux suspend kustomization my-app
flux resume kustomization my-app
```

## Prevention Strategies

1. **Set appropriate timeouts** based on the complexity of your deployment. A Kustomization with 50 resources needs more time than one with 5.
2. **Use targeted health checks** instead of waiting for all resources. Specify only the critical resources you need to verify.
3. **Monitor reconciliation duration** with Prometheus metrics. Alert when reconciliation takes longer than expected.
4. **Test manifests in staging** before promoting to production to catch health check issues early.

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  timeout: 10m
  interval: 5m
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: my-app
      namespace: my-app-namespace
```

By narrowing your health checks and setting realistic timeouts, you can avoid the indefinite `Progressing` state and keep your GitOps pipeline flowing smoothly.
