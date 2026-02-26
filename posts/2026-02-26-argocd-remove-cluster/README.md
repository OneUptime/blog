# How to Remove a Cluster from ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Multi-Cluster, DevOps

Description: Learn how to safely remove a Kubernetes cluster from ArgoCD, covering application migration, resource cleanup, credential removal, and handling edge cases like disconnected clusters.

---

Removing a cluster from ArgoCD seems straightforward, but doing it incorrectly can leave orphaned applications, dangling resources, or broken references. Whether you are decommissioning a cluster, migrating to a new one, or cleaning up your ArgoCD configuration, this guide covers the safe approach to cluster removal.

## Before You Remove: Pre-Flight Checks

Before removing a cluster, understand what is deployed to it:

```bash
# List all applications targeting this cluster
argocd app list --dest-server https://cluster-to-remove.k8s.example.com

# Or by cluster name
argocd app list --dest-name my-cluster

# Get the count
argocd app list --dest-server https://cluster-to-remove.k8s.example.com -o json | \
  jq '. | length'
```

If applications still target this cluster, you need to handle them first.

## Step 1: Migrate or Delete Applications

### Option A: Migrate Applications to Another Cluster

Update the destination in each application:

```bash
# Update application destination
argocd app set myapp \
  --dest-server https://new-cluster.k8s.example.com

# Sync to deploy to the new cluster
argocd app sync myapp
```

For ApplicationSets, update the generator to exclude the old cluster:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: my-appset
spec:
  generators:
    - clusters:
        selector:
          matchLabels:
            environment: production
          matchExpressions:
            # Exclude the cluster being removed
            - key: cluster-name
              operator: NotIn
              values:
                - old-cluster
```

### Option B: Delete Applications

Delete applications that should no longer exist:

```bash
# Delete application AND its resources in the cluster
argocd app delete myapp

# Delete application but KEEP resources in the cluster
argocd app delete myapp --cascade=false
```

The `--cascade=false` flag is important if you want the deployed resources to keep running in the cluster even after ArgoCD stops managing them.

### Option C: Bulk Delete

For removing all applications targeting a cluster:

```bash
# Delete all apps targeting the cluster (with confirmation)
argocd app list --dest-server https://cluster-to-remove.k8s.example.com -o name | \
  while read app; do
    echo "Deleting: $app"
    argocd app delete "$app" --cascade=false --yes
  done
```

## Step 2: Remove the Cluster

### Using the CLI

```bash
# Remove by server URL
argocd cluster rm https://cluster-to-remove.k8s.example.com

# Remove by cluster name
argocd cluster rm my-cluster
```

The CLI removes the cluster secret from ArgoCD's namespace and optionally cleans up the service account in the remote cluster.

### Declaratively

If you registered the cluster with a Kubernetes Secret:

```bash
# Find the cluster secret
kubectl get secrets -n argocd \
  -l argocd.argoproj.io/secret-type=cluster \
  -o json | jq -r '.items[] | select(.data.server | @base64d == "https://cluster-to-remove.k8s.example.com") | .metadata.name'

# Delete the secret
kubectl delete secret my-cluster-secret -n argocd
```

If using GitOps to manage ArgoCD itself, remove the cluster secret manifest from your Git repository and let ArgoCD sync the change.

## Step 3: Clean Up the Remote Cluster

When ArgoCD was added via CLI, it created a service account and RBAC in the remote cluster. Clean these up:

```bash
# Delete the service account
kubectl delete serviceaccount argocd-manager -n kube-system --context old-cluster

# Delete the cluster role
kubectl delete clusterrole argocd-manager-role --context old-cluster

# Delete the cluster role binding
kubectl delete clusterrolebinding argocd-manager-role-binding --context old-cluster

# Delete the token secret (Kubernetes 1.24+)
kubectl delete secret argocd-manager-token -n kube-system --context old-cluster
```

If you created a custom namespace for the ArgoCD service account:

```bash
kubectl delete namespace argocd-system --context old-cluster
```

## Handling Disconnected Clusters

Sometimes you need to remove a cluster that ArgoCD can no longer reach (network change, cluster deleted, etc.):

```bash
# ArgoCD might show the cluster as "Unknown" or fail to connect
argocd cluster list
# SERVER                                    STATUS
# https://dead-cluster.k8s.example.com      Unknown

# Remove it anyway - ArgoCD will just delete the secret
argocd cluster rm https://dead-cluster.k8s.example.com

# If the above fails, delete the secret directly
kubectl delete secret -n argocd \
  -l argocd.argoproj.io/secret-type=cluster \
  --field-selector metadata.name=dead-cluster-secret
```

For applications that targeted the disconnected cluster:

```bash
# Force delete applications (skip cluster cleanup since it is unreachable)
argocd app delete myapp --cascade=false --yes
```

## Handling Finalizers

Applications with finalizers may get stuck during deletion if the cluster is unreachable:

```bash
# Check for stuck applications
kubectl get applications -n argocd | grep Deleting

# Remove the finalizer to allow deletion
kubectl patch application myapp -n argocd \
  --type json \
  -p='[{"op": "remove", "path": "/metadata/finalizers"}]'
```

## Verifying Cleanup

After removal, verify everything is clean:

```bash
# Verify cluster is removed
argocd cluster list | grep "cluster-to-remove"

# Verify no applications reference the old cluster
argocd app list --dest-server https://cluster-to-remove.k8s.example.com

# Verify no cluster secrets remain
kubectl get secrets -n argocd \
  -l argocd.argoproj.io/secret-type=cluster \
  -o json | jq '.items[].data.server | @base64d' | grep "cluster-to-remove"

# Check for orphaned ApplicationSets referencing the cluster
kubectl get applicationsets -n argocd -o yaml | grep "cluster-to-remove"
```

## Removing from ApplicationSet Generators

If ApplicationSets use cluster generators, removing the cluster secret automatically stops generating applications for that cluster. But check for explicit references:

```yaml
# This reference in a list generator needs manual removal
generators:
  - list:
      elements:
        - cluster: staging
          url: https://staging.k8s.example.com
        - cluster: old-cluster        # Remove this
          url: https://old.k8s.example.com  # Remove this
```

## Step 4: Update Documentation and Monitoring

Do not forget to clean up related configurations:

- Remove the cluster from monitoring dashboards
- Update any CI/CD pipelines that reference the cluster
- Remove DNS records if applicable
- Revoke any cloud IAM roles specific to this cluster
- Remove VPN or network peering configurations

## Summary

Removing a cluster from ArgoCD requires a methodical approach: first migrate or delete applications targeting the cluster, then remove the cluster registration, clean up RBAC in the remote cluster, and verify no references remain. The most critical decision is whether to cascade-delete resources in the cluster or leave them running. For disconnected clusters, you may need to force-remove applications by patching out finalizers. Always verify the cleanup is complete to avoid orphaned references that could cause confusion later.
