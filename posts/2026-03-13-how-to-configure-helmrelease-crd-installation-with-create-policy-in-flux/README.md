# How to Configure HelmRelease CRD Installation with Create Policy in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, HelmRelease, Kubernetes, GitOps, Helm, CRD, Custom Resource Definitions

Description: Learn how to configure CRD installation policies in HelmRelease resources using Flux CD to manage custom resource definition lifecycle.

---

## Introduction

Custom Resource Definitions (CRDs) are a common component of Kubernetes applications. Many Helm charts include CRDs that define custom resources used by operators and controllers. However, CRD management during Helm operations requires special attention because CRDs are cluster-scoped resources that affect the entire Kubernetes API, and mishandling them can break other applications.

Flux CD provides the `spec.install.crds` field in HelmRelease resources that controls how CRDs from a chart's `crds/` directory are handled during installation. The Create policy, in particular, tells Flux to create CRDs during the initial install but not update or replace existing CRDs. This is the safest default for most use cases.

This guide explains the available CRD policies, how to configure the Create policy, and best practices for managing CRDs in a GitOps workflow.

## Prerequisites

Before following this guide, ensure you have:

- A Kubernetes cluster with Flux CD installed
- kubectl access to the cluster with cluster-admin permissions
- A Helm chart that includes CRDs
- Understanding of CRD lifecycle in Kubernetes

## Understanding CRD Policies in Flux

Flux HelmRelease supports several CRD policies through the `spec.install.crds` field:

- `Skip`: Do not install or manage CRDs at all. Use this when CRDs are managed separately.
- `Create`: Create CRDs during install but do not update them during upgrades. This is the safest option.
- `CreateReplace`: Create CRDs during install and replace them during upgrades. Use this when you want Flux to manage CRD creation and updates.

The same options are available under `spec.upgrade.crds` for controlling CRD behavior during upgrades.

## Configuring the Create Policy

The Create policy is recommended for most applications. It ensures CRDs from the chart's `crds/` directory are created when the chart is first installed but leaves existing CRDs untouched:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-operator
  namespace: my-operator-system
spec:
  interval: 10m
  chart:
    spec:
      chart: my-operator
      version: "4.0.0"
      sourceRef:
        kind: HelmRepository
        name: my-repo
        namespace: flux-system
  install:
    crds: Create
    remediation:
      retries: 3
```

With this configuration, the CRDs bundled in the chart's `crds/` directory are created during the initial installation. On subsequent upgrades, the CRDs are left as-is by default, even if the chart includes updated CRD definitions, because `spec.upgrade.crds` defaults to `Skip`.

## Configuring CRD Policies for Both Install and Upgrade

To control CRD behavior across the full lifecycle, set policies for both install and upgrade:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-operator
  namespace: my-operator-system
spec:
  interval: 10m
  chart:
    spec:
      chart: my-operator
      version: "4.0.0"
      sourceRef:
        kind: HelmRepository
        name: my-repo
        namespace: flux-system
  install:
    crds: Create
    remediation:
      retries: 3
  upgrade:
    crds: Skip
    remediation:
      retries: 3
      strategy: rollback
```

This creates CRDs on install but skips any CRD changes during upgrades. This is the most conservative approach and prevents accidental CRD modifications.

## Using CreateReplace for CRD Updates

If you want Flux to manage CRD creation and updates from the chart's `crds/` directory:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: prometheus-operator
  namespace: monitoring
spec:
  interval: 10m
  chart:
    spec:
      chart: kube-prometheus-stack
      version: "56.0.0"
      sourceRef:
        kind: HelmRepository
        name: prometheus-community
        namespace: flux-system
  install:
    crds: CreateReplace
    remediation:
      retries: 3
  upgrade:
    crds: CreateReplace
    remediation:
      retries: 3
      strategy: rollback
```

The CreateReplace policy replaces existing CRDs with the versions from the chart. This is useful for charts like kube-prometheus-stack where CRD updates are necessary for new features to work correctly.

## Managing CRDs Separately

For critical CRDs that should not be managed by Helm at all, use the Skip policy and manage CRDs with a separate Kustomization:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: cert-manager
  namespace: cert-manager
spec:
  interval: 10m
  chart:
    spec:
      chart: cert-manager
      version: "1.14.0"
      sourceRef:
        kind: HelmRepository
        name: jetstack
        namespace: flux-system
  install:
    crds: Skip
  upgrade:
    crds: Skip
  values:
    installCRDs: false
```

Then manage the CRDs with a Flux Kustomization that applies the CRD manifests directly:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: cert-manager-crds
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./crds/cert-manager
  prune: false
```

Setting `prune: false` on the Kustomization ensures that CRDs are never deleted by Flux, which is important because deleting a CRD also deletes all custom resources of that type.

## Handling CRD Upgrade Issues

CRD upgrades can fail for several reasons. Helm itself does not support upgrading or deleting CRDs from a chart's `crds/` directory, and Flux's `CreateReplace` policy replaces existing CRDs but does not delete CRDs that are no longer shipped by the chart. If you manage cert-manager CRDs separately and encounter CRD upgrade issues, apply the new CRDs manually before upgrading the Helm release:

```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.14.0/cert-manager.crds.yaml
```

Then trigger a reconciliation:

```bash
flux reconcile helmrelease cert-manager -n cert-manager
```

## Best Practices

Here is a production-ready configuration that follows CRD management best practices:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-operator
  namespace: my-operator-system
spec:
  interval: 5m
  timeout: 15m
  chart:
    spec:
      chart: my-operator
      version: "4.0.0"
      sourceRef:
        kind: HelmRepository
        name: my-repo
        namespace: flux-system
  install:
    crds: Create
    remediation:
      retries: 3
  upgrade:
    crds: CreateReplace
    cleanupOnFail: true
    remediation:
      retries: 3
      strategy: rollback
  uninstall:
    disableHooks: true
    keepHistory: false
```

This creates CRDs during install and updates existing CRDs during upgrades while enabling rollback remediation for the Helm release. The `cleanupOnFail` option removes any newly created resources if the upgrade fails.

## Conclusion

Configuring CRD installation policies in Flux HelmRelease is essential for safe and predictable deployments. The Create policy is the safest default, ensuring CRDs are installed but never modified unexpectedly. Use CreateReplace when you need Helm to manage CRD updates, and Skip when you prefer to manage CRDs independently through a separate Kustomization. Choose the right policy based on the criticality of the CRDs and how tightly they are coupled to the Helm chart that provides them.
