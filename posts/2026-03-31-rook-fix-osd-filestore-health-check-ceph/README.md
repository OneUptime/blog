# How to Fix OSD_FILESTORE Health Check in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, OSD, BlueStore, Migration

Description: Learn how to resolve the OSD_FILESTORE health warning in Ceph by migrating OSDs from the deprecated FileStore backend to the modern BlueStore backend.

---

## Understanding OSD_FILESTORE

`OSD_FILESTORE` fires when one or more OSDs are using the FileStore backend instead of BlueStore. FileStore was the original Ceph OSD storage backend, but BlueStore was introduced in Ceph Luminous (12.x) and became the default. FileStore is deprecated and has been removed in recent versions. BlueStore provides better performance, checksumming, compression, and more efficient space usage.

Check current health:

```bash
ceph health detail
```

Example output:

```text
HEALTH_WARN filestore OSDs exist in the cluster
[WRN] OSD_FILESTORE: 4 OSDs are using FileStore
    osd.0 uses filestore
    osd.1 uses filestore
```

## Identifying FileStore OSDs

List all OSDs and their backend types:

```bash
ceph osd metadata | python3 -m json.tool | grep -E '"id"|"osd_objectstore"'
```

Or more concisely:

```bash
for i in $(ceph osd ls); do
  echo -n "osd.$i: "
  ceph osd metadata $i | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('osd_objectstore','unknown'))"
done
```

## Migration Strategy

Migrating from FileStore to BlueStore requires replacing each OSD. You cannot upgrade in-place. The strategy is:

1. Mark the OSD out and wait for data to rebalance
2. Stop and destroy the OSD
3. Wipe the disk
4. Create a new BlueStore OSD on the same disk
5. Let data rebalance back

## Step-by-Step Migration (Single OSD)

```bash
# Step 1: Mark OSD out to trigger data rebalancing
ceph osd out 0
# Wait for recovery to complete
ceph -w | grep -E "backfill|recover"

# Step 2: Stop the OSD
systemctl stop ceph-osd@0

# Step 3: Purge the OSD from the cluster
ceph osd purge 0 --yes-i-really-mean-it

# Step 4: Wipe the disk
wipefs --all /dev/sdX
sgdisk --zap-all /dev/sdX

# Step 5: Create a new BlueStore OSD
ceph-volume lvm create --bluestore --data /dev/sdX
```

## Migrating in Rook-Ceph

In Rook, OSD migration involves removing and recreating OSD deployments:

```bash
# Scale down the target OSD deployment
kubectl -n rook-ceph scale deployment rook-ceph-osd-0 --replicas=0

# Mark the OSD out (via toolbox)
kubectl -n rook-ceph exec -it <toolbox-pod> -- ceph osd out 0

# Wait for recovery
kubectl -n rook-ceph exec -it <toolbox-pod> -- ceph -w

# Purge the OSD from the cluster
kubectl -n rook-ceph exec -it <toolbox-pod> -- ceph osd purge 0 --yes-i-really-mean-it

# Delete the OSD deployment
kubectl -n rook-ceph delete deployment rook-ceph-osd-0

# Wipe the disk so Rook will reprovision it as BlueStore
```

After deletion, Rook detects the unconfigured disk and provisions a new BlueStore OSD automatically.

## Verifying BlueStore After Migration

Confirm the new OSD uses BlueStore:

```bash
ceph osd metadata <new-osd-id> | python3 -m json.tool | grep osd_objectstore
```

Expected output:

```text
"osd_objectstore": "bluestore"
```

## Handling Multiple FileStore OSDs

Migrate one OSD at a time to avoid cluster instability. Always wait for recovery (`active+clean`) between each migration:

```bash
#!/bin/bash
for osd in 0 1 2 3; do
  echo "Migrating osd.$osd..."
  ceph osd out $osd
  # Wait for clean state
  while ! ceph status | grep -q "active+clean"; do sleep 30; done
  # Then perform migration steps for osd.$osd
done
```

## Summary

`OSD_FILESTORE` warns that deprecated FileStore OSDs are still running. Migrate to BlueStore by marking each OSD out, waiting for recovery, purging the OSD, wiping the disk, and reprovisioning as BlueStore. In Rook, scale down the OSD deployment, wait for recovery, and let Rook reprovision the disk. Migrate one OSD at a time and always wait for `active+clean` between migrations.
