# How to Handle Tenant Offboarding in Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Multi-Tenancy, Offboarding, Lifecycle Management

Description: Learn how to safely offboard tenants from a multi-tenant Flux CD environment, including resource cleanup, data retention, and graceful removal.

---

Tenant offboarding is the process of removing a tenant and their resources from a multi-tenant Flux CD cluster. This must be done carefully to avoid data loss, ensure proper cleanup, and prevent orphaned resources. This guide walks through a safe offboarding process.

## Offboarding Considerations

Before removing a tenant, consider:

- Does the tenant have persistent data that needs to be backed up?
- Are other tenants depending on any of this tenant's services?
- Are there any DNS records or external integrations that need to be updated?
- What is the retention policy for the tenant's logs and audit data?

## Step 1: Notify the Tenant and Freeze Deployments

Before offboarding, suspend the tenant's Flux reconciliation to prevent new deployments while you prepare for removal.

```bash
# Suspend all Kustomizations in the tenant namespace
flux suspend kustomization team-alpha-apps -n team-alpha

# Suspend source reconciliation
flux suspend source git team-alpha-apps -n team-alpha

# Verify suspension
flux get all -n team-alpha
```

Alternatively, suspend via GitOps by adding the `suspend` field.

```yaml
# tenants/team-alpha/sync.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: team-alpha-apps
  namespace: team-alpha
spec:
  # Suspend reconciliation during offboarding
  suspend: true
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: team-alpha-apps
  prune: true
  serviceAccountName: team-alpha
  targetNamespace: team-alpha
```

## Step 2: Back Up Tenant Data

Export any persistent data before removing the tenant.

```bash
# List all persistent volume claims in the tenant namespace
kubectl get pvc -n team-alpha

# Create snapshots of persistent volumes if supported
kubectl get volumesnapshot -n team-alpha

# Export all tenant resources for backup
kubectl get all -n team-alpha -o yaml > team-alpha-backup.yaml

# Export ConfigMaps and Secrets
kubectl get configmaps -n team-alpha -o yaml > team-alpha-configmaps.yaml
kubectl get secrets -n team-alpha -o yaml > team-alpha-secrets.yaml
```

## Step 3: Check for Cross-Tenant Dependencies

Verify that no other tenants depend on this tenant's services.

```bash
# Check network policies that reference the tenant namespace
kubectl get networkpolicies --all-namespaces -o yaml | grep team-alpha

# Check for services referencing the tenant
kubectl get endpoints --all-namespaces | grep team-alpha

# Check for cross-namespace references to tenant sources
flux get all --all-namespaces | grep team-alpha
```

## Step 4: Remove the Tenant's Flux Resources

Remove the tenant configuration from the fleet repository. If `prune: true` is set on the platform admin's Kustomization, Flux will automatically clean up.

Remove the tenant directory from Git.

```bash
# Remove the tenant configuration from the fleet repo
git rm -r tenants/base/team-alpha/
git rm -r tenants/production/team-alpha/

# Remove the tenant registration from the cluster config
# (if it's a separate file)
git rm clusters/my-cluster/tenants/team-alpha.yaml

git commit -m "Offboard tenant team-alpha"
git push
```

## Step 5: Verify Flux Pruning

After pushing the removal, Flux will prune the tenant's resources.

```bash
# Wait for reconciliation
flux reconcile kustomization tenants -n flux-system

# Verify the tenant's Flux resources are being removed
flux get all -n team-alpha

# Check events for pruning activity
kubectl get events -n flux-system --field-selector reason=Progressing
```

## Step 6: Manual Cleanup if Needed

If `prune: true` is not set, or if some resources were not managed by Flux, clean up manually.

```bash
# Delete remaining Flux resources in the tenant namespace
kubectl delete kustomizations.kustomize.toolkit.fluxcd.io --all -n team-alpha
kubectl delete gitrepositories.source.toolkit.fluxcd.io --all -n team-alpha
kubectl delete helmreleases.helm.toolkit.fluxcd.io --all -n team-alpha
kubectl delete helmrepositories.source.toolkit.fluxcd.io --all -n team-alpha

# Delete notification resources
kubectl delete alerts.notification.toolkit.fluxcd.io --all -n team-alpha
kubectl delete providers.notification.toolkit.fluxcd.io --all -n team-alpha

# Delete remaining workloads
kubectl delete deployments --all -n team-alpha
kubectl delete statefulsets --all -n team-alpha
kubectl delete services --all -n team-alpha
kubectl delete ingresses --all -n team-alpha
```

