# How to Handle HelmRelease Stuck in Another Operation in Progress Error in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, HelmRelease, Kubernetes, GitOps, Helm, Troubleshooting, Error

Description: Learn how to diagnose and resolve the common HelmRelease error where Helm reports another operation is already in progress.

---

## Introduction

One of the most frustrating errors you can encounter when managing Helm releases through Flux CD is the "another operation (install/upgrade/rollback) is in progress" error. This error occurs when Helm detects that a previous operation did not complete cleanly, leaving a lock on the release that prevents any new operations from proceeding.

This situation typically arises when a Helm operation was interrupted, perhaps due to a controller restart, a node failure, or a timeout. The Helm release gets stuck in a pending state, and Flux cannot install, upgrade, or roll back the release until the lock is cleared.

This guide explains why this error happens, how to diagnose it, and the steps to resolve it safely in a Flux-managed environment.

## Prerequisites

To follow this guide, you need:

- A Kubernetes cluster running Flux CD
- kubectl access with permissions to manage secrets and HelmReleases
- The Helm CLI installed locally (for manual inspection)
- Basic understanding of Helm release storage (secrets-based)

## Understanding the Root Cause

Helm stores release information as Kubernetes secrets in the release namespace. Each release has a series of versioned secrets, and the latest one contains the release status. When Helm begins an operation like install or upgrade, it sets the release status to a pending state such as `pending-install`, `pending-upgrade`, or `pending-rollback`.

If the operation completes successfully, the status changes to `deployed`. If it fails, the status changes to `failed`. But if the operation is interrupted before it can update the status, the release remains stuck in its pending state. Any subsequent operation sees this pending status and refuses to proceed, producing the "another operation is in progress" error.

## Diagnosing the Problem

First, check the HelmRelease status in Flux:

```bash
kubectl get helmrelease my-app -n production
```

You will likely see the release stuck with a `False` ready condition. To get more detail:

```bash
kubectl describe helmrelease my-app -n production
```

Look for the error message in the conditions or events. It will contain text like "another operation (install/upgrade/rollback) is in progress."

Next, inspect the Helm release secrets directly to see the stuck state:

```bash
kubectl get secrets -n production -l owner=helm,name=my-app --sort-by=.metadata.creationTimestamp
```

The latest secret will show the pending status. You can decode it to confirm:

```bash
kubectl get secret sh.helm.release.v1.my-app.v5 -n production -o jsonpath='{.data.release}' | base64 -d | base64 -d | gzip -d | jq '.info.status'
```

## Resolution Method 1: Force Upgrade with Flux Annotation

The simplest approach is to force Flux to retry the operation. You can do this by annotating the HelmRelease:

```bash
kubectl annotate helmrelease my-app -n production reconcile.fluxcd.io/requestAt="$(date +%s)" --overwrite
```

However, this alone may not work if the release is stuck in a pending state. In that case, you need to clear the stuck release first.

## Resolution Method 2: Manually Patch the Release Secret

You can fix the stuck release by patching the latest Helm secret to change its status from pending to failed, which allows Helm to proceed with a new operation:

```bash
# List all release secrets
kubectl get secrets -n production -l owner=helm,name=my-app

# Delete the stuck pending release secret
kubectl delete secret sh.helm.release.v1.my-app.v5 -n production
```

After removing the problematic secret, trigger a reconciliation:

```bash
kubectl annotate helmrelease my-app -n production reconcile.fluxcd.io/requestAt="$(date +%s)" --overwrite
```

## Resolution Method 3: Suspend and Resume the HelmRelease

A cleaner approach is to suspend the HelmRelease, fix the issue, and resume:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: production
spec:
  suspend: true
  interval: 5m
  chart:
    spec:
      chart: my-app
      version: "2.0.0"
      sourceRef:
        kind: HelmRepository
        name: my-repo
        namespace: flux-system
```

Or use the Flux CLI:

```bash
flux suspend helmrelease my-app -n production
```

Then clean up the stuck secret and resume:

```bash
kubectl delete secret sh.helm.release.v1.my-app.v5 -n production
flux resume helmrelease my-app -n production
```

## Preventing Future Occurrences

To minimize the chance of this error recurring, configure appropriate timeouts and remediation in your HelmRelease:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: production
spec:
  interval: 5m
  timeout: 10m
  chart:
    spec:
      chart: my-app
      version: "2.0.0"
      sourceRef:
        kind: HelmRepository
        name: my-repo
        namespace: flux-system
  install:
    remediation:
      retries: 3
  upgrade:
    cleanupOnFail: true
    remediation:
      retries: 3
      strategy: rollback
      remediateLastFailure: true
```

Setting an appropriate `timeout` ensures that long-running operations are terminated cleanly rather than hanging indefinitely. The `cleanupOnFail` option helps prevent resource leaks from failed operations.

## Conclusion

The "another operation is in progress" error is a common issue in Helm-managed deployments that occurs when an operation is interrupted mid-flight. In a Flux environment, the resolution involves identifying and removing the stuck release secret, then triggering a fresh reconciliation. By configuring proper timeouts and remediation strategies in your HelmRelease manifests, you can reduce the likelihood of encountering this error and ensure that your cluster recovers automatically from most failure scenarios.
