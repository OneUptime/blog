# How to Use Ceph Block Storage (RBD)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, RBD, Block Storage, Kubernetes, Storage, DevOps, Distributed Systems

Description: A hands-on guide to Ceph RADOS Block Device (RBD) covering pool creation, image management, snapshots, cloning, and Kubernetes CSI integration for persistent volumes.

---

> Block storage in distributed systems is not about having a disk--it is about having a disk that survives node failures, scales horizontally, and integrates seamlessly with your orchestration layer. Ceph RBD delivers exactly that.

## Understanding RBD Concepts

Ceph RADOS Block Device (RBD) provides block-level storage that appears as a regular disk to clients but is backed by Ceph's distributed object storage layer. Here is what makes it powerful:

**RADOS (Reliable Autonomic Distributed Object Store):** The foundation of Ceph. Every block written to an RBD image is split into objects and distributed across OSDs (Object Storage Daemons) using the CRUSH algorithm.

**Images:** Virtual block devices stored as objects in RADOS. An image can be thin-provisioned (allocates space on write) or thick-provisioned.

**Pools:** Logical partitions for storing images. Each pool has its own replication rules, placement groups, and CRUSH rules.

**Snapshots:** Point-in-time, read-only copies of an image. Snapshots are copy-on-write, so they consume minimal space until the original data changes.

**Clones:** Writable copies of a snapshot. Clones share unchanged blocks with their parent, enabling fast provisioning of new volumes from golden images.

## Creating and Managing Pools

Before creating images, you need a pool. Pools define how data is replicated and where it lands in your cluster.

```bash
# Create a replicated pool with 3 copies
# Pool name: rbd-pool
# Placement groups: 128 (adjust based on cluster size)
ceph osd pool create rbd-pool 128 128 replicated

# Initialize the pool for RBD use
# This creates necessary metadata objects
rbd pool init rbd-pool

# Set the application tag so Ceph knows this pool holds RBD data
ceph osd pool application enable rbd-pool rbd

# Verify pool creation
ceph osd pool ls detail | grep rbd-pool
```

For production clusters, tune placement groups based on cluster size:

```bash
# Calculate recommended PG count
# Formula: (OSDs * 100) / replicas / pools
# For a 12 OSD cluster with 3x replication and 2 pools:
# (12 * 100) / 3 / 2 = 200, round to nearest power of 2 = 256

# Adjust PG count for an existing pool
ceph osd pool set rbd-pool pg_num 256
ceph osd pool set rbd-pool pgp_num 256
```

## Creating RBD Images

Images are the actual block devices your applications will use.

```bash
# Create a 100GB thin-provisioned image
# --size is in megabytes by default
rbd create rbd-pool/myvolume --size 102400

# Create with explicit size unit (GB)
rbd create rbd-pool/database-vol --size 500G

# Create with specific features enabled
# layering: required for snapshots and clones
# exclusive-lock: prevents multiple clients mounting the same image
# object-map: speeds up diff and export operations
# fast-diff: enables fast snapshot comparison
rbd create rbd-pool/production-db \
    --size 1T \
    --image-feature layering,exclusive-lock,object-map,fast-diff

# List all images in a pool
rbd ls rbd-pool

# Get detailed info about an image
rbd info rbd-pool/production-db

# Resize an image (only growing is safe while mounted)
rbd resize rbd-pool/myvolume --size 200G

# Delete an image (cannot be undone)
rbd rm rbd-pool/myvolume
```

## Mapping RBD Images to Clients

Once created, map the image to a client node to use it as a block device.

```bash
# Map an image to /dev/rbdX
# This creates a block device on the local system
sudo rbd map rbd-pool/production-db

# The command outputs the device path, typically /dev/rbd0
# Verify the mapping
rbd showmapped

# Output example:
# id  pool      namespace  image          snap  device
# 0   rbd-pool             production-db  -     /dev/rbd0

# Create a filesystem on the device
sudo mkfs.xfs /dev/rbd0

# Mount the filesystem
sudo mkdir -p /mnt/ceph-volume
sudo mount /dev/rbd0 /mnt/ceph-volume

# Verify mount
df -h /mnt/ceph-volume

# When done, unmount and unmap cleanly
sudo umount /mnt/ceph-volume
sudo rbd unmap /dev/rbd0
```

For persistent mounts across reboots, use rbdmap:

