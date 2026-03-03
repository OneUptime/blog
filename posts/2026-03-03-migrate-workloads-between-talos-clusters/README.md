# How to Migrate Workloads Between Talos Clusters

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Migration, Kubernetes, Workloads, Cluster Management

Description: A practical guide to migrating workloads between Talos Linux clusters with minimal downtime and data loss.

---

There comes a time in every Kubernetes operator's life when you need to move workloads from one cluster to another. Maybe you are upgrading your Talos Linux infrastructure, consolidating clusters, or moving from on-premises to the cloud. Whatever the reason, migrating workloads between Talos clusters requires careful planning and execution. This guide covers the tools, strategies, and step-by-step processes to get it done right.

## Planning Your Migration

Before touching any kubectl command, you need a clear picture of what you are migrating. Start by cataloging your workloads:

```bash
# Get all deployments across namespaces
kubectl get deployments --all-namespaces -o wide

# Get all statefulsets (these require extra care)
kubectl get statefulsets --all-namespaces -o wide

# Get all persistent volume claims
kubectl get pvc --all-namespaces

# Get all custom resources
kubectl api-resources --verbs=list -o name | while read resource; do
    count=$(kubectl get "$resource" --all-namespaces --no-headers 2>/dev/null | wc -l)
    if [ "$count" -gt 0 ]; then
        echo "$resource: $count"
    fi
done
```

Workloads fall into two broad categories: stateless and stateful. Stateless workloads like web servers and API gateways are relatively easy to migrate. Stateful workloads with persistent volumes need much more attention.

## Method 1: Export and Import with kubectl

The simplest approach works well for stateless workloads. Export your resource definitions, clean them up, and apply them to the new cluster.

```bash
#!/bin/bash
# export-namespace.sh
# Exports all resources from a namespace

NAMESPACE=$1
EXPORT_DIR="migration/$NAMESPACE"
mkdir -p "$EXPORT_DIR"

# Define resource types to export
RESOURCES=(
    "deployments"
    "services"
    "configmaps"
    "secrets"
    "ingresses"
    "serviceaccounts"
    "roles"
    "rolebindings"
    "networkpolicies"
    "horizontalpodautoscalers"
)

for resource in "${RESOURCES[@]}"; do
    echo "Exporting $resource from $NAMESPACE"
    kubectl get "$resource" -n "$NAMESPACE" -o yaml > "$EXPORT_DIR/$resource.yaml" 2>/dev/null
done

echo "Export complete for namespace $NAMESPACE"
```

Before applying to the new cluster, you need to clean the exported manifests. Remove cluster-specific metadata that will cause conflicts:

```bash
#!/bin/bash
# clean-manifests.sh
# Strips cluster-specific fields from exported YAML

INPUT_DIR="migration/$1"

for file in "$INPUT_DIR"/*.yaml; do
    echo "Cleaning $file"
    # Use yq to remove cluster-specific fields
    yq eval 'del(.items[].metadata.resourceVersion,
                  .items[].metadata.uid,
                  .items[].metadata.creationTimestamp,
                  .items[].metadata.generation,
                  .items[].metadata.managedFields,
                  .items[].status)' -i "$file"
done
```

Then apply to the destination cluster:

```bash
# Switch to the destination cluster context
kubectl config use-context talos-destination

# Create the namespace first
kubectl create namespace my-app

# Apply all resources
kubectl apply -f migration/my-app/
```

## Method 2: Velero for Full Namespace Migration

Velero makes cluster-to-cluster migration much smoother, especially when persistent volumes are involved. Both clusters need Velero installed and configured to use the same backup storage location.

On the source cluster:

```bash
# Install Velero on the source cluster
velero install \
    --provider aws \
    --plugins velero/velero-plugin-for-aws:v1.8.0 \
    --bucket talos-migration \
    --secret-file ./credentials \
    --backup-storage-location-config region=us-east-1 \
    --use-node-agent

# Create a backup of the namespace you want to migrate
velero backup create migrate-my-app \
    --include-namespaces my-app \
    --snapshot-move-data \
    --wait

# Verify the backup completed
velero backup describe migrate-my-app
```

On the destination Talos cluster:

```bash
# Install Velero with the same storage backend
velero install \
    --provider aws \
    --plugins velero/velero-plugin-for-aws:v1.8.0 \
    --bucket talos-migration \
    --secret-file ./credentials \
    --backup-storage-location-config region=us-east-1 \
    --use-node-agent

# Restore the backup
velero restore create --from-backup migrate-my-app --wait

# Verify the restoration
velero restore describe migrate-my-app-20260303120000
kubectl get all -n my-app
```

## Method 3: GitOps-Driven Migration

