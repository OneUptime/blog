# How to Migrate from Other CSI Drivers to Longhorn

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Longhorn, Kubernetes, Storage, Migration, CSI

Description: A step-by-step guide for migrating existing Kubernetes persistent volumes from other CSI drivers to Longhorn without data loss.

## Introduction

Migrating storage from one CSI driver to another in Kubernetes requires careful planning since you cannot simply change a PVC's storage class. The migration process involves copying data from existing volumes to new Longhorn-backed volumes. This guide covers the safest methods for migrating from drivers like `local-path`, `nfs`, `rook-ceph`, or cloud provider drivers to Longhorn.

## Prerequisites

- Longhorn installed and configured
- Access to both the source CSI driver and Longhorn
- Sufficient cluster resources for migration (temporary doubled storage)
- Backup of all data before migration

## Migration Strategies

| Strategy | Best For | Downtime |
|----------|----------|----------|
| Scale-down + rsync | Stateless apps, small volumes | Minutes |
| Backup-Restore | Large volumes, complex apps | Minutes to hours |
| StatefulSet rebuild | StatefulSets | Controlled downtime |
| Volume clone | Cloud providers | Minimal |

## Pre-Migration Steps

```bash
# 1. List all PVCs and their storage classes

kubectl get pvc --all-namespaces \
  -o custom-columns="NAMESPACE:.metadata.namespace,NAME:.metadata.name,CLASS:.spec.storageClassName,SIZE:.spec.resources.requests.storage,STATUS:.status.phase"

# 2. Identify PVCs using the old storage class
kubectl get pvc --all-namespaces \
  -o json | \
  jq -r '.items[] | select(.spec.storageClassName != "longhorn") | "\(.metadata.namespace)/\(.metadata.name) → \(.spec.storageClassName)"'

# 3. Check current data usage in volumes
kubectl get pvc --all-namespaces -o name | while read pvc; do
  namespace=$(echo $pvc | cut -d/ -f1 | sed 's/.*\///')
  name=$(echo $pvc | cut -d/ -f2)
  echo "$namespace/$name"
done
```

## Method 1: Scale-Down and rsync Migration

This is the most straightforward method for most workloads.

### Step 1: Create the New Longhorn PVC

```yaml
# new-longhorn-pvc.yaml - New PVC using Longhorn as the target
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: app-data-longhorn
  namespace: default
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: longhorn    # New storage class
  resources:
    requests:
      storage: 10Gi             # Same or larger than original
```

```bash
kubectl apply -f new-longhorn-pvc.yaml
```

### Step 2: Scale Down the Application

```bash
# Scale down the application to stop writes
kubectl scale deployment my-app --replicas=0 -n default

# For StatefulSets
kubectl scale statefulset my-statefulset --replicas=0 -n default

# Wait for pods to terminate
kubectl get pods -n default -w
```

### Step 3: Create a Migration Pod

Create a temporary pod with both PVCs mounted:

```yaml
# migration-pod.yaml - Pod to copy data between PVCs
apiVersion: v1
kind: Pod
metadata:
  name: data-migrator
  namespace: default
spec:
  restartPolicy: Never
  containers:
    - name: migrator
      image: alpine:latest
      command:
        - sh
        - -c
        - |
          echo "Starting data migration..."
          # Copy all data from source to destination
          cp -av /source/. /destination/
          echo "Migration complete! Files copied:"
          ls -la /destination/
      volumeMounts:
        - name: source
          mountPath: /source
        - name: destination
          mountPath: /destination
  volumes:
    - name: source
      persistentVolumeClaim:
        claimName: app-data           # Old PVC
    - name: destination
      persistentVolumeClaim:
        claimName: app-data-longhorn  # New Longhorn PVC
```

```bash
kubectl apply -f migration-pod.yaml

# Monitor migration progress
kubectl logs -n default data-migrator -f

# Wait for completion
kubectl wait --for=jsonpath='{.status.phase}'=Succeeded pod/data-migrator -n default --timeout=600s
```

### Step 4: Update the Application to Use the New PVC

Update your deployment to reference the new PVC:

```yaml
# updated-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: 1
  template:
    spec:
      volumes:
        - name: data
          persistentVolumeClaim:
            # Changed to the new Longhorn PVC
            claimName: app-data-longhorn
```

```bash
kubectl apply -f updated-deployment.yaml

# Scale back up
kubectl scale deployment my-app --replicas=1

# Verify the app is running correctly
kubectl get pods -n default
kubectl logs -n default -l app=my-app
```

### Step 5: Clean Up

After verifying the migration was successful:

```bash
# Delete the migration pod
kubectl delete pod data-migrator -n default

# After thorough testing, delete the old PVC
# WARNING: Only do this after confirming data is in the new PVC
kubectl delete pvc app-data -n default
```

## Method 2: StatefulSet Migration

For StatefulSets, migration requires creating new PVCs with the naming convention that StatefulSet expects:

```bash
# StatefulSet PVCs follow the pattern: <template-name>-<statefulset-name>-<ordinal>
# e.g., data-my-app-0, data-my-app-1, data-my-app-2

# Step 1: Scale down the StatefulSet
kubectl scale statefulset my-app --replicas=0

# Step 2: For each replica, migrate data
for i in 0 1 2; do
  # Create new Longhorn PVC with the expected name
  cat << EOF | kubectl apply -f -
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: data-my-app-longhorn-$i
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: longhorn
  resources:
    requests:
      storage: 20Gi
EOF

  # Create migration pod for this replica
  cat << EOF | kubectl apply -f -
apiVersion: v1
kind: Pod
metadata:
  name: migrate-replica-$i
spec:
  restartPolicy: Never
  containers:
    - name: migrator
      image: alpine
      command: ["sh", "-c", "cp -av /src/. /dst/ && echo done"]
      volumeMounts:
        - name: src
          mountPath: /src
        - name: dst
          mountPath: /dst
  volumes:
    - name: src
      persistentVolumeClaim:
        claimName: data-my-app-$i
    - name: dst
      persistentVolumeClaim:
        claimName: data-my-app-longhorn-$i
EOF

  kubectl wait --for=jsonpath='{.status.phase}'=Succeeded pod/migrate-replica-$i --timeout=600s
  echo "Replica $i migrated"
done
```

## Verifying Migration Success

```bash
# Spot-check data integrity
kubectl exec -it <new-pod-name> -- ls -la /data/
kubectl exec -it <new-pod-name> -- du -sh /data/

# Compare file counts
kubectl exec data-migrator -- find /source -type f | wc -l
kubectl exec data-migrator -- find /destination -type f | wc -l
```

## Conclusion

Migrating from other CSI drivers to Longhorn requires planned downtime for each application, but the process is safe and predictable. The scale-down and copy approach ensures data integrity since no writes happen during the migration. After migrating, take advantage of Longhorn's features like automated backups, snapshots, and replication to improve your storage reliability beyond what the previous driver offered.