## Step 7: Remove the Namespace

After all resources are cleaned up, delete the namespace. This removes everything that remains inside it.

```bash
# Delete the tenant namespace
kubectl delete namespace team-alpha

# If the namespace gets stuck in Terminating state, check for finalizers
kubectl get namespace team-alpha -o json | jq '.spec.finalizers'
```

If the namespace is stuck terminating, there may be resources with finalizers that need to be resolved first.

```bash
# Find resources with finalizers in a stuck namespace
kubectl api-resources --verbs=list --namespaced -o name | \
  xargs -n 1 kubectl get --show-kind --ignore-not-found -n team-alpha
```

## Step 8: Clean Up Cluster-Level Resources

Remove any cluster-scoped resources associated with the tenant.

```bash
# Remove ClusterRoleBindings for the tenant
kubectl delete clusterrolebinding team-alpha-reconciler --ignore-not-found

# Remove any cluster-level resources labeled for the tenant
kubectl delete clusterrole -l toolkit.fluxcd.io/tenant=team-alpha --ignore-not-found
```

## Step 9: Revoke Git Access

Remove the tenant's access to the fleet repository and their own repositories if managed by the platform.

```bash
# Remove deploy keys from the tenant repository
# (via GitHub API or web interface)

# Remove the tenant's credentials from the cluster
kubectl delete secret team-alpha-git-auth -n team-alpha --ignore-not-found
```

## Step 10: Update Documentation and Records

After offboarding, update your records.

```bash
# Verify the tenant namespace no longer exists
kubectl get namespace team-alpha

# Verify no resources are left
kubectl get all --all-namespaces -l toolkit.fluxcd.io/tenant=team-alpha

# Archive the tenant's Git repository if needed
# (via GitHub API or web interface)
```

## Automated Offboarding Script

Combine the steps into a script for consistent offboarding.

```bash
#!/bin/bash
# offboard-tenant.sh - Remove a tenant from the Flux CD cluster
# Usage: ./offboard-tenant.sh <tenant-name>

TENANT=$1
FLEET_DIR="tenants"

if [ -z "$TENANT" ]; then
  echo "Usage: $0 <tenant-name>"
  exit 1
fi

echo "Starting offboarding for tenant: ${TENANT}"

# Step 1: Suspend reconciliation
echo "Suspending Flux reconciliation..."
flux suspend kustomization --all -n "${TENANT}" 2>/dev/null

# Step 2: Backup resources
echo "Backing up tenant resources..."
kubectl get all -n "${TENANT}" -o yaml > "${TENANT}-backup-$(date +%Y%m%d).yaml"

# Step 3: Remove from Git
echo "Removing tenant from fleet repository..."
git rm -r "${FLEET_DIR}/base/${TENANT}/" 2>/dev/null
git rm -r "${FLEET_DIR}/production/${TENANT}/" 2>/dev/null
git commit -m "Offboard tenant ${TENANT}"
git push

echo "Waiting for Flux to reconcile..."
sleep 30
flux reconcile kustomization tenants -n flux-system

# Step 4: Verify cleanup
echo "Verifying cleanup..."
kubectl get namespace "${TENANT}" 2>/dev/null
if [ $? -eq 0 ]; then
  echo "Namespace still exists. Manual cleanup may be needed."
else
  echo "Tenant ${TENANT} successfully offboarded."
fi
```

## Summary

Tenant offboarding in Flux CD requires a systematic approach: suspend reconciliation, back up data, check for dependencies, remove the configuration from Git, let Flux prune resources, and clean up any remaining artifacts. Always back up tenant data before removal and verify that no cross-tenant dependencies exist. An automated offboarding script ensures consistency and reduces the risk of missed steps.
