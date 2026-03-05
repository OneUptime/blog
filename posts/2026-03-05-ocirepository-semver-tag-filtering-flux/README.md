# How to Configure OCIRepository SemVer Tag Filtering in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, OCI, SemVer, Versioning

Description: Learn how to configure Flux CD's OCIRepository to automatically select OCI artifact versions using semantic versioning constraints.

---

## Introduction

When deploying OCI artifacts with Flux CD, you often want automatic updates within a controlled version range. Flux's OCIRepository supports semantic versioning (SemVer) constraints that let you define which versions are eligible for deployment. For example, you can allow automatic patch updates while requiring manual intervention for major version bumps.

This guide covers how SemVer filtering works in OCIRepository, the supported constraint syntax, and practical patterns for different deployment strategies.

## Prerequisites

- A Kubernetes cluster with Flux CD installed (v0.35 or later)
- The `flux` CLI installed
- An OCI-compatible container registry with multiple tagged artifacts
- `kubectl` configured to access your cluster

## How SemVer Filtering Works

When you set `spec.ref.semver` on an OCIRepository, Flux's source controller:

1. Lists all tags in the OCI repository
2. Filters tags that are valid SemVer versions
3. Selects the highest version that matches the constraint
4. Pulls that specific version

Every time the source controller reconciles (based on `spec.interval`), it re-evaluates available tags and updates to a newer matching version if one exists.

## Step 1: Push Versioned OCI Artifacts

First, push several versioned artifacts to your registry.

```bash
# Push multiple versions of an artifact
flux push artifact oci://registry.example.com/manifests/app:1.0.0 \
  --path=./deploy-v1.0.0 \
  --source="$(git config --get remote.origin.url)" \
  --revision="main@sha1:abc1234"

flux push artifact oci://registry.example.com/manifests/app:1.1.0 \
  --path=./deploy-v1.1.0 \
  --source="$(git config --get remote.origin.url)" \
  --revision="main@sha1:def5678"

flux push artifact oci://registry.example.com/manifests/app:1.1.1 \
  --path=./deploy-v1.1.1 \
  --source="$(git config --get remote.origin.url)" \
  --revision="main@sha1:ghi9012"

flux push artifact oci://registry.example.com/manifests/app:2.0.0 \
  --path=./deploy-v2.0.0 \
  --source="$(git config --get remote.origin.url)" \
  --revision="main@sha1:jkl3456"
```

List available versions.

```bash
# List all artifact versions in the repository
flux list artifacts oci://registry.example.com/manifests/app
```

## Step 2: Basic SemVer Constraint Patterns

### Allow All Versions Greater Than or Equal To

```yaml
# ocirepository-any.yaml -- Match any version >= 1.0.0
apiVersion: source.toolkit.fluxcd.io/v1beta2
kind: OCIRepository
metadata:
  name: app-manifests
  namespace: flux-system
spec:
  interval: 5m
  url: oci://registry.example.com/manifests/app
  ref:
    # Matches 1.0.0, 1.1.0, 1.1.1, 2.0.0, etc.
    semver: ">=1.0.0"
```

### Pin to a Major Version

```yaml
# ocirepository-major.yaml -- Only allow 1.x.x versions
apiVersion: source.toolkit.fluxcd.io/v1beta2
kind: OCIRepository
metadata:
  name: app-manifests
  namespace: flux-system
spec:
  interval: 5m
  url: oci://registry.example.com/manifests/app
  ref:
    # Matches 1.0.0, 1.1.0, 1.1.1 but NOT 2.0.0
    semver: ">=1.0.0 <2.0.0"
```

### Pin to a Minor Version (Patch Updates Only)

```yaml
# ocirepository-minor.yaml -- Only allow 1.1.x versions
apiVersion: source.toolkit.fluxcd.io/v1beta2
kind: OCIRepository
metadata:
  name: app-manifests
  namespace: flux-system
spec:
  interval: 5m
  url: oci://registry.example.com/manifests/app
  ref:
    # Matches 1.1.0, 1.1.1 but NOT 1.2.0 or 2.0.0
    semver: ">=1.1.0 <1.2.0"
```

### Use Tilde and Caret Ranges

Flux supports the standard SemVer range operators.

```yaml
# Tilde range: ~1.1.0 is equivalent to >=1.1.0 <1.2.0 (patch updates only)
apiVersion: source.toolkit.fluxcd.io/v1beta2
kind: OCIRepository
metadata:
  name: app-tilde
  namespace: flux-system
spec:
  interval: 5m
  url: oci://registry.example.com/manifests/app
  ref:
    semver: "~1.1.0"
```

```yaml
# Caret range: ^1.1.0 is equivalent to >=1.1.0 <2.0.0 (minor + patch updates)
apiVersion: source.toolkit.fluxcd.io/v1beta2
kind: OCIRepository
metadata:
  name: app-caret
  namespace: flux-system
spec:
  interval: 5m
  url: oci://registry.example.com/manifests/app
  ref:
    semver: "^1.1.0"
```

