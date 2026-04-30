# How to Manage Fleet Bundle Lifecycle

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Fleet, GitOps, Rancher, Kubernetes, Bundles

Description: Learn how to manage the complete lifecycle of Fleet bundles, from creation through updates, pausing, and deletion, with best practices for production environments.

## Introduction

Fleet Bundles are the internal deployment units that Fleet creates from your Git repositories. Fleet creates bundles from the paths a GitRepo scans, and a subdirectory with its own `fleet.yaml` defines a separate Bundle. Understanding how bundles are created, updated, and deleted is essential for managing your Fleet deployments reliably.

This guide covers the complete bundle lifecycle: creation, status monitoring, updating, pausing, and cleanup.

## Prerequisites

- Fleet installed and configured
- Existing GitRepo resources
- `kubectl` access to Fleet manager

## Understanding the Bundle Lifecycle

The lifecycle of a Fleet Bundle follows these stages:

1. **Creation**: Fleet discovers a new path in a GitRepo and creates a Bundle
2. **Processing**: Fleet evaluates targets and creates BundleDeployments
3. **Deployment**: Fleet agents on downstream clusters apply the resources
4. **Monitoring**: Fleet continuously checks the deployed state
5. **Update**: A new Git commit triggers a Bundle update
6. **Deletion**: GitRepo deletion triggers Bundle cleanup and, unless `keepResources` is set, deployed resource cleanup

## Viewing Bundle Status

```bash
# List all bundles across all namespaces

kubectl get bundles -A

# List bundles in a specific namespace
kubectl get bundles -n fleet-default

# Get detailed bundle information
kubectl get bundle my-app -n fleet-default -o yaml

# View bundle status summary
kubectl get bundles -n fleet-default \
  -o custom-columns=\
'NAME:.metadata.name,\
READY:.status.summary.ready,\
DESIRED:.status.summary.desiredReady,\
NOT_READY:.status.summary.notReady,\
MODIFIED:.status.summary.modified'
```

### Bundle Status Fields

```bash
# Get the detailed status of a bundle
kubectl get bundle my-app -n fleet-default \
  -o jsonpath='{.status}' | python3 -m json.tool
```

Key status fields:
- `summary.ready`: Number of BundleDeployments where all resources are ready
- `summary.desiredReady`: Number of BundleDeployments that should be ready
- `summary.notReady`: Number of BundleDeployments that were deployed but still have non-ready resources
- `summary.modified`: Number of BundleDeployments where resources were modified outside Git
- `summary.waitApplied`: Number of BundleDeployments that are synced but still waiting to be applied

## Managing BundleDeployments

Each cluster that receives a bundle gets a `BundleDeployment` resource:

```bash
# List all bundle deployments across all namespaces
kubectl get bundledeployments -A

# Filter bundle deployments for a specific bundle
kubectl get bundledeployments -A \
  -l fleet.cattle.io/bundle-name=my-app,fleet.cattle.io/bundle-namespace=fleet-default

# Check a specific bundle deployment from the list above
kubectl describe bundledeployment <bundledeployment-name> -n <cluster-namespace>
```

## Pausing a Bundle

To temporarily stop Fleet from updating bundles created by a GitRepo (for maintenance or testing):

```bash
# Pause updates for bundles created from this GitRepo
kubectl patch gitrepo my-app -n fleet-default \
  --type=merge \
  -p '{"spec":{"paused":true}}'

echo "Bundle updates are now paused"
```

### Resuming a Paused Bundle

```bash
# Resume updates
kubectl patch gitrepo my-app -n fleet-default \
  --type=merge \
  -p '{"spec":{"paused":false}}'

echo "Bundle updates resumed"
```

## Forcing a Bundle Re-Deployment

To force Fleet to re-apply all resources even if no Git changes occurred:

```bash
# Increment forceSyncGeneration to request a fresh redeploy
CURRENT_GEN=$(kubectl get gitrepo my-app -n fleet-default \
  -o jsonpath='{.spec.forceSyncGeneration}')
CURRENT_GEN=${CURRENT_GEN:-0}
NEXT_GEN=$((CURRENT_GEN + 1))

kubectl patch gitrepo my-app -n fleet-default \
  --type=merge \
  -p "{\"spec\":{\"forceSyncGeneration\":${NEXT_GEN}}}"

echo "Requested re-deploy with forceSyncGeneration=${NEXT_GEN}"

# Wait for Fleet to re-sync
kubectl get gitrepo my-app -n fleet-default -w
```

## Deleting Bundles

### Automatic Deletion via GitRepo Removal

When you delete a GitRepo, Fleet automatically removes all associated Bundles and, unless `keepResources` is set, deployed resources:

```bash
# Delete the GitRepo - this triggers bundle and resource cleanup
kubectl delete gitrepo my-app -n fleet-default

# Verify bundles are being removed
kubectl get bundles -n fleet-default -w
```

### Keeping Resources After Bundle Deletion

To delete bundles without removing deployed resources:

```yaml
# gitrepo-keep-resources.yaml
spec:
  # When this GitRepo is deleted, keep the deployed resources
  keepResources: true
```

```bash
# Apply the keepResources setting before deleting
kubectl patch gitrepo my-app -n fleet-default \
  --type=merge \
  -p '{"spec":{"keepResources":true}}'

# Now delete the GitRepo
kubectl delete gitrepo my-app -n fleet-default
# Resources remain on clusters
```

## Bundle Update History

Fleet doesn't maintain a built-in rollback history, but you can track it via Git:

```bash
# View the current commit Fleet is using
kubectl get gitrepo my-app -n fleet-default \
  -o jsonpath='{.status.commit}'

# View the Git log to find previous commits
git -C /path/to/repo log --oneline -20

# Roll back by pinning to a previous commit
kubectl patch gitrepo my-app -n fleet-default \
  --type=merge \
  -p '{"spec":{"revision":"abc1234def5678"}}'
```

## Monitoring Bundle Health in Production

```bash
# One-liner to check overall fleet health
kubectl get bundles -A \
  -o jsonpath='{range .items[*]}{.metadata.namespace}/{.metadata.name}: ready={.status.summary.ready}, desired={.status.summary.desiredReady}{"\n"}{end}'

# Find all bundles where ready does not match desired
kubectl get bundles -A \
  -o custom-columns='NAMESPACE:.metadata.namespace,NAME:.metadata.name,READY:.status.summary.ready,DESIRED:.status.summary.desiredReady' \
  --no-headers | \
  awk '$3 != $4 {print $1 "/" $2 ": ready=" $3 ", desired=" $4}'

# Check recent warning events that may explain bundle failures
kubectl get events -A \
  --field-selector type=Warning \
  --sort-by='.lastTimestamp'
```

## Conclusion

Managing the Fleet bundle lifecycle effectively is key to maintaining a reliable GitOps deployment system. By understanding how bundles are created from GitRepo paths, how they propagate to clusters as BundleDeployments, and how to safely pause, update, and remove them, you can maintain full control over your deployment pipeline. Combine lifecycle management with proper monitoring to ensure your Fleet deployments remain healthy and synchronized with your Git repository at all times.
