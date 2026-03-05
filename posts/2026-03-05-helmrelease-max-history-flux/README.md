# How to Configure HelmRelease Max History in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Helm, HelmRelease, Max History, Release History

Description: Learn how to configure the maximum release history retained by Helm in a Flux CD HelmRelease to manage cluster storage and rollback capabilities.

---

## Introduction

Every time Helm installs or upgrades a release, it stores a snapshot of the release state as a Kubernetes Secret in the release namespace. Over time, these history entries accumulate and consume etcd storage. The `spec.maxHistory` field in a Flux CD HelmRelease controls how many of these revisions Helm retains, balancing rollback capability against storage consumption.

## The spec.maxHistory Field

The `spec.maxHistory` field sets the maximum number of Helm release history entries to retain. When a new revision exceeds this limit, the oldest revision is deleted.

```yaml
# helmrelease.yaml - HelmRelease with max history configured
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: default
spec:
  interval: 10m
  # Keep only the last 5 release revisions
  maxHistory: 5
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

When not specified, Flux defaults `maxHistory` to `5`. Helm itself defaults to `10` when used directly, but Flux overrides this default.

## How Release History Works

Each Helm release revision is stored as a Kubernetes Secret in the release namespace (or the storage namespace if configured). These Secrets contain the full rendered manifest, chart metadata, and values.

```bash
# List Helm release Secrets for a release
kubectl get secrets -n default -l owner=helm,name=my-app

# View the history
helm history my-app -n default
```

Example output:

```text
REVISION  STATUS      CHART         APP VERSION  DESCRIPTION
1         superseded  my-app-1.0.0  1.0.0        Install complete
2         superseded  my-app-1.1.0  1.1.0        Upgrade complete
3         superseded  my-app-1.2.0  1.2.0        Upgrade complete
4         superseded  my-app-1.3.0  1.3.0        Upgrade complete
5         deployed    my-app-1.4.0  1.4.0        Upgrade complete
```

With `maxHistory: 5`, when revision 6 is created, revision 1 is automatically deleted.

## Choosing the Right Value

### Low Values (1-3)

```yaml
spec:
  maxHistory: 2
```

Use low values for:
- Clusters with many HelmReleases where etcd storage is a concern
- Environments where rollback beyond the previous version is unnecessary
- Development clusters where history is not important

### Medium Values (5-10)

```yaml
spec:
  maxHistory: 10
```

This range works well for most production environments. It provides enough history for several rollbacks while keeping storage consumption reasonable.

### High Values (10-50)

```yaml
spec:
  maxHistory: 50
```

Use higher values when:
- Regulatory requirements mandate audit trails
- You need to rollback across many versions
- The release is small and storage is not a concern

### Setting to Zero

Setting `maxHistory` to `0` means Helm retains unlimited history. This is generally not recommended as it leads to unbounded Secret growth in etcd.

```yaml
spec:
  # Unlimited history - not recommended
  maxHistory: 0
```

## Impact on etcd Storage

Each Helm release Secret can be several kilobytes to several hundred kilobytes, depending on the chart complexity. For clusters running dozens of HelmReleases, the cumulative storage can be significant.

Consider this calculation for a cluster with 50 HelmReleases:

| maxHistory | Secrets per Release | Total Secrets | Estimated Storage |
|---|---|---|---|
| 5 | 5 | 250 | ~25 MB |
| 10 | 10 | 500 | ~50 MB |
| 50 | 50 | 2500 | ~250 MB |

## Cleaning Up Existing History

If you reduce `maxHistory` on an existing release, old revisions are not immediately deleted. They are pruned on the next upgrade. To force cleanup, you can manually delete old Secrets.

```bash
# List all release secrets sorted by revision
kubectl get secrets -n default -l owner=helm,name=my-app --sort-by=.metadata.creationTimestamp

# Trigger a reconciliation to apply the new maxHistory limit
flux reconcile helmrelease my-app -n default
```

## Production Configuration Example

```yaml
# helmrelease-prod.yaml - Production HelmRelease with history management
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: production
spec:
  interval: 10m
  maxHistory: 10
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
  values:
    replicaCount: 3
```

## Verifying History Configuration

```bash
# Check current release history count
helm history my-app -n default | wc -l

# View current HelmRelease configuration
kubectl get helmrelease my-app -n default -o jsonpath='{.spec.maxHistory}'

# Monitor Secret count for the release
kubectl get secrets -n default -l owner=helm,name=my-app --no-headers | wc -l
```

## Summary

The `spec.maxHistory` field in a Flux CD HelmRelease controls how many Helm release revisions are retained as Kubernetes Secrets. Flux defaults this to `5` when not specified. Set it higher (10-50) if you need extended rollback capability or audit history, and lower (1-3) if etcd storage is a concern. Monitoring the number of release Secrets and choosing appropriate history limits prevents unbounded storage growth while maintaining the rollback depth your operations require.
