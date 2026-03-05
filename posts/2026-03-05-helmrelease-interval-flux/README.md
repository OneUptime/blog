# How to Configure HelmRelease Interval in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Helm, HelmRelease, Interval, Reconciliation

Description: Learn how to configure the reconciliation interval in a Flux CD HelmRelease to control how frequently Flux checks and reconciles your Helm releases.

---

## Introduction

The `spec.interval` field in a Flux CD HelmRelease defines how often Flux checks whether the desired state in Git matches the actual state in the cluster. This reconciliation loop is fundamental to how Flux maintains drift detection and correction. Choosing the right interval balances responsiveness against cluster resource usage.

## The spec.interval Field

The `spec.interval` field tells the Flux helm-controller how frequently to reconcile the HelmRelease. During each reconciliation, Flux compares the desired state (from the HelmRelease spec and referenced chart source) with the current state and performs any necessary install, upgrade, or rollback.

```yaml
# helmrelease.yaml - HelmRelease with reconciliation interval
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: default
spec:
  # Reconcile every 10 minutes
  interval: 10m
  chart:
    spec:
      chart: my-app
      version: "1.x"
      sourceRef:
        kind: HelmRepository
        name: my-repo
        namespace: flux-system
  values:
    replicaCount: 2
```

The `interval` field accepts Go duration strings such as `30s`, `5m`, `1h`, or `24h`.

## What Happens During Reconciliation

Each reconciliation cycle involves the following steps:

1. Flux checks if the chart source (HelmRepository, GitRepository, or Bucket) has a new artifact
2. Flux compares the desired HelmRelease spec (chart version, values) against the current Helm release state
3. If differences are detected, Flux performs an upgrade (or install if the release does not exist)
4. If drift detection is enabled, Flux checks whether cluster resources match the last applied state
5. Flux updates the HelmRelease status conditions

## Choosing the Right Interval

### Short Intervals (1m - 5m)

Short intervals provide fast convergence but increase API server load.

```yaml
spec:
  # Fast reconciliation for critical services
  interval: 1m
```

Use short intervals for:
- Development and staging environments where rapid iteration matters
- Critical infrastructure components that must converge quickly
- Applications where drift detection and correction must happen fast

### Medium Intervals (5m - 15m)

Medium intervals balance responsiveness with resource efficiency.

```yaml
spec:
  # Standard reconciliation for production workloads
  interval: 10m
```

This is appropriate for most production workloads where changes are deployed through Git and do not require sub-minute convergence.

### Long Intervals (15m - 1h)

Long intervals minimize overhead for stable, infrequently changing releases.

```yaml
spec:
  # Infrequent reconciliation for stable infrastructure
  interval: 1h
```

Use long intervals for:
- Stable infrastructure components that rarely change (CNI plugins, storage drivers)
- Large clusters with many HelmReleases where you need to reduce API server load
- Releases where manual intervention is preferred over automatic reconciliation

## Chart Interval vs HelmRelease Interval

The `spec.chart.spec.interval` controls how often Flux checks the chart source for new versions, which is independent of the HelmRelease reconciliation interval.

```yaml
# helmrelease.yaml - Separate chart and release intervals
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: default
spec:
  # How often to reconcile the Helm release
  interval: 10m
  chart:
    spec:
      chart: my-app
      version: "1.x"
      sourceRef:
        kind: HelmRepository
        name: my-repo
        namespace: flux-system
      # How often to check for new chart versions
      interval: 30m
  values:
    replicaCount: 2
```

In this example, Flux checks for new chart versions every 30 minutes, but reconciles the release against its desired state every 10 minutes.

## Forcing Immediate Reconciliation

You do not need to wait for the interval to expire. Force an immediate reconciliation using the Flux CLI.

```bash
# Trigger immediate reconciliation
flux reconcile helmrelease my-app -n default

# Reconcile with the source (also refreshes chart)
flux reconcile helmrelease my-app -n default --with-source
```

## Interval and Resource Consumption

Each reconciliation consumes CPU and memory in the helm-controller and generates API server requests. In clusters with hundreds of HelmReleases, interval choices matter.

```yaml
# helmrelease-infra.yaml - Infrastructure component with long interval
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: coredns-custom
  namespace: kube-system
spec:
  interval: 30m
  chart:
    spec:
      chart: coredns
      version: "1.x"
      sourceRef:
        kind: HelmRepository
        name: coredns
        namespace: flux-system
      interval: 1h
  values: {}
---
# helmrelease-app.yaml - Application with shorter interval
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: web-frontend
  namespace: apps
spec:
  interval: 5m
  chart:
    spec:
      chart: web-frontend
      version: "2.x"
      sourceRef:
        kind: HelmRepository
        name: internal
        namespace: flux-system
      interval: 5m
  values:
    replicaCount: 3
```

## Monitoring Reconciliation

Track reconciliation timing and detect if intervals are too aggressive.

```bash
# Check last reconciliation time and status
flux get helmreleases -A

# View detailed status with last applied revision
kubectl get helmrelease -A -o custom-columns=\
NAME:.metadata.name,\
NAMESPACE:.metadata.namespace,\
READY:.status.conditions[0].status,\
LAST:.status.lastAttemptedRevision,\
AGE:.metadata.creationTimestamp

# Check helm-controller resource usage
kubectl top pod -n flux-system -l app=helm-controller
```

## Suspended HelmReleases

Suspending a HelmRelease stops all reconciliation regardless of the interval.

```bash
# Suspend reconciliation
flux suspend helmrelease my-app -n default

# Resume reconciliation
flux resume helmrelease my-app -n default
```

```yaml
# Or declaratively in the spec
spec:
  interval: 10m
  suspend: true
```

## Summary

The `spec.interval` field in a Flux CD HelmRelease controls how frequently Flux reconciles the Helm release against its desired state. Use shorter intervals (1m-5m) for applications that need rapid convergence, medium intervals (5m-15m) for standard production workloads, and longer intervals (15m-1h) for stable infrastructure components. The interval works alongside `spec.chart.spec.interval` for chart source checks, and you can always force immediate reconciliation with `flux reconcile`. Balancing interval length against cluster size and API server load is key to efficient GitOps operations.
