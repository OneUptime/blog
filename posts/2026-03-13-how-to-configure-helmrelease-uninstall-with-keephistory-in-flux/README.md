# How to Configure HelmRelease Uninstall with keepHistory in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, HelmRelease, Kubernetes, GitOps, Helm, Uninstall, keepHistory

Description: Learn how to use the keepHistory option during HelmRelease uninstall in Flux CD to preserve or remove Helm release history.

---

## Introduction

When Helm uninstalls a release, it can either remove all traces of the release from the cluster or preserve the release history for auditing and debugging purposes. The `keepHistory` option in Flux HelmRelease controls this behavior during the uninstall phase.

By default, Helm removes the release history (stored as Kubernetes secrets) when uninstalling. Setting `keepHistory` to true preserves these secrets, allowing you to inspect the release's past states, values, and chart versions even after the application has been removed. This can be valuable for compliance, debugging, and understanding what was previously deployed.

This guide explains how to configure `keepHistory` in your HelmRelease manifests, the implications of each setting, and when to use each approach.

## Prerequisites

Before you begin, make sure you have:

- A Kubernetes cluster running Flux CD
- A HelmRelease managed by Flux
- kubectl access to the cluster
- Understanding of how Helm stores release information

## How Helm Release History Works

Helm stores each release version as a Kubernetes secret with the label `owner=helm`. These secrets contain the rendered manifests, chart metadata, and values used for each release version. The secret name follows the pattern `sh.helm.release.v1.<name>.v<version>`.

When you uninstall a release without `keepHistory`, Helm deletes all these secrets. When `keepHistory` is enabled, the release secrets remain in the cluster with the release status set to "uninstalled."

You can view these secrets with:

```bash
kubectl get secrets -n production -l owner=helm,name=my-app
```

## Configuring keepHistory

To preserve release history during uninstall, set `keepHistory: true`:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: production
spec:
  interval: 5m
  chart:
    spec:
      chart: my-app
      version: "2.0.0"
      sourceRef:
        kind: HelmRepository
        name: my-repo
        namespace: flux-system
  uninstall:
    keepHistory: true
```

To remove all history on uninstall (the default), explicitly set it to false:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: production
spec:
  interval: 5m
  chart:
    spec:
      chart: my-app
      version: "2.0.0"
      sourceRef:
        kind: HelmRepository
        name: my-repo
        namespace: flux-system
  uninstall:
    keepHistory: false
```

## Full Uninstall Configuration with keepHistory

Combine `keepHistory` with other uninstall options for a complete configuration:

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
  upgrade:
    remediation:
      retries: 3
      strategy: rollback
  uninstall:
    keepHistory: true
    disableHooks: true
    disableWait: true
    timeout: 5m
```

## When to Use keepHistory

Preserve history when:

- You need audit trails for compliance requirements
- You want to inspect what was deployed before an uninstall for debugging
- Your organization requires records of all deployments
- You may need to reference previous chart versions and values

Remove history when:

- You are using the uninstall remediation strategy and want a clean reinstall
- The namespace has many releases and you want to minimize secret count
- You do not need historical records after removal
- You want to avoid potential conflicts when reinstalling with the same name

## keepHistory with Uninstall Remediation

When using the uninstall strategy for upgrade remediation, `keepHistory` interacts with the reinstall cycle:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: production
spec:
  interval: 5m
  chart:
    spec:
      chart: my-app
      version: "3.0.0"
      sourceRef:
        kind: HelmRepository
        name: my-repo
        namespace: flux-system
  upgrade:
    remediation:
      retries: 3
      strategy: uninstall
      remediateLastFailure: true
  uninstall:
    keepHistory: false
    disableHooks: true
```

Setting `keepHistory: false` when using uninstall remediation is recommended. Keeping history could cause the subsequent reinstall to see old release data and behave as an upgrade rather than a fresh install, potentially reintroducing the same failures.

## Inspecting Preserved History

After an uninstall with `keepHistory: true`, you can inspect the preserved history:

```bash
# List preserved release secrets
kubectl get secrets -n production -l owner=helm,name=my-app

# View the last release details
helm history my-app -n production

# Check specific release values
helm get values my-app -n production --revision 5
```

The release will show with a status of "uninstalled" in the Helm history.

## Cleaning Up Preserved History

If you used `keepHistory` and later decide to clean up, you can delete the release secrets manually:

```bash
kubectl delete secrets -n production -l owner=helm,name=my-app
```

Or use the Helm CLI to purge:

```bash
helm uninstall my-app -n production
```

If the release is already uninstalled, you may need to delete the secrets directly.

## Managing History Limits

To prevent unbounded growth of release history over time, use the `maxHistory` field:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: production
spec:
  interval: 5m
  maxHistory: 10
  chart:
    spec:
      chart: my-app
      version: "2.0.0"
      sourceRef:
        kind: HelmRepository
        name: my-repo
        namespace: flux-system
  uninstall:
    keepHistory: true
```

The `maxHistory` field limits the number of release secrets Helm keeps. When combined with `keepHistory`, this provides a bounded audit trail that does not grow indefinitely.

## Conclusion

The `keepHistory` option in HelmRelease uninstall configuration gives you control over whether Helm release history is preserved after removal. Use `keepHistory: true` when you need audit trails or debugging capability for removed releases. Use `keepHistory: false` (the default) when using uninstall remediation strategies or when you want a clean slate after removal. Combine with `maxHistory` to bound the size of your release history and prevent unlimited secret accumulation in your cluster.
