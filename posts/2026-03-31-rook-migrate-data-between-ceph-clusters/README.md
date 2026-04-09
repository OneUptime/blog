# How to Migrate Data Between Ceph Clusters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Migration, Cluster, RBD, CephFS, Disaster Recovery

Description: Learn how to migrate data between two Ceph clusters using RBD mirroring, rbd export/import, and radosgw sync for object storage migrations.

---

## Overview

Migrating data between Ceph clusters is necessary when decommissioning old hardware, upgrading cluster versions with incompatible changes, or moving workloads between on-premises sites. Different storage types (RBD, CephFS, RGW) require different migration strategies. This guide covers the primary approaches for each storage type.

## Migration Strategy by Storage Type

| Storage Type | Recommended Method |
|-------------|-------------------|
| RBD (block) | rbd export/import or RBD mirroring |
| CephFS (file) | rsync via client mount |
| RGW (object) | rclone or radosgw-admin sync |

## Method 1: RBD Export/Import

Best for one-time migrations where brief downtime is acceptable:

```bash
# On source cluster - export RBD image
kubectl exec -it -n rook-ceph deploy/rook-ceph-tools -- \
  rbd export replicapool/my-volume /tmp/my-volume.raw

# Transfer to a shared location (e.g., an NFS mount or S3)
# Then on destination cluster - import
kubectl exec -it -n rook-ceph-new deploy/rook-ceph-tools -- \
  rbd import /tmp/my-volume.raw replicapool/my-volume
```

For large images, use export-diff for incremental transfers:

```bash
# Create a snapshot on source
rbd snap create replicapool/my-volume@snap1

# Export full image
rbd export replicapool/my-volume@snap1 /tmp/base.raw

# Later: export only changes
rbd snap create replicapool/my-volume@snap2
rbd export-diff replicapool/my-volume@snap2 \
  --from-snap snap1 /tmp/diff.raw

# On destination: import base, recreate snap1, then apply diff
rbd import /tmp/base.raw replicapool/my-volume
rbd snap create replicapool/my-volume@snap1
rbd import-diff /tmp/diff.raw replicapool/my-volume
```

## Method 2: RBD Mirroring (Live Migration)

For near-zero downtime, use RBD mirroring between clusters:

```bash
# Enable mirroring on source pool
kubectl exec -it -n rook-ceph deploy/rook-ceph-tools -- \
  rbd mirror pool enable replicapool image

# Enable mirroring on the specific image
rbd mirror image enable replicapool/my-volume snapshot

# On destination cluster - add the source as a peer
rbd mirror pool peer add replicapool \
  client.rbd-mirror@source-cluster \
  --direction rx-only

# Watch mirroring status
rbd mirror image status replicapool/my-volume
```

## Method 3: CephFS Data Migration

For CephFS, mount both file systems and use rsync:

```bash
# Create a pod that mounts both filesystems
```

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: cephfs-migrator
spec:
  containers:
  - name: rsync
    image: alpine
    command: ["/bin/sh", "-c", "apk add rsync && rsync -avz /src/ /dst/ && sleep infinity"]
    volumeMounts:
    - name: source-fs
      mountPath: /src
    - name: dest-fs
      mountPath: /dst
  volumes:
  - name: source-fs
    cephfs:
      monitors:
      - "source-mon1:6789"
      user: admin
      secretRef:
        name: source-ceph-secret
  - name: dest-fs
    cephfs:
      monitors:
      - "dest-mon1:6789"
      user: admin
      secretRef:
        name: dest-ceph-secret
```

## Method 4: RGW Object Storage Migration

```bash
# Using rclone to migrate between RGW clusters
rclone sync \
  :s3,access_key_id=SRC_KEY,secret_access_key=SRC_SECRET,endpoint=http://src-rgw:80:my-bucket \
  :s3,access_key_id=DST_KEY,secret_access_key=DST_SECRET,endpoint=http://dst-rgw:80:my-bucket \
  --transfers=32 \
  --progress

# Alternatively, use RGW sync agent for ongoing replication
kubectl exec -it -n rook-ceph deploy/rook-ceph-tools -- \
  radosgw-admin sync group create \
    --group-id=migration-group \
    --status=enabled
```

## Verifying the Migration

```bash
# For RBD: compare image sizes
rbd info replicapool/my-volume  # on both clusters

# For CephFS: compare file counts and sizes
find /src -type f | wc -l
find /dst -type f | wc -l
du -sh /src /dst

# For RGW: compare object counts
radosgw-admin bucket stats --bucket=my-bucket  # on both clusters
```

## Summary

Data migration between Ceph clusters uses storage-type-specific tools: `rbd export-diff` with incremental snapshots for block volumes, rsync for CephFS, and rclone for RGW object storage. For minimal-downtime block migrations, RBD mirroring provides live replication before the final cutover. Always verify object counts, file checksums, or database integrity after migration before decommissioning the source cluster.