## Step 3: SemVer Constraint Reference

Here is a quick reference for commonly used SemVer constraints.

| Constraint | Meaning | Example Matches | Example Non-Matches |
|-----------|---------|-----------------|---------------------|
| `>=1.0.0` | Any version 1.0.0 or above | 1.0.0, 1.5.0, 2.0.0 | 0.9.0 |
| `>=1.0.0 <2.0.0` | 1.x range | 1.0.0, 1.9.9 | 2.0.0 |
| `~1.2.0` | Patch updates to 1.2 | 1.2.0, 1.2.5 | 1.3.0, 2.0.0 |
| `^1.2.0` | Compatible with 1.2.0 | 1.2.0, 1.9.0 | 2.0.0 |
| `1.0.0 - 1.5.0` | Between 1.0.0 and 1.5.0 | 1.0.0, 1.3.0, 1.5.0 | 1.6.0 |
| `>=1.0.0 <2.0.0 !=1.3.0` | 1.x except 1.3.0 | 1.0.0, 1.2.0, 1.4.0 | 1.3.0, 2.0.0 |

## Step 4: Pre-Release Version Handling

SemVer pre-release tags (e.g., `1.2.0-rc.1`) are handled according to SemVer specification. Pre-release versions have lower precedence than their release counterpart.

```bash
# Push a pre-release version
flux push artifact oci://registry.example.com/manifests/app:1.2.0-rc.1 \
  --path=./deploy-rc \
  --source="$(git config --get remote.origin.url)" \
  --revision="main@sha1:xyz7890"
```

```yaml
# OCIRepository that includes pre-release versions
apiVersion: source.toolkit.fluxcd.io/v1beta2
kind: OCIRepository
metadata:
  name: app-with-prerelease
  namespace: flux-system
spec:
  interval: 5m
  url: oci://registry.example.com/manifests/app
  ref:
    # Pre-release versions like 1.2.0-rc.1 are included when they match
    semver: ">=1.2.0-0"
```

Note the `-0` suffix in the constraint. This ensures pre-release versions are included in the range evaluation.

## Step 5: Apply and Monitor

Apply your chosen OCIRepository configuration.

```bash
# Apply the OCIRepository
kubectl apply -f ocirepository-major.yaml

# Watch for version selection
flux get sources oci --watch
```

Check which version Flux selected.

```bash
# See the resolved version and artifact digest
kubectl get ocirepository app-manifests -n flux-system -o jsonpath='{.status.artifact.revision}'
```

## Deployment Strategy Patterns

### Production: Controlled Updates

For production, use tight constraints and longer intervals.

```yaml
# Production: only patch updates, check every 30 minutes
apiVersion: source.toolkit.fluxcd.io/v1beta2
kind: OCIRepository
metadata:
  name: app-production
  namespace: flux-system
spec:
  interval: 30m
  url: oci://registry.example.com/manifests/app
  ref:
    semver: "~1.1.0"
```

### Staging: Broader Updates

For staging, allow minor version updates with faster polling.

```yaml
# Staging: minor and patch updates, check every 5 minutes
apiVersion: source.toolkit.fluxcd.io/v1beta2
kind: OCIRepository
metadata:
  name: app-staging
  namespace: flux-system
spec:
  interval: 5m
  url: oci://registry.example.com/manifests/app
  ref:
    semver: "^1.0.0"
```

### Development: Latest Everything

For development, allow all versions.

```yaml
# Development: any version, check every minute
apiVersion: source.toolkit.fluxcd.io/v1beta2
kind: OCIRepository
metadata:
  name: app-dev
  namespace: flux-system
spec:
  interval: 1m
  url: oci://registry.example.com/manifests/app
  ref:
    semver: "*"
```

## Troubleshooting

- **No matching version found**: Verify that your pushed artifacts use valid SemVer tags (e.g., `1.0.0`, not `v1.0.0`). Flux strips the `v` prefix when parsing, but the tag itself must be parseable as SemVer.
- **Wrong version selected**: Use `flux list artifacts` to see all available tags and verify which ones match your constraint. Remember that Flux always selects the highest matching version.
- **Artifact not updating**: Check the `interval` value. If you need immediate updates, run `flux reconcile source oci app-manifests`.

## Conclusion

SemVer tag filtering in Flux's OCIRepository gives you fine-grained control over which artifact versions get deployed to each environment. By choosing the right constraint pattern -- tilde for patch-only updates, caret for minor updates, or exact ranges for precise control -- you can build a promotion pipeline that automatically rolls out safe updates while preventing unexpected major version jumps. Combined with different constraints per environment, you get a progressive delivery system driven entirely by OCI artifact tags.
