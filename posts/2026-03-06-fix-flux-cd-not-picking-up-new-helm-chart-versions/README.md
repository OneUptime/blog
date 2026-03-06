# How to Fix Flux CD Not Picking Up New Helm Chart Versions

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, HelmRelease, Helm, Kubernetes, Troubleshooting, GitOps, SemVer, Chart Versions

Description: A practical guide to fixing Flux CD when it does not detect or install new Helm chart versions, covering version constraints, semver ranges, chart repository caching, and HelmRepository configuration.

---

## Introduction

Flux CD can automatically upgrade Helm charts when new versions are published. However, there are several reasons why Flux might not pick up a new chart version: overly restrictive version constraints, stale repository caches, or misconfigured HelmRepository resources. This guide walks through each issue and shows how to fix it.

## Understanding How Flux Resolves Chart Versions

When Flux processes a HelmRelease, it:

1. Fetches the chart index from the HelmRepository
2. Filters available versions based on the `version` constraint in the HelmRelease
3. Selects the highest version matching the constraint
4. Downloads and installs that version

```bash
# Check which version Flux currently has installed
kubectl get helmrelease -n my-namespace my-release -o jsonpath='{.status.lastAppliedRevision}'

# Check which chart version is being used
kubectl get helmchart -n flux-system my-namespace-my-release -o jsonpath='{.status.artifact.revision}'
```

## Common Cause 1: Version Constraint Too Restrictive

The most common reason Flux does not pick up new versions is that the semver constraint in the HelmRelease does not match the new version.

### Diagnosing the Issue

```bash
# Check the current version constraint
kubectl get helmrelease -n my-namespace my-release -o jsonpath='{.spec.chart.spec.version}'

# Check available versions from the repository
helm repo update
helm search repo my-repo/my-chart --versions | head -20
```

### Example: Pinned Version Blocks Updates

```yaml
# This will NEVER auto-update because the version is pinned exactly
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-release
  namespace: my-namespace
spec:
  interval: 5m
  chart:
    spec:
      chart: my-chart
      sourceRef:
        kind: HelmRepository
        name: my-repo
        namespace: flux-system
      # Pinned to exact version - no auto-updates
      version: "1.2.3"
```

### Fix: Use Semver Range Constraints

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-release
  namespace: my-namespace
spec:
  interval: 5m
  chart:
    spec:
      chart: my-chart
      sourceRef:
        kind: HelmRepository
        name: my-repo
        namespace: flux-system
      # Allow patch updates only (e.g., 1.2.3 -> 1.2.4)
      version: "1.2.x"
```

### Semver Range Reference

```yaml
# Exact version - no auto-updates
version: "1.2.3"

# Patch updates only: 1.2.0, 1.2.1, 1.2.2, etc.
version: "1.2.x"
# Or equivalently:
version: "~1.2.0"

# Minor updates: 1.0.0, 1.1.0, 1.2.0, etc. (but not 2.0.0)
version: "1.x"
# Or equivalently:
version: "^1.0.0"

# Range: anything from 1.0.0 up to but not including 2.0.0
version: ">=1.0.0 <2.0.0"

# Greater than or equal to a version
version: ">=1.2.3"

# Latest version (omit the version field entirely)
# Flux will always use the latest available version
```

### Example: Version Constraint Does Not Match New Version

If your chart publishes version `2.0.0` but your constraint is `1.x`, Flux correctly ignores it because `2.0.0` is outside the range.

```yaml
# This constraint allows 1.x but NOT 2.x
version: "1.x"

# To include major version 2, update the constraint
version: ">=1.0.0 <3.0.0"

# Or to only allow 2.x
version: "2.x"
```

## Common Cause 2: Stale HelmRepository Cache

The HelmRepository fetches the chart index periodically. If the cache is stale, Flux will not see new versions until the next refresh.

### Diagnosing the Issue

```bash
# Check when the HelmRepository was last updated
kubectl get helmrepository -n flux-system my-repo -o jsonpath='{.status.conditions[0].lastTransitionTime}'

# Check the HelmRepository interval
kubectl get helmrepository -n flux-system my-repo -o jsonpath='{.spec.interval}'
```

### Fix: Force HelmRepository Refresh

```bash
# Force an immediate refresh of the HelmRepository index
flux reconcile source helm my-repo -n flux-system

# Verify the repository was updated
kubectl get helmrepository -n flux-system my-repo
```

### Fix: Reduce HelmRepository Interval

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: my-repo
  namespace: flux-system
spec:
  # Reduce interval for faster detection of new chart versions
  interval: 5m
  url: https://charts.example.com
```

## Common Cause 3: Chart Repository Index Caching by CDN

Some chart repositories use a CDN that caches the `index.yaml` file. Even if a new chart version is published, the CDN may serve the old index for minutes or hours.

### Diagnosing the Issue

```bash
# Fetch the index directly and check if the new version is listed
curl -s https://charts.example.com/index.yaml | grep "version:" | head -20

# Check CDN cache headers
curl -I https://charts.example.com/index.yaml | grep -i "cache\|age\|expires"
```

### Fix: Wait for CDN Cache Invalidation

This is not something you can fix on the Flux side. You need to either:

