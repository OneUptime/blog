# How to Configure HelmRelease Uninstall Action in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Helm, HelmRelease, Uninstall, Cleanup

Description: Learn how to configure the uninstall action in a Flux CD HelmRelease to control how Helm releases are removed from your cluster.

---

## Introduction

When a HelmRelease is deleted from your Git repository or cluster, Flux CD performs an uninstall action to remove the corresponding Helm release. The `spec.uninstall` field lets you control this process, including whether to keep the release history, disable hooks, wait for resource deletion, and set deletion propagation policies. Understanding these options is important for clean and predictable resource removal.

## When Uninstall Happens

Flux triggers an uninstall in two main scenarios:

1. The HelmRelease resource is deleted from the cluster
2. The upgrade remediation strategy is set to `uninstall` and all retries are exhausted

The `spec.uninstall` field controls the behavior of the `helm uninstall` operation in both cases.

## Basic Uninstall Configuration

Here is a HelmRelease with uninstall options configured.

```yaml
# helmrelease.yaml - HelmRelease with uninstall configuration
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: default
spec:
  interval: 10m
  chart:
    spec:
      chart: my-app
      version: "1.x"
      sourceRef:
        kind: HelmRepository
        name: my-repo
        namespace: flux-system
  # Uninstall action configuration
  uninstall:
    # Keep the Helm release history after uninstall
    keepHistory: false
    # Disable Helm hooks during uninstall
    disableHooks: false
    # Wait for all resources to be deleted
    disableWait: false
    # Timeout for the uninstall operation (uses spec.timeout if not set)
    timeout: 5m
  values:
    replicaCount: 2
```

## Uninstall Options Explained

### keepHistory

By default, `helm uninstall` removes the release history from the cluster. Setting `keepHistory: true` retains the history, which allows you to see previous revisions even after uninstall.

```yaml
spec:
  uninstall:
    # Retain release history after uninstall (equivalent to helm uninstall --keep-history)
    keepHistory: true
```

This is useful for auditing purposes. After uninstalling with `keepHistory: true`, you can still see the release history.

```bash
# View history of an uninstalled release (only works with keepHistory: true)
helm history my-app -n default
```

### disableHooks

When set to `true`, Helm pre-delete and post-delete hooks are skipped during uninstall.

```yaml
spec:
  uninstall:
    # Skip all Helm hooks during uninstall
    disableHooks: true
```

This is useful when uninstall hooks are failing or causing delays. For example, a pre-delete hook that tries to perform a database backup might fail if the database is already down.

### disableWait

When set to `true`, Helm does not wait for resources to be fully deleted before considering the uninstall complete.

```yaml
spec:
  uninstall:
    # Do not wait for all resources to be deleted
    disableWait: true
```

This speeds up the uninstall process but means resources may still be terminating after Helm reports success.

### deletionPropagation

Controls the Kubernetes deletion propagation policy for resources removed during uninstall.

```yaml
spec:
  uninstall:
    # Deletion propagation: background, foreground, or orphan
    deletionPropagation: background
```

| Policy | Behavior |
|---|---|
| `background` | Delete owner resources immediately; dependents are deleted by the garbage collector (default) |
| `foreground` | Dependents are deleted before the owner resource |
| `orphan` | Dependents are not deleted; they become orphaned |

### timeout

Sets the timeout for the uninstall operation. If not specified, it falls back to `spec.timeout`.

```yaml
spec:
  uninstall:
    # Maximum time for the uninstall operation
    timeout: 10m
```

## Uninstall as Upgrade Remediation

You can configure Flux to uninstall a release instead of rolling back when upgrades fail.

```yaml
# HelmRelease that uninstalls on failed upgrade
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: default
spec:
  interval: 10m
  chart:
    spec:
      chart: my-app
      version: "1.x"
      sourceRef:
        kind: HelmRepository
        name: my-repo
        namespace: flux-system
  upgrade:
    remediation:
      retries: 3
      # Uninstall instead of rollback when retries are exhausted
      strategy: uninstall
  uninstall:
    keepHistory: false
    disableHooks: false
    timeout: 5m
```

After uninstall, Flux will attempt a fresh install on the next reconciliation cycle.

## Production Uninstall Configuration

For production workloads, a safe uninstall configuration looks like this.

```yaml
# helmrelease-prod.yaml - Production uninstall configuration
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: production
spec:
  interval: 10m
  timeout: 10m
  chart:
    spec:
      chart: my-app
      version: "2.x"
      sourceRef:
        kind: HelmRepository
        name: my-repo
        namespace: flux-system
  install:
    remediation:
      retries: 3
  upgrade:
    remediation:
      retries: 5
      strategy: rollback
  uninstall:
    # Keep history for auditing
    keepHistory: true
    # Run hooks for clean shutdown
    disableHooks: false
    # Wait for resources to fully terminate
    disableWait: false
    # Use foreground deletion for ordered cleanup
    deletionPropagation: foreground
    # Allow enough time for graceful termination
    timeout: 10m
  values:
    replicaCount: 3
```

## Deleting a HelmRelease

When you delete a HelmRelease from Git, Flux uninstalls the Helm release using the `spec.uninstall` settings.

```bash
# Delete a HelmRelease (triggers uninstall)
kubectl delete helmrelease my-app -n default

# Or remove it from Git and let Flux handle the deletion
git rm helmrelease.yaml
git commit -m "Remove my-app HelmRelease"
git push
```

## Verifying Uninstall

After deletion, verify that resources have been cleaned up.

```bash
# Check that the HelmRelease is gone
flux get helmreleases -n default

# Check that the Helm release is removed
helm list -n default

# Verify pods are terminated
kubectl get pods -n default -l app.kubernetes.io/name=my-app

# If keepHistory was true, check release history
helm history my-app -n default
```

## Preventing Accidental Uninstalls

To prevent accidental deletion of a HelmRelease, you can suspend it first or use Kubernetes finalizers and RBAC policies.

```bash
# Suspend the HelmRelease to prevent reconciliation-triggered changes
flux suspend helmrelease my-app -n default
```

## Summary

The `spec.uninstall` field in Flux CD gives you precise control over how Helm releases are removed from your cluster. Use `keepHistory` for audit trails, `deletionPropagation` for ordered cleanup, and appropriate timeouts for graceful termination. Whether uninstall is triggered by HelmRelease deletion or as a remediation strategy for failed upgrades, these settings ensure clean and predictable resource removal.
