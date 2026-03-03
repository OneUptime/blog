# How to Migrate Storage Between Nodes on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Storage Migration, Persistent Volume, DevOps

Description: A practical guide to migrating persistent storage between nodes in a Talos Linux Kubernetes cluster without data loss.

---

Running stateful workloads on Kubernetes means dealing with persistent storage. At some point, you will need to move data from one node to another. Maybe you are decommissioning hardware, rebalancing workloads, or recovering from a node failure. On Talos Linux, this process has its own nuances because the operating system is immutable and API-driven, which means you cannot simply SSH into a node and copy files around.

This guide walks through the practical steps for migrating storage between nodes on a Talos Linux cluster.

## Why Storage Migration Matters

In traditional Linux environments, you might move data by mounting a disk on a new server and running rsync. Talos Linux does not give you that option. There is no SSH access, no shell, and the root filesystem is read-only. Every administrative action goes through the Talos API or Kubernetes itself.

Storage migration becomes necessary in several scenarios. You might need to drain a node for maintenance, redistribute storage after scaling your cluster, or move workloads closer to specific hardware. Whatever the reason, you need a strategy that works within the constraints of Talos Linux.

## Understanding Storage Options on Talos Linux

Before migrating anything, you should understand what kind of storage you are working with. Talos Linux supports several storage backends through Kubernetes CSI drivers.

Local storage uses disks attached directly to a node. This is the most common setup for high-performance workloads. Tools like OpenEBS LocalPV or TopoLVM manage local volumes.

Network-attached storage uses solutions like Rook-Ceph, Longhorn, or NFS. These abstractions make migration easier because the storage is not tied to a specific node.

Cloud provider volumes, such as AWS EBS or GCP Persistent Disks, have their own migration mechanisms built into the cloud platform.

```yaml
# Example: Check what storage classes are available
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: local-path
provisioner: rancher.io/local-path
reclaimPolicy: Delete
volumeBindingMode: WaitForFirstConsumer
```

## Migrating Network-Attached Storage

If your cluster uses a distributed storage solution like Rook-Ceph or Longhorn, migration is relatively straightforward. The storage system handles replication internally, so moving a workload to a different node does not require manual data movement.

Start by cordoning the source node to prevent new pods from being scheduled there.

```bash
# Cordon the node to prevent new scheduling
kubectl cordon talos-worker-01

# Drain the node, evicting pods gracefully
kubectl drain talos-worker-01 --ignore-daemonsets --delete-emptydir-data
```

When you drain the node, Kubernetes will reschedule your pods on other available nodes. If the storage backend supports it, the PersistentVolumeClaim will be satisfied on the new node automatically.

For Longhorn specifically, you can verify that replicas are healthy before draining.

```bash
# Check Longhorn volume replicas
kubectl -n longhorn-system get replicas.longhorn.io \
  -o custom-columns=NAME:.metadata.name,NODE:.spec.nodeID,STATE:.status.currentState
```

## Migrating Local Storage

Local storage migration is harder because the data physically lives on a specific disk on a specific node. You cannot just reschedule the pod and expect the volume to follow.

### Method 1: Application-Level Backup and Restore

The cleanest approach is to use application-level tools. For databases, this means taking a logical backup, moving the workload, and restoring.

```bash
# Example: Backup a PostgreSQL database before migration
kubectl exec -n database pg-primary-0 -- pg_dump -U postgres mydb > backup.sql

# After the pod is rescheduled to the new node, restore
kubectl cp backup.sql database/pg-primary-0:/tmp/backup.sql
kubectl exec -n database pg-primary-0 -- psql -U postgres mydb -f /tmp/backup.sql
```

### Method 2: Volume Snapshot and Clone

If your CSI driver supports volume snapshots, you can snapshot the volume, create a new PVC from the snapshot, and bind it to a pod on the target node.

```yaml
# Step 1: Create a VolumeSnapshot
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: data-snapshot
  namespace: default
spec:
  volumeSnapshotClassName: csi-snapshot-class
  source:
    persistentVolumeClaimName: data-pvc
---
# Step 2: Create a new PVC from the snapshot
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: data-pvc-migrated
  namespace: default
spec:
  storageClassName: local-path
  dataSource:
    name: data-snapshot
    kind: VolumeSnapshot
    apiGroup: snapshot.storage.k8s.io
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 50Gi
```

### Method 3: Using a Temporary Pod for Data Copy

When snapshots are not available, you can use a temporary pod that mounts both the old and new volumes, then copies data between them.

```yaml
# Temporary pod for data migration
apiVersion: v1
kind: Pod
metadata:
  name: storage-migrator
  namespace: default
spec:
  # Use node affinity to schedule on the source node first
  containers:
  - name: migrator
    image: alpine:latest
    command: ["sleep", "infinity"]
    volumeMounts:
    - name: source-data
      mountPath: /source
    - name: dest-data
      mountPath: /dest
  volumes:
  - name: source-data
    persistentVolumeClaim:
      claimName: old-data-pvc
  - name: dest-data
    persistentVolumeClaim:
      claimName: new-data-pvc
```

Once the pod is running, copy the data.

```bash
# Execute the copy inside the migration pod
kubectl exec storage-migrator -- sh -c "cp -av /source/* /dest/"

# Verify the data integrity
kubectl exec storage-migrator -- sh -c "du -sh /source /dest"
```

## Handling Talos-Specific Considerations

Since Talos Linux does not allow direct disk access through a shell, you need to use the `talosctl` command to inspect disk state on nodes.

```bash
# List disks on a Talos node
talosctl -n 10.0.0.11 disks

# Check disk usage on a specific node
talosctl -n 10.0.0.11 usage /var

# View mount points
talosctl -n 10.0.0.11 mounts
```

If you need to wipe a disk on the source node after migration (for example, to repurpose it), you can use the Talos machine configuration to manage disk layout.

```yaml
# Talos machine config snippet for disk management
machine:
  disks:
    - device: /dev/sdb
      partitions:
        - mountpoint: /var/mnt/storage
          size: 0  # Use entire disk
```

Apply the configuration change using talosctl.

```bash
# Apply updated machine config
talosctl -n 10.0.0.11 apply-config --file worker-config.yaml
```

## Verifying the Migration

After migrating storage, you should verify that everything is working correctly on the target node.

```bash
# Check that the PVC is bound
kubectl get pvc -n default

# Verify the pod is running on the correct node
kubectl get pods -o wide -n default

# Check the volume contents from within the running pod
kubectl exec -n default my-app-0 -- ls -la /data

# Run any application-specific health checks
kubectl exec -n default my-app-0 -- my-app --health-check
```

## Tips for Smooth Migrations

Plan ahead. If you know you will need to migrate storage regularly, choose a storage backend that supports replication and automatic failover. Longhorn and Rook-Ceph both handle this well.

Always take backups before starting a migration. Even if you are confident in the process, having a backup means you can recover from unexpected failures.

Test the migration process in a staging environment first. Run through the entire procedure with test data before touching production workloads.

Use pod disruption budgets to control how many pods can be unavailable during the migration. This is especially important for stateful workloads.

```yaml
# Pod Disruption Budget for controlled migrations
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: app-pdb
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app: my-stateful-app
```

## Conclusion

Storage migration on Talos Linux requires planning because you cannot fall back on traditional sysadmin techniques. The API-driven nature of Talos means every operation must go through either the Talos API or Kubernetes. By choosing the right storage backend and following a structured migration process, you can move data between nodes safely and efficiently. Whether you use volume snapshots, application-level backups, or temporary migration pods, the key is to verify your data at every step and always have a rollback plan.
