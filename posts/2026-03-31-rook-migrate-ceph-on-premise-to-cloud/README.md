# How to Migrate Ceph from On-Premise to Cloud

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Migration, Cloud, Object Storage

Description: Learn how to migrate Ceph object and block data from an on-premises cluster to a cloud-hosted Ceph or S3-compatible storage service.

---

Moving Ceph data to cloud infrastructure reduces on-premises hardware maintenance while retaining familiar Ceph APIs. The migration approach depends on whether you are moving to another Ceph cluster in the cloud or to a native cloud storage service.

## Assessing Migration Scope

Start by understanding what you are moving:

```bash
ceph df detail
rados df
ceph osd dump | grep pool
```

Categorize data by:
- RBD block volumes
- CephFS filesystems
- RGW object buckets

## Option 1 - RGW Multi-Site Sync to Cloud Ceph

If the destination is another Ceph cluster running in the cloud, use multi-site sync:

```bash
# On on-premises cluster - create system user
radosgw-admin user create --uid=migration-user \
  --display-name="Migration User" --system

# On cloud cluster - pull realm config
radosgw-admin realm pull \
  --url=https://onprem-rgw.example.com \
  --access-key=<key> \
  --secret=<secret>
```

Once synced, switch application endpoints to the cloud RGW.

## Option 2 - S3 Sync to AWS S3 or Compatible

Use s3cmd or rclone to copy objects to AWS S3:

```bash
# Configure rclone with per-remote credentials
# Run 'rclone config' to set up each remote with its own access key and secret
rclone config

# Sync all buckets (credentials are configured per-remote during setup)
rclone sync ceph-s3:mybucket aws-s3:mybucket \
  --transfers=8 \
  --checksum \
  --progress
```

## Option 3 - RBD Volume Migration

Export RBD volumes and import to cloud:

```bash
# On-premises: export
rbd export mypool/myvolume /backup/myvolume.img

# Transfer to cloud storage
aws s3 cp /backup/myvolume.img s3://migration-bucket/myvolume.img

# On cloud cluster: import
aws s3 cp s3://migration-bucket/myvolume.img /tmp/myvolume.img
rbd import /tmp/myvolume.img cloudpool/myvolume
```

For large volumes, use export-diff to transfer only changed blocks:

```bash
rbd snap create mypool/myvolume@snap1
rbd export-diff mypool/myvolume@snap1 /backup/snap1.diff

# Later, transfer delta only
rbd export-diff --from-snap snap1 mypool/myvolume@snap2 /backup/snap1-snap2.diff
```

## CephFS Migration

Use rsync to migrate filesystem data:

```bash
rsync -avz --checksum \
  /mnt/cephfs/ \
  root@cloud-node:/mnt/cloud-cephfs/
```

For large datasets, use parallel rsync workers or the CephFS mirroring daemon (`cephfs-mirror`) for continuous replication:

```bash
# Parallel rsync using multiple workers
rsync -avz --checksum \
  /mnt/cephfs/dir1/ root@cloud-node:/mnt/cloud-cephfs/dir1/ &
rsync -avz --checksum \
  /mnt/cephfs/dir2/ root@cloud-node:/mnt/cloud-cephfs/dir2/ &
wait
```

## Cutover Strategy

To minimize downtime:

1. Sync data (allow hours or days for initial sync)
2. Quiesce application writes
3. Final incremental sync
4. Update application configuration to point to cloud endpoints
5. Resume applications
6. Verify data integrity
7. Decommission on-premises cluster

```bash
# Verify object counts match after migration
radosgw-admin bucket stats --bucket=mybucket
aws s3 ls s3://mybucket --recursive | wc -l
```

## Summary

Migrating Ceph from on-premises to cloud requires choosing the right transfer mechanism for each data type: multi-site sync for RGW objects, rclone for S3 migration, RBD export/import for block volumes, and rsync for CephFS. An incremental sync approach followed by a brief quiesce period minimizes application downtime during cutover.
