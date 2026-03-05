# How to Configure HelmChart Version Constraints in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Helm, HelmChart, Version Constraints, SemVer

Description: Learn how to configure version constraints in Flux CD HelmChart resources to control which chart versions are deployed, from exact pins to flexible ranges.

---

## Introduction

Version constraints in Flux CD HelmChart resources control which chart version the source controller fetches from a HelmRepository. Choosing the right constraint strategy is critical: too strict and you miss important patches, too loose and you risk deploying breaking changes. Flux uses the same semver constraint syntax as Helm, based on the Masterminds semver library.

This guide covers all the version constraint options available in Flux HelmChart resources, with practical examples for different deployment strategies.

## Prerequisites

- A running Kubernetes cluster with Flux CD v2.x installed
- kubectl and the Flux CLI configured
- A HelmRepository source with charts available

## The Version Field in HelmChart

The `spec.version` field in a HelmChart resource accepts a semver constraint string. If omitted, Flux fetches the latest version of the chart. The field is only meaningful when the source is a HelmRepository (not a GitRepository or Bucket, where versioning is tied to commits).

```yaml
# Basic HelmChart with version constraint
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmChart
metadata:
  name: my-chart
  namespace: flux-system
spec:
  chart: nginx
  # The version constraint -- this is what we will explore
  version: "15.x"
  sourceRef:
    kind: HelmRepository
    name: bitnami
  interval: 10m
```

## Exact Version Pinning

The most restrictive approach pins to a specific version. Flux will only fetch this exact version.

```yaml
# helmchart-exact.yaml
# Pin to an exact chart version -- no automatic upgrades
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmChart
metadata:
  name: nginx-exact
  namespace: flux-system
spec:
  chart: nginx
  # Only this specific version will be fetched
  version: "15.4.4"
  sourceRef:
    kind: HelmRepository
    name: bitnami
  interval: 30m
```

**When to use:** Production environments where stability is the top priority and upgrades are managed through pull requests that change the version number.

## Wildcard Constraints

Wildcard constraints use `x`, `X`, or `*` to match any number in a version segment.

```yaml
# helmchart-wildcard-patch.yaml
# Allow any patch version within 15.4.x
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmChart
metadata:
  name: nginx-patch-wildcard
  namespace: flux-system
spec:
  chart: nginx
  # Matches 15.4.0, 15.4.1, 15.4.2, etc.
  version: "15.4.x"
  sourceRef:
    kind: HelmRepository
    name: bitnami
  interval: 10m
```

```yaml
# helmchart-wildcard-minor.yaml
# Allow any minor and patch version within 15.x
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmChart
metadata:
  name: nginx-minor-wildcard
  namespace: flux-system
spec:
  chart: nginx
  # Matches 15.0.0, 15.1.0, 15.4.4, etc.
  version: "15.x"
  sourceRef:
    kind: HelmRepository
    name: bitnami
  interval: 10m
```

## Tilde Constraints (Patch-Level Changes)

The tilde (`~`) constraint allows patch-level changes. It fixes the major and minor version but allows the patch version to increase.

```yaml
# helmchart-tilde.yaml
# Tilde constraint: allow patch-level updates only
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmChart
metadata:
  name: nginx-tilde
  namespace: flux-system
spec:
  chart: nginx
  # ~15.4.0 is equivalent to >=15.4.0 <15.5.0
  # Matches 15.4.0, 15.4.1, 15.4.2, but NOT 15.5.0
  version: "~15.4.0"
  sourceRef:
    kind: HelmRepository
    name: bitnami
  interval: 10m
```

**When to use:** When you want automatic bug fix updates but no new features.

## Caret Constraints (Minor-Level Changes)

The caret (`^`) constraint allows changes that do not modify the leftmost non-zero version segment.

```yaml
# helmchart-caret.yaml
# Caret constraint: allow minor and patch updates
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmChart
metadata:
  name: nginx-caret
  namespace: flux-system
spec:
  chart: nginx
  # ^15.4.0 is equivalent to >=15.4.0 <16.0.0
  # Matches 15.4.0, 15.5.0, 15.99.99, but NOT 16.0.0
  version: "^15.4.0"
  sourceRef:
    kind: HelmRepository
    name: bitnami
  interval: 10m
```

**When to use:** Staging environments where you want to test new minor releases automatically.

## Range Constraints

Range constraints use comparison operators to define explicit boundaries.

