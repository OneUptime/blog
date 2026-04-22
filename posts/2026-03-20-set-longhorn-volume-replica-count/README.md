# How to Set Longhorn Volume Replica Count

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Longhorn, Kubernetes, Storage, Replication, Configuration

Description: Learn how to set and adjust the replica count for Longhorn volumes globally, per storage class, and on individual volumes to balance availability and storage efficiency.

## Introduction

The replica count is one of the most important configuration settings for Longhorn volumes. It determines how many copies of the volume data are maintained across different nodes. A higher replica count provides greater fault tolerance but uses more storage. This guide explains how to configure replica counts at all levels.

## Replica Count Recommendations

| Environment | Recommended Replica Count | Reasoning |
|------------|--------------------------|-----------|
| Development | 1 | Saves storage space; data loss acceptable |
| Staging | 2 | Basic redundancy; tolerate 1 node failure |
| Production | 3 | Full HA; tolerate 2 node failures |

## Setting the Global Default Replica Count

The global default applies to all new volumes created without an explicit replica count.

### Via Longhorn UI

1. Open the Longhorn UI
2. Navigate to **Setting** → **General**
3. Find **Default Replica Count**
4. Set the value to `1`, `2`, or `3`
5. Click **Save**

### Via kubectl

```bash
# Set the global default replica count to 3

kubectl patch settings.longhorn.io default-replica-count \
  -n longhorn-system \
  --type merge \
  -p '{"value": "3"}'

# Verify the change
kubectl get settings.longhorn.io default-replica-count -n longhorn-system -o yaml
```

## Setting Replica Count Per StorageClass

Create StorageClasses with different replica counts for different workload tiers:

```yaml
# storageclass-prod.yaml - Production storage with 3 replicas
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: longhorn-prod
provisioner: driver.longhorn.io
allowVolumeExpansion: true
parameters:
  numberOfReplicas: "3"   # High availability
  staleReplicaTimeout: "30"
---
# storageclass-dev.yaml - Development storage with 1 replica
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: longhorn-dev
provisioner: driver.longhorn.io
allowVolumeExpansion: true
parameters:
  numberOfReplicas: "1"   # Single replica for dev/test
  staleReplicaTimeout: "30"
```

```bash
kubectl apply -f storageclass-prod.yaml
kubectl apply -f storageclass-dev.yaml
```

## Setting Replica Count When Creating a PVC

Reference the appropriate StorageClass in your PVC:

```yaml
# pvc-prod.yaml - Production PVC with 3-replica storage
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: prod-database-data
  namespace: production
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: longhorn-prod   # Uses 3 replicas
  resources:
    requests:
      storage: 100Gi
```

```bash
kubectl apply -f pvc-prod.yaml
```

## Changing the Replica Count of an Existing Volume

### Via Longhorn UI

1. Navigate to **Volume**
2. Find the volume you want to modify
3. Click the three-dot menu (⋮)
4. Select **Update Replicas Count**
5. Set the new replica count
6. Click **OK**

If you increase the count, Longhorn will rebuild new replicas. If you decrease the count, Longhorn may keep extra healthy replicas unless Replica Auto Balance or Data Locality causes one to be removed; it will stop rebuilding new replicas until the healthy count falls below the new target.

### Via kubectl - Patch the Longhorn Volume

```bash
# Get the volume name (may differ from PVC name)
kubectl get volumes.longhorn.io -n longhorn-system

# Change replica count from 3 to 2 for an existing volume
kubectl patch volume.longhorn.io <volume-name> \
  -n longhorn-system \
  --type merge \
  -p '{"spec": {"numberOfReplicas": 2}}'
```

### Via the Longhorn API

```bash
# Get the Longhorn API endpoint
LONGHORN_URL="http://longhorn-frontend.longhorn-system.svc.cluster.local/v1"

# Update replica count via the API (useful in scripts)
curl -X POST "${LONGHORN_URL}/volumes/my-volume?action=updateReplicaCount" \
  -H "Content-Type: application/json" \
  -d '{"replicaCount": 2}'
```

## Verifying Replica Count Changes

```bash
# Check the replica count in the volume spec
kubectl get volume.longhorn.io <volume-name> -n longhorn-system \
  -o jsonpath='{.spec.numberOfReplicas}'

# List actual replicas that exist for the volume
kubectl get replicas.longhorn.io -n longhorn-system \
  -l longhornvolume=<volume-name>

# Check the volume's current health
kubectl get volume.longhorn.io <volume-name> -n longhorn-system \
  -o jsonpath='{.status.robustness}'
```

## Monitoring Replica Rebuild Progress

When you increase the replica count, Longhorn must rebuild the new replicas:

```bash
# Watch replica status during rebuild
kubectl get replicas.longhorn.io -n longhorn-system \
  -l longhornvolume=<volume-name> -w

# Check rebuild progress in Longhorn manager logs
kubectl logs -n longhorn-system \
  -l app=longhorn-manager \
  --tail=50 | grep -i rebuild
```

## Bulk Updating Replica Count

To update replica count on multiple volumes at once:

```bash
# Script to update all volumes in longhorn-system to use 3 replicas
for vol in $(kubectl get volumes.longhorn.io -n longhorn-system -o name); do
  kubectl patch "$vol" -n longhorn-system \
    --type merge \
    -p '{"spec": {"numberOfReplicas": 3}}'
  echo "Updated $vol"
done
```

## Understanding Stale Replica Timeout

The `staleReplicaTimeout` StorageClass parameter is copied to new volumes and determines how many minutes after a replica is marked unhealthy before Longhorn considers it unusable for rebuilds and deletes it:

```bash
# Check the StorageClass stale replica timeout (in minutes)
kubectl get storageclass longhorn-prod \
  -o jsonpath='{.parameters.staleReplicaTimeout}'

# Check the stale replica timeout copied to a Longhorn volume
kubectl get volume.longhorn.io <volume-name> -n longhorn-system \
  -o jsonpath='{.spec.staleReplicaTimeout}'
```

## Conclusion

Managing replica counts effectively is key to balancing storage capacity and data durability in Longhorn. Use global defaults to set sensible baselines, StorageClasses to enforce policies per workload tier, and per-volume overrides for exceptional cases. Regularly verify that all volumes have healthy replicas and that the actual replica count matches your specifications, especially after node maintenance or failures.
