# How to Configure HelmRelease Chart Reference in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Helm, HelmRelease, Chart Reference

Description: Learn how to configure the chart reference in a Flux CD HelmRelease to point to charts from HelmRepository, GitRepository, and Bucket sources.

---

## Introduction

The chart reference in a HelmRelease tells the Flux Helm Controller where to find the Helm chart to install. The `spec.chart.spec` section defines the chart name, version, and source reference. Getting this configuration right is essential because it determines which chart gets deployed and from where it is fetched.

This guide covers how to configure chart references for different source types, version constraints, and advanced options.

## Chart Reference Structure

Every HelmRelease contains a `spec.chart.spec` section with the following key fields.

```yaml
# Structure of the chart reference in a HelmRelease
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: example
  namespace: default
spec:
  interval: 10m
  chart:
    spec:
      # Name of the chart (required)
      chart: my-chart
      # Version constraint (optional but recommended)
      version: "1.2.x"
      # Source reference (required)
      sourceRef:
        kind: HelmRepository
        name: my-repo
        namespace: flux-system
      # How often to check for new chart versions
      reconcileStrategy: ChartVersion
      # Interval for checking the source for updates
      interval: 5m
```

## Referencing a HelmRepository

The most common source type is a HelmRepository. This is equivalent to a traditional Helm repo added with `helm repo add`.

```yaml
# HelmRelease referencing a chart from a HelmRepository
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: redis
  namespace: default
spec:
  interval: 10m
  chart:
    spec:
      # Chart name as listed in the Helm repository index
      chart: redis
      # SemVer version constraint
      version: ">=18.0.0 <19.0.0"
      sourceRef:
        kind: HelmRepository
        name: bitnami
        namespace: flux-system
```

The corresponding HelmRepository source must exist.

```yaml
# HelmRepository source definition
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: bitnami
  namespace: flux-system
spec:
  interval: 1h
  url: https://charts.bitnami.com/bitnami
```

## Referencing an OCI HelmRepository

For charts stored in OCI-compliant registries, use a HelmRepository with `type: oci`.

```yaml
# OCI-based HelmRepository source
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: podinfo-oci
  namespace: flux-system
spec:
  type: oci
  interval: 1h
  url: oci://ghcr.io/stefanprodan/charts
```

Then reference it in your HelmRelease.

```yaml
# HelmRelease referencing an OCI chart
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: podinfo
  namespace: default
spec:
  interval: 10m
  chart:
    spec:
      chart: podinfo
      version: "6.x"
      sourceRef:
        kind: HelmRepository
        name: podinfo-oci
        namespace: flux-system
```

## Referencing a GitRepository

You can also store Helm charts directly in a Git repository. In this case, the `chart` field is the path to the chart directory relative to the repository root.

```yaml
# GitRepository source definition
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-app-repo
  namespace: flux-system
spec:
  interval: 5m
  url: https://github.com/my-org/my-app
  ref:
    branch: main
```

```yaml
# HelmRelease referencing a chart from a GitRepository
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: default
spec:
  interval: 10m
  chart:
    spec:
      # Path to the chart directory in the Git repository
      chart: ./charts/my-app
      sourceRef:
        kind: GitRepository
        name: my-app-repo
        namespace: flux-system
      # Use Revision strategy for Git-based charts
      reconcileStrategy: Revision
```

When using a GitRepository source, set `reconcileStrategy: Revision` so the chart is updated whenever a new Git commit is detected, rather than looking for SemVer version changes.

## Referencing a Bucket Source

Charts can also be stored in S3-compatible buckets or Google Cloud Storage.

```yaml
# HelmRelease referencing a chart from a Bucket source
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: default
spec:
  interval: 10m
  chart:
    spec:
      chart: ./charts/my-app
      sourceRef:
        kind: Bucket
        name: my-bucket
        namespace: flux-system
      reconcileStrategy: Revision
```

## Version Constraints

The `version` field supports SemVer ranges. Here are common patterns.

```yaml
# Examples of version constraints
spec:
  chart:
    spec:
      chart: nginx

      # Exact version
      # version: "15.3.1"

      # Patch-level updates only (15.3.0, 15.3.1, 15.3.2, ...)
      # version: "15.3.x"

      # Minor-level updates (15.0.0, 15.1.0, 15.2.0, ...)
      # version: "15.x"

      # Range with upper bound
      # version: ">=15.0.0 <16.0.0"

      # Greater than or equal to
      version: ">=15.0.0"

      sourceRef:
        kind: HelmRepository
        name: bitnami
        namespace: flux-system
```

When no version is specified, the latest version is used. It is strongly recommended to pin at least a major version to avoid unexpected breaking changes.

## Reconcile Strategy

The `reconcileStrategy` field controls when Flux considers the chart to have changed.

| Strategy | Behavior | Best For |
|---|---|---|
| `ChartVersion` (default) | Updates when the SemVer version changes | HelmRepository sources |
| `Revision` | Updates when the source revision changes | GitRepository and Bucket sources |

```yaml
# Using Revision strategy for Git-based charts
spec:
  chart:
    spec:
      chart: ./charts/my-app
      sourceRef:
        kind: GitRepository
        name: my-app-repo
        namespace: flux-system
      reconcileStrategy: Revision
```

## Chart Interval

You can set a separate interval for how often the chart source is checked for updates, independent of the HelmRelease reconciliation interval.

```yaml
# Setting a dedicated chart check interval
spec:
  chart:
    spec:
      chart: nginx
      version: "15.x"
      sourceRef:
        kind: HelmRepository
        name: bitnami
        namespace: flux-system
      # Check for new chart versions every 30 minutes
      interval: 30m
```

## Source Reference Across Namespaces

The `sourceRef` can point to a source in a different namespace using the `namespace` field.

```yaml
# Cross-namespace source reference
spec:
  chart:
    spec:
      chart: nginx
      sourceRef:
        kind: HelmRepository
        name: bitnami
        # Source is in flux-system namespace, HelmRelease is in default
        namespace: flux-system
```

This allows you to define shared Helm repositories in a central namespace and reference them from HelmReleases across the cluster.

## Troubleshooting Chart References

If your chart reference is not resolving, check the following.

```bash
# Verify the source exists and is ready
flux get sources helm -A
flux get sources git -A

# Check the HelmRelease status for chart fetch errors
flux get helmreleases -n default

# View detailed conditions on the HelmRelease
kubectl describe helmrelease my-app -n default
```

Common issues include incorrect chart names, non-existent source references, and version constraints that no available chart satisfies.

## Conclusion

Configuring the chart reference correctly is the first step in any HelmRelease. Whether you are pulling charts from a Helm repository, an OCI registry, a Git repository, or an S3 bucket, Flux provides flexible source options to fit your workflow. Use version constraints wisely and choose the appropriate reconcile strategy for your source type to keep deployments predictable and automated.