```yaml
# helmchart-range.yaml
# Explicit range constraint
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmChart
metadata:
  name: nginx-range
  namespace: flux-system
spec:
  chart: nginx
  # Accept versions from 15.0.0 up to (but not including) 16.0.0
  version: ">=15.0.0 <16.0.0"
  sourceRef:
    kind: HelmRepository
    name: bitnami
  interval: 10m
```

You can also use compound ranges with a space (AND) or double pipe (OR).

```yaml
# helmchart-compound-range.yaml
# Compound range constraints
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmChart
metadata:
  name: nginx-compound
  namespace: flux-system
spec:
  chart: nginx
  # AND condition: both constraints must be satisfied
  # Accept versions >= 15.2.0 AND < 15.5.0
  version: ">=15.2.0 <15.5.0"
  sourceRef:
    kind: HelmRepository
    name: bitnami
  interval: 10m
```

```yaml
# helmchart-or-range.yaml
# OR constraint: accept versions matching either range
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmChart
metadata:
  name: nginx-or
  namespace: flux-system
spec:
  chart: nginx
  # OR condition: either range is acceptable
  # Accept 14.9.x OR anything in 15.x
  version: ">=14.9.0 <14.10.0 || >=15.0.0 <16.0.0"
  sourceRef:
    kind: HelmRepository
    name: bitnami
  interval: 10m
```

## Version Constraint Comparison Table

Here is a quick reference of all constraint types and their behavior.

| Constraint | Matches | Does Not Match |
|------------|---------|----------------|
| `15.4.4` | 15.4.4 only | Everything else |
| `15.4.x` | 15.4.0, 15.4.1, 15.4.99 | 15.5.0, 16.0.0 |
| `15.x` | 15.0.0, 15.4.4, 15.99.0 | 14.0.0, 16.0.0 |
| `~15.4.0` | 15.4.0 to 15.4.x | 15.5.0, 16.0.0 |
| `^15.4.0` | 15.4.0 to 15.x.x | 16.0.0 |
| `>=15.0.0 <16.0.0` | 15.0.0 to 15.x.x | 14.x, 16.0.0 |
| `*` | Any version | Nothing |

## Strategy by Environment

A common pattern uses different version constraints for different environments.

```yaml
# helmchart-dev.yaml
# Development: always get the latest version
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmChart
metadata:
  name: my-app-dev
  namespace: flux-system
spec:
  chart: my-app
  # Accept any version
  version: "*"
  sourceRef:
    kind: HelmRepository
    name: internal-charts
  interval: 5m
---
# helmchart-staging.yaml
# Staging: allow minor updates within a major version
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmChart
metadata:
  name: my-app-staging
  namespace: flux-system
spec:
  chart: my-app
  # Allow minor and patch updates
  version: "^2.0.0"
  sourceRef:
    kind: HelmRepository
    name: internal-charts
  interval: 10m
---
# helmchart-production.yaml
# Production: pin to exact version, update via PR only
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmChart
metadata:
  name: my-app-production
  namespace: flux-system
spec:
  chart: my-app
  # Exact version pin
  version: "2.3.7"
  sourceRef:
    kind: HelmRepository
    name: internal-charts
  interval: 30m
```

## Verifying the Resolved Version

After applying a HelmChart with a version constraint, check which version Flux resolved.

```bash
# See the resolved chart version
kubectl get helmchart -n flux-system my-app-staging -o jsonpath='{.status.artifact.revision}'

# Or use the Flux CLI for a summary
flux get sources chart
```

The output shows the actual version that matched the constraint.

## Handling Pre-Release Versions

Semver pre-release versions (like `2.0.0-rc.1`) are not matched by range constraints by default. To include pre-release versions, you need to explicitly reference them.

```yaml
# helmchart-prerelease.yaml
# Explicitly allow a pre-release version
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmChart
metadata:
  name: my-app-rc
  namespace: flux-system
spec:
  chart: my-app
  # Pre-release versions must be explicitly targeted
  version: "2.0.0-rc.1"
  sourceRef:
    kind: HelmRepository
    name: internal-charts
  interval: 10m
```

## Summary

Version constraints in Flux HelmChart resources give you precise control over which chart versions are deployed. Use exact pins for production stability, tilde constraints for patch-level updates, caret constraints for minor-level flexibility, and wildcards or ranges for development environments. Match your constraint strategy to your deployment risk tolerance and always verify the resolved version after applying changes.