If your workloads are managed through GitOps (Flux or ArgoCD), migration becomes primarily about pointing your GitOps tool at the new cluster.

```yaml
# On the new Talos cluster, bootstrap Flux
# flux-system/gotk-sync.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: cluster-config
  namespace: flux-system
spec:
  interval: 1m
  url: https://github.com/myorg/cluster-config
  ref:
    branch: main
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: cluster-apps
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: cluster-config
  path: ./apps/production
  prune: true
```

The main challenge with GitOps migration is handling secrets and stateful data that live outside Git.

## Migrating Persistent Data

Stateful workloads need their data moved separately. Here are several approaches.

Using Restic for PV data migration:

```bash
#!/bin/bash
# migrate-pv-data.sh
# Uses restic to migrate PV data between clusters

PVC_NAME=$1
NAMESPACE=$2
RESTIC_REPO="s3:s3.amazonaws.com/talos-migration-data"

# On the source cluster, create a temporary pod to access the PVC
cat <<MANIFEST | kubectl apply -f -
apiVersion: v1
kind: Pod
metadata:
  name: data-migrator
  namespace: $NAMESPACE
spec:
  containers:
  - name: restic
    image: restic/restic:latest
    command: ["sleep", "infinity"]
    volumeMounts:
    - name: data
      mountPath: /data
    env:
    - name: RESTIC_REPOSITORY
      value: "$RESTIC_REPO"
    - name: RESTIC_PASSWORD
      valueFrom:
        secretKeyRef:
          name: restic-credentials
          key: password
  volumes:
  - name: data
    persistentVolumeClaim:
      claimName: $PVC_NAME
MANIFEST

# Wait for the pod to be ready
kubectl wait --for=condition=ready pod/data-migrator -n "$NAMESPACE" --timeout=120s

# Run the backup
kubectl exec -n "$NAMESPACE" data-migrator -- restic backup /data

# Clean up
kubectl delete pod data-migrator -n "$NAMESPACE"
```

## Handling DNS and Traffic Cutover

The final step in any migration is switching traffic from the old cluster to the new one. A gradual cutover reduces risk:

```bash
# Step 1: Lower DNS TTL well before migration (do this days in advance)
# In your DNS provider, set TTL to 60 seconds

# Step 2: Verify the new cluster is healthy
kubectl --context talos-destination get nodes
kubectl --context talos-destination get pods --all-namespaces | grep -v Running

# Step 3: Update DNS to point to the new cluster's ingress
# This depends on your DNS provider

# Step 4: Monitor traffic on both clusters
kubectl --context talos-source logs -l app=my-app --tail=10
kubectl --context talos-destination logs -l app=my-app --tail=10

# Step 5: Once all traffic has shifted, scale down on the source
kubectl --context talos-source scale deployment my-app --replicas=0 -n my-app
```

## Validating the Migration

After migration, run thorough checks:

```bash
#!/bin/bash
# validate-migration.sh
# Compares resources between source and destination clusters

SOURCE_CTX="talos-source"
DEST_CTX="talos-destination"
NAMESPACE=$1

echo "Comparing resources in namespace: $NAMESPACE"

for resource in deployments services configmaps secrets; do
    source_count=$(kubectl --context "$SOURCE_CTX" get "$resource" -n "$NAMESPACE" --no-headers 2>/dev/null | wc -l)
    dest_count=$(kubectl --context "$DEST_CTX" get "$resource" -n "$NAMESPACE" --no-headers 2>/dev/null | wc -l)

    if [ "$source_count" -eq "$dest_count" ]; then
        echo "OK: $resource count matches ($source_count)"
    else
        echo "MISMATCH: $resource - source: $source_count, destination: $dest_count"
    fi
done

# Check pod health on destination
echo ""
echo "Pod status on destination:"
kubectl --context "$DEST_CTX" get pods -n "$NAMESPACE"
```

## Talos-Specific Considerations

When migrating between Talos clusters, keep these points in mind. Talos Linux uses machine configuration files rather than traditional SSH access, so you cannot simply copy files between nodes. All cluster configuration should be managed through `talosctl` and the Talos API.

If your source cluster uses Talos-specific extensions or system services, make sure the destination cluster has the same extensions installed in its machine configuration. Check the extensions list:

```bash
# On the source cluster
talosctl get extensions --nodes <source-node-ip>

# Make sure the destination cluster matches
talosctl get extensions --nodes <destination-node-ip>
```

## Wrapping Up

Migrating workloads between Talos clusters is manageable when you break it down into clear phases: catalog what you have, choose the right migration tool, handle stateful data carefully, and validate everything before cutting over traffic. Start with a non-critical namespace to build confidence in your process, then tackle production workloads once you have a proven playbook.
