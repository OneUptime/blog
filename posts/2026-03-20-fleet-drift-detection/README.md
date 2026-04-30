# How to Configure Fleet Drift Detection

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Fleet, GitOps, Rancher, Kubernetes, Drift Detection

Description: Learn how to configure Fleet's drift detection to automatically identify and remediate configuration drift in your Kubernetes clusters.

## Introduction

Configuration drift occurs when the actual state of your Kubernetes resources diverges from the desired state defined in Git. Drift can happen when someone manually edits resources, when an operator modifies a deployment, or when a cluster partially applies updates. Fleet surfaces detected drift in status fields and, when `correctDrift.enabled` is set, can automatically reconcile it.

This guide covers how to configure Fleet's drift detection, enable automatic drift correction, understand drift conditions, and respond to drift status changes.

## Prerequisites

- Fleet installed in Rancher
- GitRepo resources configured
- `kubectl` access to the Fleet manager and a downstream cluster

## How Fleet Drift Detection Works

Fleet's agent in each downstream cluster monitors deployed resources and compares their live state against the desired state stored in the bundle. When it detects a difference (drift), it can:

1. **Report** the drift (non-remediation mode)
2. **Remediate** the drift by re-applying the desired state

## Enabling Drift Correction

Fleet reports drift through status fields by default. Automatic drift correction is configured at the GitRepo level:

```yaml
# gitrepo-drift-detection.yaml

apiVersion: fleet.cattle.io/v1alpha1
kind: GitRepo
metadata:
  name: my-app
  namespace: fleet-default
spec:
  repo: https://github.com/my-org/my-app
  branch: main

  # Enable automatic drift correction
  correctDrift:
    # Enable drift correction (re-applies desired state when drift detected)
    enabled: true

    # Use Helm rollback with --force if needed
    # Warning: this may recreate resources
    force: false

  targets:
    - clusterSelector: {}
```

```bash
# Apply the GitRepo with drift correction
kubectl apply -f gitrepo-drift-detection.yaml

# Verify drift correction is configured
kubectl get gitrepo my-app -n fleet-default -o jsonpath='{.spec.correctDrift}'
```

## Testing Drift Detection

To test that drift detection is working:

```bash
# Step 1: Deploy an application via Fleet and confirm it's running
kubectl get bundle my-app -n fleet-default

# Step 2: Using access to a downstream cluster, manually scale the deployment
# (This simulates drift)
kubectl --context <downstream-cluster-context> scale deployment my-app --replicas=5 -n my-app

# Step 3: Wait a few seconds for Fleet to detect and reconcile the drift
# Step 4: Verify Fleet corrected the drift
kubectl --context <downstream-cluster-context> get deployment my-app -n my-app -o jsonpath='{.spec.replicas}'
# Should return to the value defined in Git
```

## Monitoring Drift Status

### Checking Drift in Bundle Deployments

```bash
# List all bundle deployments and check drift status
kubectl get bundledeployments -A

# Check a specific bundle deployment for drift
kubectl describe bundledeployment <bundledeployment-name> -n <cluster-namespace>

# Look for "Modified" in the display state
kubectl get bundledeployments -A \
  -o jsonpath='{range .items[*]}{.metadata.namespace}{" "}{.metadata.name}{" "}{.status.display.state}{"\n"}{end}'
```

### GitRepo Drift Status Summary

```bash
# Check the GitRepo display state
kubectl get gitrepo my-app -n fleet-default \
  -o jsonpath='{.status.display.state}{"\n"}'

# Check how many resources are currently reported as modified
kubectl get gitrepo my-app -n fleet-default \
  -o jsonpath='{.status.resourceCounts.modified}{"\n"}'
```

## Configuring Drift Detection Per Target

You can configure drift detection differently for different cluster types:

```yaml
# fleet.yaml - Per-target drift behavior
targetCustomizations:
  # Production: always correct drift immediately
  - name: production
    clusterSelector:
      matchLabels:
        env: production
    correctDrift:
      enabled: true
      force: false

  # Development: detect drift but don't auto-correct
  # Developers may want to experiment with live changes
  - name: development
    clusterSelector:
      matchLabels:
        env: dev
    correctDrift:
      enabled: false
```

## Understanding Modified Status

When Fleet detects drift, the bundle deployment shows `Modified` status. The `modifiedStatus` field provides details:

```bash
# Get detailed modified status
kubectl get bundledeployment <bundledeployment-name> -n <cluster-namespace> -o json
# Look under status.modifiedStatus
```

This shows output like:
```json
{
  "modifiedStatus": [
    {
      "apiVersion": "apps/v1",
      "kind": "Deployment",
      "name": "my-app",
      "namespace": "my-app",
      "patch": "{\"spec\":{\"replicas\":5}}"
    }
  ]
}
```

## Handling Drift in Shared Clusters

In clusters where multiple teams deploy resources, enable drift correction only for resources your GitRepo owns:

```yaml
# gitrepo-shared-cluster.yaml
spec:
  correctDrift:
    enabled: true
    # Avoid --force unless you need it; it may recreate resources during rollback
    force: false
  # Keep resources if this GitRepo is later removed
  keepResources: true
```

## Drift Detection for Immutable Fields

Some Kubernetes fields are immutable after creation (like Job selectors). If drift correction hits an immutable field, the BundleDeployment status will show the apply error:

```bash
# Inspect the BundleDeployment status and conditions
kubectl describe bundledeployment <bundledeployment-name> -n <cluster-namespace>
```

## Setting Up Alerts for Drift

Integrate drift detection with your monitoring stack by watching for BundleDeployments that enter the `Modified` state:

```bash
# Script to report all clusters with drift
kubectl get bundledeployments -A \
  -o jsonpath='{range .items[?(@.status.display.state=="Modified")]}{.metadata.namespace}{" "}{.metadata.name}{"\n"}{end}'
```

## Conclusion

Fleet's drift detection provides continuous compliance enforcement for your Kubernetes clusters. By detecting and, when configured, correcting deviations from the Git-defined desired state, you maintain consistency across your entire fleet without manual intervention. Configure drift detection aggressively for production environments where changes outside of GitOps workflows should not persist, and more permissively for development environments where experimentation is expected. Combined with proper monitoring and alerting, drift detection gives you confidence that your clusters always reflect what is defined in Git.