```bash
# Add to /etc/ceph/rbdmap
# Format: poolname/imagename id=admin,keyring=/etc/ceph/ceph.client.admin.keyring
echo "rbd-pool/production-db id=admin,keyring=/etc/ceph/ceph.client.admin.keyring" | sudo tee -a /etc/ceph/rbdmap

# Enable rbdmap service
sudo systemctl enable rbdmap.service

# Add fstab entry for automatic mounting
# Note: use _netdev option to ensure network is up before mount
echo "/dev/rbd/rbd-pool/production-db /mnt/ceph-volume xfs noauto,_netdev 0 0" | sudo tee -a /etc/fstab
```

## Working with Snapshots

Snapshots enable point-in-time recovery and are the foundation for cloning.

```bash
# Create a snapshot of an image
rbd snap create rbd-pool/production-db@backup-2026-01-27

# List all snapshots of an image
rbd snap ls rbd-pool/production-db

# Protect a snapshot before creating clones
# Protected snapshots cannot be deleted
rbd snap protect rbd-pool/production-db@backup-2026-01-27

# Roll back an image to a snapshot (destructive - overwrites current data)
# WARNING: The image must not be mapped/mounted
rbd snap rollback rbd-pool/production-db@backup-2026-01-27

# Remove protection when you no longer need clones
rbd snap unprotect rbd-pool/production-db@backup-2026-01-27

# Delete a snapshot
rbd snap rm rbd-pool/production-db@backup-2026-01-27

# Purge all snapshots of an image
rbd snap purge rbd-pool/production-db
```

Automated snapshot management with a cron job:

```bash
#!/bin/bash
# /usr/local/bin/rbd-snapshot.sh
# Create daily snapshots and retain last 7 days

POOL="rbd-pool"
IMAGE="production-db"
DATE=$(date +%Y-%m-%d)
RETENTION_DAYS=7

# Create today's snapshot
rbd snap create ${POOL}/${IMAGE}@daily-${DATE}

# List and delete snapshots older than retention period
for snap in $(rbd snap ls ${POOL}/${IMAGE} --format json | jq -r '.[].name' | grep "^daily-"); do
    snap_date=$(echo $snap | sed 's/daily-//')
    snap_epoch=$(date -d "$snap_date" +%s 2>/dev/null || echo 0)
    cutoff_epoch=$(date -d "-${RETENTION_DAYS} days" +%s)

    if [ $snap_epoch -lt $cutoff_epoch ] && [ $snap_epoch -ne 0 ]; then
        echo "Deleting old snapshot: ${snap}"
        rbd snap rm ${POOL}/${IMAGE}@${snap}
    fi
done
```

## Cloning Images for Fast Provisioning

Clones are writable copies that share unchanged data with a parent snapshot, making them ideal for rapid deployment of pre-configured volumes.

```bash
# First, create and protect a snapshot
rbd snap create rbd-pool/golden-image@v1.0
rbd snap protect rbd-pool/golden-image@v1.0

# Clone the snapshot to create a new writable image
rbd clone rbd-pool/golden-image@v1.0 rbd-pool/app-server-01

# Clone to a different pool if needed
rbd clone rbd-pool/golden-image@v1.0 prod-pool/app-server-02

# List children of a snapshot (all clones)
rbd children rbd-pool/golden-image@v1.0

# Flatten a clone to disconnect it from the parent
# This copies all parent data, making the clone independent
# Useful before deleting the parent snapshot
rbd flatten rbd-pool/app-server-01

# After flattening, verify the clone has no parent
rbd info rbd-pool/app-server-01 | grep parent
```

Clone workflow for database provisioning:

```bash
# 1. Create a golden database image with schema and base data
rbd create rbd-pool/db-golden --size 100G
# ... mount, configure database, populate schema ...

# 2. Create a snapshot for cloning
rbd snap create rbd-pool/db-golden@schema-v2.5
rbd snap protect rbd-pool/db-golden@schema-v2.5

# 3. Spin up dev/test databases in seconds
for env in dev staging qa; do
    rbd clone rbd-pool/db-golden@schema-v2.5 rbd-pool/db-${env}
    echo "Created db-${env}"
done

# 4. Each clone is independent and writable
# Changes in one clone do not affect others or the parent
```

## Kubernetes CSI Integration

The Ceph CSI driver enables Kubernetes to dynamically provision RBD volumes as PersistentVolumes.

First, deploy the Ceph CSI driver (if not using Rook):

```yaml
# ceph-csi-config.yaml
# ConfigMap containing Ceph cluster information
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: ceph-csi-config
  namespace: ceph-csi
data:
  config.json: |-
    [
      {
        "clusterID": "your-cluster-fsid",
        "monitors": [
          "10.0.0.1:6789",
          "10.0.0.2:6789",
          "10.0.0.3:6789"
        ]
      }
    ]
```

Create a Secret with Ceph credentials:

