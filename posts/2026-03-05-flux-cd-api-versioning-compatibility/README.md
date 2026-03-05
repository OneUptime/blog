# How to Understand Flux CD API Versioning and Compatibility

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, API Versioning, Compatibility, Migration

Description: A comprehensive guide to Flux CD's API versioning scheme, compatibility guarantees, and how to migrate between API versions.

---

Flux CD follows Kubernetes API versioning conventions for its Custom Resource Definitions. Understanding how Flux versions its APIs helps you plan upgrades, write compatible manifests, and avoid breaking changes. Flux has gone through several API version transitions since its v2 rewrite, and knowing the versioning scheme is essential for maintaining a healthy GitOps setup.

## Flux API Groups

Flux organizes its APIs into several groups, each managed by a dedicated controller.

| API Group | Controller | Purpose |
|-----------|-----------|---------|
| `source.toolkit.fluxcd.io` | source-controller | Manages artifact sources (Git, Helm, OCI, Bucket) |
| `kustomize.toolkit.fluxcd.io` | kustomize-controller | Applies Kustomize overlays |
| `helm.toolkit.fluxcd.io` | helm-controller | Manages Helm releases |
| `notification.toolkit.fluxcd.io` | notification-controller | Handles alerts and event providers |
| `image.toolkit.fluxcd.io` | image-reflector-controller, image-automation-controller | Automates image updates |

Each API group has its own version that evolves independently. A source API might be at `v1` while the image API is at `v1beta2`.

## Kubernetes API Versioning Conventions

Flux follows the standard Kubernetes versioning levels.

**Alpha (v1alpha1, v1alpha2):** Experimental APIs that may change without notice. Not recommended for production use. Features may be incomplete.

**Beta (v1beta1, v1beta2):** APIs that are feature-complete but may still undergo breaking changes between beta versions. Suitable for non-critical environments.

**Stable (v1, v2):** APIs with strong backward compatibility guarantees. Breaking changes require a new major version. Safe for production.

## Current Flux API Versions

As of Flux v2.x, the stable API versions are as follows.

```yaml
# Source API - v1 is stable
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository

# Kustomize API - v1 is stable
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization

# Helm API - v2 is stable
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease

# Notification API - v1beta3 is the latest
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert

# Image Automation API - v1 is stable
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
```

## How API Version Transitions Work

When Flux introduces a new API version, it follows this lifecycle:

1. The new version is introduced alongside the old version. Both are served by the CRD.
2. The old version is marked as deprecated. Flux logs warnings when deprecated versions are used.
3. After a transition period, the old version is removed from the CRD.

The CRD stores resources in one version internally (the storage version) and converts between served versions. You can check which versions a CRD serves.

```bash
# Check which API versions are served for GitRepository
kubectl get crd gitrepositories.source.toolkit.fluxcd.io \
  -o jsonpath='{.spec.versions[*].name}'

# Check which version is the storage version
kubectl get crd gitrepositories.source.toolkit.fluxcd.io \
  -o jsonpath='{.spec.versions[?(@.storage==true)].name}'
```

## Identifying Deprecated API Usage

Before upgrading Flux, you should check whether your manifests use deprecated API versions.

```bash
# Search for deprecated v1beta2 source API usage in your manifests
grep -r "source.toolkit.fluxcd.io/v1beta2" ./clusters/

# Search for deprecated v2beta1 helm API usage
grep -r "helm.toolkit.fluxcd.io/v2beta1" ./clusters/

# Use flux to check the overall system health
flux check
```

Flux's notification controller can also alert you when deprecated APIs are in use if you configure an Alert resource for warning events.

## Migrating Between API Versions

Migration between API versions typically involves updating the `apiVersion` field and adjusting any fields that changed between versions. Here is an example of migrating a HelmRelease from `v2beta1` to `v2`.

The old `v2beta1` format.

```yaml
# Deprecated v2beta1 HelmRelease format
apiVersion: helm.toolkit.fluxcd.io/v2beta1
kind: HelmRelease
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 1h
  chart:
    spec:
      chart: my-app
      version: "1.0.0"
      sourceRef:
        kind: HelmRepository
        name: my-repo
  # v2beta1 used spec.targetNamespace at this level
  targetNamespace: production
```

The new `v2` format.

```yaml
# Stable v2 HelmRelease format
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 1h
  chart:
    spec:
      chart: my-app
      version: "1.0.0"
      sourceRef:
        kind: HelmRepository
        name: my-repo
  # v2 still supports targetNamespace at the same level
  targetNamespace: production
```

In many cases, the migration is as simple as changing the apiVersion string. However, some transitions involve field renames or structural changes, so always consult the Flux changelog for the specific version.

## Compatibility Matrix

Flux maintains compatibility between the CLI version and the controller versions running on the cluster. Using a mismatched CLI version can cause issues.

```bash
# Check installed Flux version on the cluster
flux version

# Example output showing CLI and controller versions
# flux: v2.2.0
# source-controller: v1.2.0
# kustomize-controller: v1.2.0
# helm-controller: v0.37.0
# notification-controller: v1.2.0
```

The general rule is that the CLI version should be greater than or equal to the controller versions. Using an older CLI with newer controllers may work but is not guaranteed.

## Handling Multi-Cluster API Version Differences

When managing multiple clusters with different Flux versions, you may need to maintain manifests compatible with different API versions. A common approach is to use Kustomize overlays.

```yaml
# base/kustomization.yaml - uses the latest stable API version
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - helmrelease.yaml

# overlays/legacy-cluster/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base
patches:
  # Patch API version for older cluster
  - target:
      kind: HelmRelease
      name: my-app
    patch: |
      - op: replace
        path: /apiVersion
        value: helm.toolkit.fluxcd.io/v2beta1
```

## Best Practices for API Version Management

1. Always use the latest stable API version in new manifests. Avoid using beta versions in production unless the stable version is not yet available for that resource type.

2. Monitor Flux release notes for API deprecation announcements. Flux typically provides at least two minor release cycles before removing a deprecated API version.

3. Run periodic checks on your manifests for deprecated API usage. Automate this in CI.

```bash
# Script to check for deprecated Flux API versions in a repository
#!/bin/bash
DEPRECATED_APIS=(
  "source.toolkit.fluxcd.io/v1beta1"
  "source.toolkit.fluxcd.io/v1beta2"
  "helm.toolkit.fluxcd.io/v2beta1"
  "kustomize.toolkit.fluxcd.io/v1beta1"
  "kustomize.toolkit.fluxcd.io/v1beta2"
)

for api in "${DEPRECATED_APIS[@]}"; do
  results=$(grep -rl "$api" ./clusters/ 2>/dev/null)
  if [ -n "$results" ]; then
    echo "WARNING: Deprecated API $api found in:"
    echo "$results"
  fi
done
```

4. Test API version migrations in a staging environment before applying them to production. A mismatch between the API version in Git and what the cluster CRD supports will cause reconciliation failures.

5. Pin your Flux CLI version in CI pipelines to avoid accidental upgrades that could generate manifests with API versions your clusters do not support.

## Conclusion

Flux CD's API versioning follows Kubernetes conventions, progressing from alpha to beta to stable. Each API group evolves independently, so different resource types may be at different maturity levels. To maintain a healthy Flux installation, use stable API versions where available, monitor for deprecation warnings, migrate proactively before old versions are removed, and keep your CLI and controller versions in sync. The `flux check` command is your first line of defense for detecting version mismatches and compatibility issues.
