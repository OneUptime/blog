# How to Migrate Kubernetes State Between Clusters on Talos

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Cluster Migration, etcd, State Management, Disaster Recovery

Description: Learn how to migrate Kubernetes state including resources, secrets, and configurations between Talos Linux clusters using multiple approaches.

---

There are plenty of scenarios where you need to move Kubernetes state from one Talos Linux cluster to another. Maybe you are upgrading your hardware, splitting a large cluster into smaller ones, consolidating multiple clusters, or performing a disaster recovery operation. Whatever the reason, migrating cluster state requires careful handling to avoid data loss and minimize downtime. This guide covers several approaches for moving Kubernetes state between Talos Linux clusters.

## What Counts as "Kubernetes State"

Before we start moving things around, let us define what we mean by cluster state:

- **API Resources**: Deployments, Services, ConfigMaps, Secrets, CRDs, and their instances
- **etcd Data**: The backing store for all Kubernetes API objects
- **Persistent Volume Data**: Application data stored in PVs
- **RBAC Configuration**: Roles, ClusterRoles, bindings
- **Namespace Structures**: The organizational layout of your cluster
- **Custom Resource Definitions**: And their associated custom resources
- **Certificates and Secrets**: TLS certs, service account tokens, etc.

Different migration approaches handle these differently. Let us look at the main options.

## Approach 1: Velero Backup and Restore

Velero is the most common tool for migrating Kubernetes resources between clusters. It backs up API objects and optionally persistent volume data.

### Set Up Velero on Both Clusters

```bash
# Install Velero CLI
brew install velero  # macOS
# or
wget https://github.com/vmware-tanzu/velero/releases/download/v1.14.0/velero-v1.14.0-linux-amd64.tar.gz

# Install Velero on the source cluster
# Using S3-compatible storage (MinIO, AWS S3, etc.)
velero install \
  --provider aws \
  --bucket velero-backups \
  --secret-file ./credentials \
  --backup-location-config \
    region=us-east-1,s3ForcePathStyle=true,s3Url=http://minio.storage:9000 \
  --use-node-agent \
  --default-volumes-to-fs-backup
```

### Create a Backup on the Source Cluster

```bash
# Back up everything
velero backup create full-state \
  --include-namespaces '*' \
  --default-volumes-to-fs-backup \
  --wait

# Or back up specific namespaces
velero backup create app-state \
  --include-namespaces production,staging \
  --default-volumes-to-fs-backup \
  --wait

# Verify the backup
velero backup describe full-state --details
velero backup logs full-state
```

### Restore on the Target Cluster

```bash
# Install Velero on the target cluster with the same storage config
velero install \
  --provider aws \
  --bucket velero-backups \
  --secret-file ./credentials \
  --backup-location-config \
    region=us-east-1,s3ForcePathStyle=true,s3Url=http://minio.storage:9000 \
  --use-node-agent \
  --default-volumes-to-fs-backup

# Restore everything
velero restore create full-restore \
  --from-backup full-state \
  --wait

# Or restore selectively
velero restore create selective-restore \
  --from-backup full-state \
  --include-namespaces production \
  --exclude-resources nodes,events,endpoints \
  --wait

# Check restore status
velero restore describe full-restore --details
```

Velero handles most API resources well, but there are some caveats. Resources with cluster-specific references (like service account tokens or node-specific PVs) may need manual fixup. Also, Velero does not migrate CRDs automatically unless you include them explicitly.

## Approach 2: etcd Snapshot and Restore

For a complete state migration including all resources exactly as they were, you can snapshot etcd from the source cluster and restore it on the target. This is a lower-level approach that gives you an exact copy of the cluster state.

### Snapshot etcd on the Source Talos Cluster

```bash
# Use talosctl to create an etcd snapshot
talosctl etcd snapshot ./etcd-snapshot.db \
  --nodes 10.0.0.10

# Verify the snapshot
# You will need etcdctl for verification
ETCDCTL_API=3 etcdctl snapshot status ./etcd-snapshot.db --write-out=table
```

### Restore on the Target Cluster

Restoring an etcd snapshot on a Talos cluster requires bootstrapping a new cluster from the snapshot. This is a complete cluster replacement, not a selective restore.

```bash
# On the target cluster, before bootstrapping:
# 1. Generate new configs with matching cluster settings
talosctl gen secrets -o new-secrets.yaml
talosctl gen config migrated-cluster https://new-vip:6443 \
  --with-secrets new-secrets.yaml \
  --output-dir _out

# 2. Apply configs to nodes
talosctl apply-config --insecure --nodes 10.1.0.10 --file _out/controlplane.yaml

# 3. Bootstrap from the etcd snapshot
talosctl bootstrap --recover-from=./etcd-snapshot.db \
  --nodes 10.1.0.10
```

Note: When restoring an etcd snapshot to a new cluster, the certificates and service accounts from the old cluster are embedded in the snapshot. This means the new cluster needs to use the same CA certificates, or you will need to regenerate service account tokens after the restore.

## Approach 3: GitOps-Based State Migration

If you are using GitOps (ArgoCD or Flux), your cluster state is already defined in Git. Migration becomes a matter of pointing the GitOps controller at the new cluster.