1. Wait for the CDN cache to expire
2. Contact the chart repository maintainer to invalidate the cache
3. Use a direct (non-CDN) URL if available

```bash
# After the CDN cache expires, force Flux to refresh
flux reconcile source helm my-repo -n flux-system
```

## Common Cause 4: HelmRepository Authentication Expired

If the Helm repository requires authentication and the credentials have expired, the source-controller cannot fetch the updated index.

### Diagnosing the Issue

```bash
# Check HelmRepository status for auth errors
kubectl get helmrepository -n flux-system my-repo -o yaml | grep -A 10 "conditions:"

# Check source-controller logs
kubectl logs -n flux-system deploy/source-controller --tail=50 | grep "my-repo"
```

### Fix: Update Repository Credentials

```yaml
---
# Update the Secret with new credentials
apiVersion: v1
kind: Secret
metadata:
  name: helm-repo-creds
  namespace: flux-system
type: Opaque
stringData:
  username: my-user
  password: my-new-password
---
# Reference the secret in the HelmRepository
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: my-repo
  namespace: flux-system
spec:
  interval: 10m
  url: https://charts.example.com
  secretRef:
    name: helm-repo-creds
```

## Common Cause 5: OCI-Based Helm Repository Not Refreshing

If you use an OCI registry for Helm charts, the configuration is different from HTTP-based repositories.

### Diagnosing the Issue

```bash
# Check the HelmRepository type
kubectl get helmrepository -n flux-system my-repo -o jsonpath='{.spec.type}'
```

### Fix: Configure OCI HelmRepository Properly

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: my-oci-repo
  namespace: flux-system
spec:
  interval: 5m
  # Must set type to oci for OCI registries
  type: oci
  url: oci://ghcr.io/myorg/charts
  secretRef:
    name: oci-registry-creds
---
apiVersion: v1
kind: Secret
metadata:
  name: oci-registry-creds
  namespace: flux-system
type: kubernetes.io/dockerconfigjson
data:
  .dockerconfigjson: <base64-encoded-docker-config>
```

## Common Cause 6: HelmChart Object Not Updating

The HelmChart object acts as an intermediary between the HelmRepository and HelmRelease. If it is stuck, new versions will not be picked up.

### Diagnosing the Issue

```bash
# List HelmChart objects
kubectl get helmchart -n flux-system

# Check the HelmChart status
kubectl get helmchart -n flux-system <namespace>-<release-name> -o yaml
```

### Fix: Force HelmChart Reconciliation

```bash
# Force the entire chain to reconcile
flux reconcile source helm my-repo -n flux-system
flux reconcile helmrelease my-release -n my-namespace
```

## Complete Debugging Workflow

```bash
# Step 1: Check what version is currently installed
kubectl get helmrelease -n my-namespace my-release -o jsonpath='{.status.lastAppliedRevision}'
echo ""

# Step 2: Check the version constraint
kubectl get helmrelease -n my-namespace my-release -o jsonpath='{.spec.chart.spec.version}'
echo ""

# Step 3: Check if the HelmRepository has the latest index
kubectl get helmrepository -n flux-system my-repo
flux reconcile source helm my-repo -n flux-system

# Step 4: Verify the new version exists in the repository
helm repo update && helm search repo my-repo/my-chart --versions | head -10

# Step 5: Check if the version constraint matches the new version
# (manual verification using the semver range and available versions)

# Step 6: Force the HelmRelease to reconcile
flux reconcile helmrelease my-release -n my-namespace

# Step 7: Check for errors
kubectl get helmrelease -n my-namespace my-release -o yaml | grep -A 10 "conditions:"

# Step 8: Verify the new version is installed
kubectl get helmrelease -n my-namespace my-release -o jsonpath='{.status.lastAppliedRevision}'
```

## Automating Chart Version Updates

For production environments, consider a structured approach to version constraints:

```yaml
---
# Development: auto-update to latest
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app-dev
  namespace: dev
spec:
  interval: 5m
  chart:
    spec:
      chart: my-chart
      sourceRef:
        kind: HelmRepository
        name: my-repo
        namespace: flux-system
      # No version constraint - always use latest
---
# Staging: allow minor and patch updates
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app-staging
  namespace: staging
spec:
  interval: 10m
  chart:
    spec:
      chart: my-chart
      sourceRef:
        kind: HelmRepository
        name: my-repo
        namespace: flux-system
      # Allow minor updates within major version 1
      version: "^1.0.0"
---
# Production: only allow patch updates
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app-prod
  namespace: production
spec:
  interval: 30m
  chart:
    spec:
      chart: my-chart
      sourceRef:
        kind: HelmRepository
        name: my-repo
        namespace: flux-system
      # Only patch updates for stability
      version: "~1.2.0"
```

## Conclusion

When Flux CD does not pick up new Helm chart versions, the issue is usually an overly restrictive version constraint, a stale HelmRepository cache, or expired authentication credentials. Always verify that your semver range actually includes the new version using the reference table above. Force a HelmRepository refresh with `flux reconcile source helm` to clear stale caches, and use appropriate version range strategies for each environment (wide ranges for dev, narrow ranges for production).
