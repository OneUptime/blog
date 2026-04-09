# How to Migrate Ceph from One Datacenter to Another

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Migration, Multi-Site, Datacenter

Description: Learn how to migrate a Ceph cluster from one datacenter to another using RGW multi-site sync, RBD mirroring, and CephFS snapshot replication.

---

Datacenter migrations require moving all storage data with minimal downtime. Ceph's built-in replication and mirroring features enable live data migration between datacenters before the final cutover.

## Pre-Migration Preparation

Inventory all data in the source cluster:

```bash
ceph df detail
ceph osd dump | grep pool
radosgw-admin bucket list --uid=<all-users>
rbd ls -p mypool
```

Ensure the destination cluster is deployed and healthy:

```bash
# On destination cluster
ceph -s
ceph health
```

## Migrating Object Storage with RGW Multi-Site

Set up multi-site sync between source and destination:

```bash
# Source cluster - list existing realms
radosgw-admin realm list

# Destination cluster - pull realm from source
radosgw-admin realm pull \
  --url=http://source-rgw.example.com \
  --access-key=<key> \
  --secret=<secret>

# Destination cluster - create secondary zone
radosgw-admin zone create \
  --rgw-zonegroup=main \
  --rgw-zone=dc2-zone \
  --endpoints=http://dest-rgw.example.com:80 \
  --access-key=<key> \
  --secret=<secret>

radosgw-admin period update --commit
```

Monitor sync progress:

```bash
radosgw-admin sync status
```

## Migrating Block Volumes with RBD Mirroring

Enable RBD mirroring between clusters:

```bash
# Source cluster
rbd mirror pool enable mypool image
rbd mirror image enable mypool/myvolume snapshot

# Destination cluster - add peer
rbd mirror pool peer add mypool \
  client.rbd-mirror@source-cluster

# Watch mirroring status
rbd mirror image status mypool/myvolume
```

## Migrating CephFS Data

For CephFS, use snapshot-based replication:

```bash
# Create snapshot on source
mkdir /mnt/cephfs/.snap/migration-snap

# Sync to destination using rsync
rsync -avz --checksum \
  /mnt/source-cephfs/.snap/migration-snap/ \
  /mnt/dest-cephfs/
```

For ongoing incremental syncs, use the CephFS mirroring daemon:

```bash
ceph fs snapshot mirror enable myfs
ceph fs snapshot mirror peer_add myfs client.mirror@dest-cluster /dest-cephfs
```

## Cutover Sequence

```text
Day 1-N: Run parallel sync (multi-site, RBD mirror)
Day N:   1. Put application in maintenance mode
          2. Wait for sync to complete (check sync lag)
          3. Promote destination RGW zone to master
          4. Stop RBD mirroring, promote destination images
          5. Update DNS / load balancer endpoints
          6. Bring application back online
          7. Verify data integrity
```

Promote the destination zone:

```bash
radosgw-admin zone modify --rgw-zone=dc2-zone --master --default
radosgw-admin zonegroup modify --rgw-zonegroup=main --master --default
radosgw-admin period update --commit
```

Promote RBD mirror image:

```bash
rbd mirror image promote mypool/myvolume
```

## Verifying Migration

```bash
# Compare object counts
radosgw-admin bucket stats --bucket=mybucket  # source
radosgw-admin bucket stats --bucket=mybucket  # destination

# Compare RBD sizes
rbd info mypool/myvolume
```

## Summary

Migrating Ceph between datacenters is best accomplished using native replication features: RGW multi-site for objects, RBD mirroring for block volumes, and rsync for CephFS. Running parallel sync for days before cutover minimizes the maintenance window to only the final promotion and DNS update steps.
