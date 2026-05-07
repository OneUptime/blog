# How to Delete a Cluster in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Cluster Management

Description: A guide to safely deleting clusters from Rancher, covering imported clusters, provisioned clusters, and proper cleanup procedures.

Deleting a cluster in Rancher is a straightforward operation, but understanding what happens behind the scenes is important to avoid unintended consequences. This guide covers how to properly delete different types of clusters from Rancher and what cleanup steps to take.

## Understanding Cluster Deletion Behavior

The behavior of cluster deletion depends on how the cluster was created:

- **Rancher-provisioned clusters on existing custom nodes**: Rancher removes the cluster and its Kubernetes components, but the underlying machines remain
- **Rancher-provisioned clusters on infrastructure-provider nodes**: Rancher removes the cluster and can also clean up the nodes and infrastructure it provisioned
- **Imported clusters**: Rancher removes its agents from the cluster but does not delete the cluster itself
- **Hosted clusters** (EKS, GKE, AKS provisioned by Rancher): Rancher asks the cloud provider to delete the managed cluster

## Prerequisites

- Administrative access to the Rancher UI
- `kubectl` access to both the Rancher management cluster and the target cluster (for manual cleanup)
- Understanding of which workloads are running on the cluster

## Step 1: Pre-Deletion Checklist

Before deleting any cluster, complete this checklist:

```plaintext
Pre-Deletion Checklist
======================
[ ] Confirm no critical workloads are running on the cluster
[ ] Back up any important data and configurations
[ ] Notify teams that use the cluster
[ ] Document the cluster configuration for potential recreation
[ ] Export any persistent data from the cluster
[ ] Verify you are deleting the correct cluster
```

### Back Up Important Data

Export cluster resources you might need later:

```bash
# Export common built-in workload and service resources

kubectl get all -A -o yaml > cluster-resources-backup.yaml

# Export configmaps and secrets
kubectl get configmaps -A -o yaml > configmaps-backup.yaml
kubectl get secrets -A -o yaml > secrets-backup.yaml

# Export PVCs
kubectl get pvc -A -o yaml > pvcs-backup.yaml
```

## Step 2: Delete the Cluster from the Rancher UI

### For Any Cluster Type

1. Log in to the Rancher UI
2. Go to **Cluster Management**
3. Find the cluster you want to delete
4. Click the three-dot menu on the right side of the cluster row
5. Select **Delete**
6. Confirm the deletion when prompted

Follow the confirmation prompt in the UI to complete the deletion.

### What Happens Next

For **imported clusters**:

- Rancher removes the cluster from its management
- Rancher agents are removed from the cluster
- The Kubernetes cluster itself continues to run independently
- Workloads on the cluster are not affected

For **Rancher-provisioned clusters on existing custom nodes**:

- Rancher removes the cluster from management
- Kubernetes components are torn down
- The underlying VMs or bare-metal machines are not deleted automatically

For **Rancher-provisioned clusters on infrastructure-provider nodes**:

- Rancher removes the cluster from management
- The nodes and infrastructure resources that Rancher provisioned may also be deleted
- Kubernetes components are torn down

For **hosted provider clusters** (EKS, GKE, AKS provisioned by Rancher):

- Rancher sends a delete request to the cloud provider
- The cloud provider tears down the managed control plane and worker nodes
- Load balancer, network, and storage cleanup depends on the provider and should be verified separately

## Step 3: Verify Deletion

### Check Rancher

Confirm the cluster no longer appears in **Cluster Management**.

Check for any lingering resources in the management cluster:

```bash
kubectl get clusters.management.cattle.io
kubectl get clusters.provisioning.cattle.io -A
```

### Check Cloud Resources (for hosted clusters)

For EKS:

```bash
aws eks list-clusters --region <REGION>
```

For GKE:

```bash
gcloud container clusters list --project <PROJECT_ID>
```

For AKS:

```bash
az aks list --resource-group <RESOURCE_GROUP>
```

## Step 4: Clean Up Imported Clusters (If Needed)

When you delete an imported cluster from Rancher, the agents should be removed automatically. If they are not, Rancher documents the `user-cluster.sh` cleanup script for removing Rancher components manually:

```bash
# Switch to the formerly imported cluster's kubeconfig context first

curl -LO https://raw.githubusercontent.com/rancher/rancher/refs/heads/main/cleanup/user-cluster.sh
chmod +x user-cluster.sh

# Preview the cleanup first
./user-cluster.sh rancher/rancher-agent:<RANCHER_VERSION> -dry-run

# Run the cleanup with the rancher-agent version that matches your Rancher server
./user-cluster.sh rancher/rancher-agent:<RANCHER_VERSION>
```

## Step 5: Clean Up Management Cluster Resources

After deleting a cluster, some resources may remain in the Rancher management cluster:

```bash
# Check for orphaned cluster resources
kubectl get clusters.management.cattle.io

# Check for leftover Rancher project resources
kubectl get projects.management.cattle.io -A

# Inspect Rancher-created management namespaces and backing namespaces
kubectl get namespaces | grep "^c-"

# Only after verifying a namespace belongs to the deleted cluster and is no longer needed
kubectl delete namespace <RANCHER_MANAGEMENT_NAMESPACE>
```

## Step 6: Clean Up DNS and Load Balancers

If the deleted cluster had:

- DNS records pointing to cluster ingresses, remove them
- External load balancers, verify they were deleted
- Firewall rules specific to the cluster, clean them up

## Deleting Multiple Clusters

If you need to delete multiple clusters, repeat the same deletion workflow for each cluster and verify the result after each removal:

1. Go to **Cluster Management**
2. Delete one cluster using the steps above
3. Confirm it has been removed before proceeding to the next cluster

## Force Deleting a Stuck Cluster

Sometimes a cluster gets stuck in a `Removing` state. To force the deletion:

```bash
# Find the cluster resource
kubectl get clusters.management.cattle.io

# Remove the finalizer from the Rancher cluster ID to allow deletion
kubectl patch clusters.management.cattle.io <CLUSTER_ID> \
  -p '{"metadata":{"finalizers":[]}}' \
  --type=merge
```

Note: Force deletion skips cleanup steps, so you may need to manually clean up infrastructure resources.

## Recovering from Accidental Deletion

If you accidentally deleted a cluster:

- **Imported cluster**: The cluster itself still exists. Re-import it into Rancher by following the import process again.
- **Provisioned cluster**: If the infrastructure was not yet deleted, you may be able to re-import it. Otherwise, you need to recreate the cluster and restore from backups.
- **Hosted cluster**: Check the cloud provider's deletion documentation immediately. In most cases, you need to recreate the cluster and restore from backups.

## Best Practices

- Use cloud-side safeguards against accidental deletion where available, and restrict cloud IAM permissions for cluster deletion
- Always back up cluster data before deletion
- Use Rancher's RBAC to restrict who can delete clusters
- Tag clusters with metadata indicating their purpose and criticality
- Maintain an inventory of clusters and their configurations
- Test cluster recreation procedures regularly

## Conclusion

Deleting a cluster in Rancher is simple through the UI, but understanding the implications for different cluster types is essential. Imported clusters continue to exist after removal from Rancher, while Rancher-launched and hosted clusters remove Kubernetes and may also remove infrastructure depending on how the cluster was created. Always back up data, verify cleanup of infrastructure resources, and remove any orphaned DNS records or load balancers after deletion.
