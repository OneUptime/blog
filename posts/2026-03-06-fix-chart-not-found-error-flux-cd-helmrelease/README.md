# How to Fix "chart not found" Error in Flux CD HelmRelease

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, HelmRelease, Helm, Kubernetes, Troubleshooting, GitOps, Chart Not Found

Description: A practical guide to diagnosing and fixing the "chart not found" error in Flux CD HelmRelease resources, covering wrong chart names, repository URLs, and version constraints.

---

## Introduction

The "chart not found" error is one of the most common issues encountered when working with Flux CD HelmRelease resources. This error occurs when Flux's helm-controller cannot locate the specified Helm chart in the referenced HelmRepository. The root causes range from simple typos to misconfigured repository URLs and incorrect version constraints.

In this guide, we will walk through the most common causes of this error and provide step-by-step fixes for each scenario.

## Understanding the Error

When you see a "chart not found" error, your HelmRelease status will typically look like this:

```bash
# Check the status of your HelmRelease
kubectl get helmrelease -n my-namespace my-release -o yaml
```

The output will contain a condition similar to:

```yaml
status:
  conditions:
    - type: Ready
      status: "False"
      reason: ChartPullFailed
      message: 'chart "my-chart" version "1.2.3" not found in repository "my-repo"'
```

## Common Cause 1: Wrong Chart Name

The most frequent cause is a mismatch between the chart name specified in the HelmRelease and the actual chart name in the repository.

### Diagnosing the Issue

```bash
# List all charts available in the HelmRepository
kubectl get helmchart -n my-namespace
```

```bash
# Check the HelmRepository index for available charts
kubectl describe helmrepository -n my-namespace my-repo
```

### Example of Incorrect Configuration

```yaml
# Wrong: chart name has a typo
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-release
  namespace: my-namespace
spec:
  interval: 5m
  chart:
    spec:
      # This name does not match the actual chart name
      chart: ngingx-ingress
      sourceRef:
        kind: HelmRepository
        name: my-repo
      version: "4.0.x"
```

### Fix: Correct the Chart Name

```yaml
# Correct: use the exact chart name from the repository
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-release
  namespace: my-namespace
spec:
  interval: 5m
  chart:
    spec:
      # Fixed: correct chart name
      chart: nginx-ingress
      sourceRef:
        kind: HelmRepository
        name: my-repo
      version: "4.0.x"
```

### Verifying Available Chart Names

You can verify the available chart names by adding the Helm repository locally:

```bash
# Add the repository locally to inspect available charts
helm repo add my-repo https://charts.example.com
helm repo update

# Search for charts in the repository
helm search repo my-repo/
```

## Common Cause 2: Wrong or Unreachable Repository URL

If the HelmRepository URL is incorrect or the repository is unreachable, Flux cannot fetch the chart index and will report a "chart not found" error.

### Diagnosing the Issue

```bash
# Check the HelmRepository status
kubectl get helmrepository -n my-namespace my-repo -o yaml
```

Look for errors in the status:

```yaml
status:
  conditions:
    - type: Ready
      status: "False"
      reason: IndexationFailed
      message: 'failed to fetch repository index: GET https://wrong-url.example.com/index.yaml: 404 Not Found'
```

### Example of Incorrect Configuration

```yaml
# Wrong: repository URL is incorrect
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: my-repo
  namespace: my-namespace
spec:
  interval: 10m
  # This URL is wrong or the server is down
  url: https://wrong-url.example.com/charts
```

### Fix: Correct the Repository URL

```yaml
# Correct: use the proper repository URL
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: my-repo
  namespace: my-namespace
spec:
  interval: 10m
  # Fixed: correct URL for the Helm repository
  url: https://charts.example.com
```

### Testing the Repository URL

```bash
# Test if the repository index is accessible
curl -s https://charts.example.com/index.yaml | head -20

# If the repository requires authentication, check the secret
kubectl get secret -n my-namespace my-repo-auth -o yaml
```

## Common Cause 3: Incorrect Version Constraints

Flux uses semver version constraints. If the version constraint does not match any available chart version, you will get a "chart not found" error.

### Diagnosing the Issue

```bash
# Check what version is being requested
kubectl get helmrelease -n my-namespace my-release -o jsonpath='{.spec.chart.spec.version}'

# List available versions from the repository
helm search repo my-repo/my-chart --versions
```

### Example of Incorrect Configuration

```yaml
# Wrong: version constraint matches no available versions
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
      # No chart version 99.x.x exists
      version: "99.0.x"
```

### Fix: Use a Valid Version Constraint

```yaml
# Correct: use a version range that matches available versions
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
      # Use a valid semver range
      version: ">=4.0.0 <5.0.0"
```

### Common Semver Patterns

```yaml
# Exact version
version: "4.2.1"

# Patch-level updates only
version: "4.2.x"

# Minor-level updates only
version: "4.x"

# Range constraint
version: ">=4.0.0 <5.0.0"

# Latest version (omit version field entirely)
# spec:
#   chart:
#     spec:
#       chart: my-chart
#       sourceRef:
#         kind: HelmRepository
#         name: my-repo
```

## Common Cause 4: Source Reference Mismatch

The HelmRelease may reference a HelmRepository that does not exist or is in a different namespace.

### Diagnosing the Issue

```bash
# List all HelmRepositories across all namespaces
kubectl get helmrepository -A

# Verify the sourceRef in the HelmRelease
kubectl get helmrelease -n my-namespace my-release -o jsonpath='{.spec.chart.spec.sourceRef}'
```

### Fix: Correct the Source Reference

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
        # If the HelmRepository is in a different namespace, specify it
        namespace: flux-system
      version: "4.0.x"
```

## Debugging Workflow

Follow this step-by-step workflow to diagnose and fix the "chart not found" error:

```bash
# Step 1: Check the HelmRelease status for error details
kubectl get helmrelease -n my-namespace my-release -o yaml | grep -A 10 "conditions:"

# Step 2: Verify the HelmRepository is ready
kubectl get helmrepository -n my-namespace my-repo

# Step 3: Force reconciliation of the HelmRepository
flux reconcile source helm my-repo -n my-namespace

# Step 4: Force reconciliation of the HelmRelease
flux reconcile helmrelease my-release -n my-namespace

# Step 5: Check Flux helm-controller logs for detailed errors
kubectl logs -n flux-system deploy/helm-controller | grep "my-release"
```

## Complete Working Example

Here is a complete working example with both the HelmRepository and HelmRelease correctly configured:

```yaml
---
# HelmRepository: defines where to find charts
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: bitnami
  namespace: flux-system
spec:
  interval: 30m
  url: https://charts.bitnami.com/bitnami
---
# HelmRelease: defines which chart to install and how
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: redis
  namespace: default
spec:
  interval: 5m
  chart:
    spec:
      # Chart name must match exactly what is in the repository
      chart: redis
      sourceRef:
        kind: HelmRepository
        name: bitnami
        # Reference the namespace where HelmRepository lives
        namespace: flux-system
      # Use a valid semver constraint
      version: "18.x"
  values:
    architecture: standalone
    auth:
      enabled: true
```

## Conclusion

The "chart not found" error in Flux CD is almost always caused by one of four issues: a wrong chart name, an incorrect or unreachable repository URL, an invalid version constraint, or a mismatched source reference. By following the debugging workflow above and verifying each component, you can quickly identify and fix the root cause. Always verify chart availability using `helm search repo` and check HelmRepository readiness before investigating the HelmRelease itself.