```bash
# On the new Talos cluster, install ArgoCD
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Configure ArgoCD to use the same Git repository
cat <<EOF | kubectl apply -f -
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: cluster-apps
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/cluster-config.git
    targetRevision: HEAD
    path: apps
  destination:
    server: https://kubernetes.default.svc
    namespace: default
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
EOF
```

The advantage of GitOps-based migration is that it is the most repeatable and least error-prone approach. The downside is that it does not handle stateful data - you still need to migrate persistent volumes separately.

## Approach 4: Resource Export and Import

For selective migration of specific resources, you can export them as YAML and apply them to the new cluster:

```bash
# Export specific resources from the source cluster
# Remove cluster-specific metadata during export
kubectl get deployments -n production -o yaml | \
  yq 'del(.items[].metadata.resourceVersion,
       .items[].metadata.uid,
       .items[].metadata.creationTimestamp,
       .items[].metadata.generation,
       .items[].status)' > deployments.yaml

kubectl get services -n production -o yaml | \
  yq 'del(.items[].metadata.resourceVersion,
       .items[].metadata.uid,
       .items[].metadata.creationTimestamp,
       .items[].spec.clusterIP,
       .items[].spec.clusterIPs,
       .items[].status)' > services.yaml

kubectl get configmaps -n production -o yaml | \
  yq 'del(.items[].metadata.resourceVersion,
       .items[].metadata.uid,
       .items[].metadata.creationTimestamp)' > configmaps.yaml

# Apply to the new cluster
kubectl apply -f deployments.yaml
kubectl apply -f services.yaml
kubectl apply -f configmaps.yaml
```

You can automate this with a script:

```bash
#!/bin/bash
# migrate-namespace.sh
# Usage: ./migrate-namespace.sh <namespace> <source-kubeconfig> <target-kubeconfig>

NAMESPACE=$1
SOURCE_KUBECONFIG=$2
TARGET_KUBECONFIG=$3

RESOURCES="deployments statefulsets daemonsets services configmaps secrets ingresses"

for resource in $RESOURCES; do
  echo "Migrating $resource from $NAMESPACE..."

  # Export from source
  KUBECONFIG=$SOURCE_KUBECONFIG kubectl get $resource -n $NAMESPACE -o yaml | \
    yq 'del(.items[].metadata.resourceVersion,
         .items[].metadata.uid,
         .items[].metadata.creationTimestamp,
         .items[].metadata.generation,
         .items[].status)' > "/tmp/${resource}.yaml"

  # Import to target
  KUBECONFIG=$TARGET_KUBECONFIG kubectl apply -f "/tmp/${resource}.yaml"
done
```

## Migrating Persistent Volume Data

Regardless of which approach you use for API resources, persistent volume data needs separate handling:

```bash
# Option 1: Use Velero with filesystem backup (covered above)

# Option 2: Use rsync between clusters
# Create a temporary pod on both clusters with the PVC mounted
# Source cluster:
kubectl run rsync-source -n production \
  --image=instrumentisto/rsync-ssh \
  --overrides='{"spec":{"containers":[{"name":"rsync","image":"instrumentisto/rsync-ssh","command":["sleep","infinity"],"volumeMounts":[{"name":"data","mountPath":"/data"}]}],"volumes":[{"name":"data","persistentVolumeClaim":{"claimName":"my-pvc"}}]}}'

# Target cluster: similar setup
# Then rsync between them through a port-forward or direct connection

# Option 3: Application-level backup and restore
# For databases, use native tools
kubectl exec -n production postgres-0 -- pg_dump -U admin mydb > mydb.sql
# On the new cluster
kubectl cp mydb.sql production/postgres-0:/tmp/mydb.sql
kubectl exec -n production postgres-0 -- psql -U admin mydb -f /tmp/mydb.sql
```

## Validating the Migration

After migrating state, run thorough validation:

```bash
# Compare resource counts between clusters
echo "Source cluster:"
KUBECONFIG=./source-kubeconfig kubectl get all --all-namespaces | wc -l

echo "Target cluster:"
KUBECONFIG=./target-kubeconfig kubectl get all --all-namespaces | wc -l

# Verify specific workloads
kubectl get pods --all-namespaces | grep -v Running | grep -v Completed

# Check that services resolve correctly
kubectl run dns-test --rm -it --image=busybox --restart=Never -- \
  nslookup my-service.production.svc.cluster.local

# Verify persistent data integrity
kubectl exec -n production my-stateful-app-0 -- ls -la /data/
```

## Wrapping Up

Migrating Kubernetes state between Talos Linux clusters can be done at multiple levels of granularity. Velero is the best general-purpose tool for most migrations. etcd snapshots give you an exact copy but are all-or-nothing. GitOps is the cleanest approach if your state is already in Git. And manual export/import works well for targeted migrations of specific resources. In practice, most migrations use a combination of these approaches - GitOps for the application definitions, Velero or rsync for persistent data, and manual steps for anything that does not fit neatly into those categories. Whatever approach you choose, always validate thoroughly and keep the source cluster available for rollback until you are confident the migration is complete.
