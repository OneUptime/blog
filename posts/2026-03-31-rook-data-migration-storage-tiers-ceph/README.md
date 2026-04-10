# How to Implement Data Migration Between Storage Tiers in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Migration, Storage Tier, Pool, Hot, Cold, Warm, Data Movement

Description: Migrate data between Ceph storage tiers - moving objects from hot NVMe pools to warm SSD or cold HDD pools - using RGW lifecycle rules, rbd migration, and manual techniques.

---

## Storage Tier Migration Approaches

Ceph supports several data migration paths between tiers:

1. **RGW S3 lifecycle transitions**: Automated object transitions between storage classes
2. **RBD live migration**: Move RBD images between pools without downtime
3. **Manual copy**: Use `rados cp` or `rbd export/import` for one-time migrations
4. **Cache tiering promotion/demotion**: Automatic caching (deprecated - use with caution)

## Object Migration with RGW Lifecycle Transitions

The most common migration path is RGW lifecycle rules transitioning objects to different storage classes:

```bash
# Verify storage classes are configured in the zone
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  radosgw-admin zone get | python3 -c \
  "import json,sys; z=json.load(sys.stdin); [print(pc) for pg in z['placement_pools'] for pc in pg.get('val', {}).get('storage_classes', {}).keys()]"
```

Apply lifecycle transitions to move older objects automatically:

```bash
aws s3api put-bucket-lifecycle-configuration \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph.svc \
  --bucket application-data \
  --lifecycle-configuration '{
    "Rules": [{
      "ID": "hot-to-warm-to-cold",
      "Status": "Enabled",
      "Filter": {"Prefix": ""},
      "Transitions": [
        {"Days": 30, "StorageClass": "WARM"},
        {"Days": 180, "StorageClass": "COLD"}
      ]
    }]
  }'
```

## RBD Live Migration Between Pools

Migrate an RBD image from one pool to another without unmounting it:

```bash
# Start live migration from hot pool to warm pool
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  rbd migration prepare \
  hot-nvme-pool/my-volume \
  warm-ssd-pool/my-volume

# Check migration status
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  rbd status warm-ssd-pool/my-volume

# Execute the migration (data copy happens here)
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  rbd migration execute warm-ssd-pool/my-volume

# Monitor migration progress
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  rbd status warm-ssd-pool/my-volume

# Commit migration (removes the old image reference)
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  rbd migration commit warm-ssd-pool/my-volume
```

The application continues to use the volume via the CSI driver during migration. Data is transparently read from the source and written to the destination.

## Migrating Kubernetes PVCs Between StorageClasses

To move a PVC from a hot to a warm StorageClass:

```bash
# 1. Create a VolumeSnapshot of the current PVC
kubectl apply -f - <<EOF
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: pre-migration-snapshot
  namespace: production
spec:
  volumeSnapshotClassName: csi-rbdplugin-snapclass
  source:
    persistentVolumeClaimName: my-app-data
EOF

# 2. Create a new PVC from the snapshot using the warm StorageClass
kubectl apply -f - <<EOF
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: my-app-data-warm
  namespace: production
spec:
  storageClassName: rook-ceph-warm
  dataSource:
    name: pre-migration-snapshot
    kind: VolumeSnapshot
    apiGroup: snapshot.storage.k8s.io
  accessModes: [ReadWriteOnce]
  resources:
    requests:
      storage: 200Gi
EOF
```

## Bulk Object Migration with Rclone

Use Rclone to migrate existing objects between pools/buckets:

```bash
# Configure rclone with Ceph RGW endpoints
rclone config create ceph-hot s3 \
  provider Ceph \
  endpoint http://rook-ceph-rgw-hot-store:80 \
  access_key_id HOT_ACCESS_KEY \
  secret_access_key HOT_SECRET_KEY

rclone config create ceph-cold s3 \
  provider Ceph \
  endpoint http://rook-ceph-rgw-cold-store:80 \
  access_key_id COLD_ACCESS_KEY \
  secret_access_key COLD_SECRET_KEY

# Migrate data between stores
rclone sync ceph-hot:my-bucket ceph-cold:archive-bucket \
  --progress \
  --transfers 16 \
  --checkers 32
```

## Summary

Ceph provides multiple tier migration strategies: RGW lifecycle rules for automated object transitions (best for ongoing management), RBD live migration for zero-downtime block volume moves between pools, snapshot-based PVC re-provisioning for Kubernetes workload migrations, and Rclone for bulk object migration between clusters or stores. Choosing the right approach depends on whether the data is objects or block volumes, whether downtime is acceptable, and whether the migration is one-time or ongoing.
