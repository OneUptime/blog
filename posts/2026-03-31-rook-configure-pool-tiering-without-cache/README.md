# How to Configure Pool Tiering Without Cache Tiering

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Pool, Tiering, Storage, Kubernetes

Description: Learn how to implement storage tiering in Ceph without using the deprecated cache tiering feature, using device classes and separate pools instead.

---

## Why Avoid Cache Tiering

Ceph's built-in cache tiering feature has been deprecated and is not recommended for production. It introduced significant performance unpredictability, complex failure modes, and difficult-to-debug consistency issues. Modern Ceph deployments use device classes and separate pools to achieve tiering goals without these drawbacks.

## The Modern Tiering Approach

Rather than relying on Ceph to transparently promote/demote data between pools, the modern approach is to:
1. Create separate pools on different device classes
2. Let applications or orchestration layers decide which tier to use
3. Optionally use data lifecycle policies for automated movement

## Step 1 - Create Pools on Different Device Classes

Create a fast NVMe-backed pool:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: tier-fast
  namespace: rook-ceph
spec:
  replicated:
    size: 3
  deviceClass: nvme
  parameters:
    pg_autoscale_mode: "on"
```

Create a capacity HDD pool with erasure coding:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: tier-capacity
  namespace: rook-ceph
spec:
  erasureCoded:
    dataChunks: 6
    codingChunks: 2
  deviceClass: hdd
  parameters:
    pg_autoscale_mode: "on"
    compression_mode: "passive"
```

Create a replicated metadata pool for the erasure-coded pool (required for RBD):

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: tier-capacity-metadata
  namespace: rook-ceph
spec:
  replicated:
    size: 3
  deviceClass: hdd
```

## Step 2 - Assign CRUSH Rules

Ensure each pool uses the correct rule:

```bash
# Verify crush rules exist
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd crush rule ls

# Assign fast rule to tier-fast pool
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool set tier-fast crush_rule replicated_nvme
```

## Step 3 - Expose Pools as StorageClasses

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: ceph-fast
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  pool: tier-fast
reclaimPolicy: Delete
---
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: ceph-capacity
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  pool: tier-capacity-metadata
  dataPool: tier-capacity
reclaimPolicy: Retain
```

## Step 4 - Implement Application-Level Tiering

Use a Kubernetes CronJob to move aged data to the capacity tier:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: data-tier-migration
spec:
  schedule: "0 2 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
          - name: migrator
            image: rclone/rclone:latest
            command:
            - rclone
            - copy
            - /mnt/fast/archive/
            - /mnt/capacity/archive/
            volumeMounts:
            - name: fast-storage
              mountPath: /mnt/fast
            - name: capacity-storage
              mountPath: /mnt/capacity
          volumes:
          - name: fast-storage
            persistentVolumeClaim:
              claimName: fast-data
          - name: capacity-storage
            persistentVolumeClaim:
              claimName: capacity-data
```

## Checking Pool Utilization

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph df
```

## Summary

Modern Ceph tiering avoids the problematic cache tiering feature by using separate pools with device-class-specific CRUSH rules. This approach provides predictable performance, simpler operations, and clearer data placement semantics. Application-level tiering logic or scheduled migration jobs handle data movement between fast and capacity pools based on actual access patterns.