```yaml
# ceph-csi-secret.yaml
---
apiVersion: v1
kind: Secret
metadata:
  name: ceph-csi-secret
  namespace: ceph-csi
stringData:
  # User ID without 'client.' prefix
  userID: kubernetes
  # Get this from: ceph auth get-key client.kubernetes
  userKey: AQB0example123456789==
```

Define a StorageClass for dynamic provisioning:

```yaml
# ceph-rbd-storageclass.yaml
---
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: ceph-rbd
  annotations:
    storageclass.kubernetes.io/is-default-class: "true"
provisioner: rbd.csi.ceph.com
parameters:
  # Must match clusterID in ConfigMap
  clusterID: your-cluster-fsid

  # Pool where images will be created
  pool: kubernetes-rbd

  # RBD image features (comma-separated)
  imageFeatures: layering,exclusive-lock,object-map,fast-diff

  # Secret containing Ceph credentials
  csi.storage.k8s.io/provisioner-secret-name: ceph-csi-secret
  csi.storage.k8s.io/provisioner-secret-namespace: ceph-csi
  csi.storage.k8s.io/controller-expand-secret-name: ceph-csi-secret
  csi.storage.k8s.io/controller-expand-secret-namespace: ceph-csi
  csi.storage.k8s.io/node-stage-secret-name: ceph-csi-secret
  csi.storage.k8s.io/node-stage-secret-namespace: ceph-csi

  # Filesystem type for the volume
  csi.storage.k8s.io/fstype: xfs

# Reclaim policy: Delete removes RBD image when PVC is deleted
# Use Retain for production databases
reclaimPolicy: Delete

# Allow volume expansion
allowVolumeExpansion: true

# Volume binding mode
volumeBindingMode: Immediate
```

Create a PersistentVolumeClaim:

```yaml
# database-pvc.yaml
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-data
  namespace: databases
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: ceph-rbd
  resources:
    requests:
      storage: 100Gi
```

Use the PVC in a StatefulSet:

```yaml
# postgres-statefulset.yaml
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: databases
spec:
  serviceName: postgres
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
        - name: postgres
          image: postgres:15
          ports:
            - containerPort: 5432
          env:
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: postgres-secret
                  key: password
            - name: PGDATA
              value: /var/lib/postgresql/data/pgdata
          volumeMounts:
            - name: data
              mountPath: /var/lib/postgresql/data
          resources:
            requests:
              memory: "1Gi"
              cpu: "500m"
            limits:
              memory: "2Gi"
              cpu: "1000m"
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        accessModes:
          - ReadWriteOnce
        storageClassName: ceph-rbd
        resources:
          requests:
            storage: 100Gi
```

Verify the provisioning:

```bash
# Check PVC status
kubectl get pvc -n databases

# Verify the RBD image was created
rbd ls kubernetes-rbd

# Get details about the provisioned image
rbd info kubernetes-rbd/csi-vol-<pv-uuid>
```

## Best Practices Summary

**Pool Design:**
- Use separate pools for different workload tiers (fast SSD pool for databases, HDD pool for backups)
- Size placement groups appropriately--too few causes hotspots, too many wastes memory
- Enable compression for pools storing compressible data

**Image Management:**
- Always enable layering feature for snapshot and clone support
- Use exclusive-lock for images mounted by single clients to prevent corruption
- Thin provision by default; thick provision only when consistent performance is critical

**Performance Tuning:**
- Place OSDs on NVMe/SSD for latency-sensitive workloads
- Use dedicated RocksDB/WAL devices to separate metadata from data I/O
- Set appropriate object size (default 4MB works for most cases; larger for sequential workloads)

**Snapshots and Clones:**
- Protect snapshots before cloning
- Flatten clones before deleting parent snapshots
- Implement automated snapshot retention policies
- Test restore procedures regularly

**Kubernetes Integration:**
- Use StorageClasses with appropriate reclaim policies (Retain for production data)
- Enable volume expansion in StorageClass
- Use VolumeSnapshotClass for CSI-based snapshots
- Monitor PVC and PV status through your observability platform

**Monitoring:**
- Track OSD latency, IOPS, and throughput per pool
- Monitor PG states (active+clean is healthy)
- Alert on slow requests and blocked operations
- Watch for nearfull and full OSDs

Ceph RBD brings enterprise-grade block storage to your infrastructure without vendor lock-in. Combined with Kubernetes CSI integration, it provides a robust foundation for stateful workloads that scales from a few terabytes to petabytes.

For comprehensive monitoring of your Ceph clusters and Kubernetes workloads, [OneUptime](https://oneuptime.com) provides unified observability with metrics, logs, and traces--helping you catch storage issues before they impact your applications.
