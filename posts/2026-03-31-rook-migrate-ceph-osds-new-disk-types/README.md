# How to Migrate Ceph OSDs to New Disk Types

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, OSD, Migration, Storage

Description: Learn how to migrate Ceph OSDs from spinning HDDs to SSDs or NVMe by adding new OSDs, rebalancing data, and safely decommissioning old devices.

---

As storage technology evolves, you may want to migrate from HDDs to SSDs or NVMe for better performance. Ceph supports live disk migration by incrementally replacing OSDs without data loss.

## Planning the Migration

Understand your current OSD layout:

```bash
ceph osd tree
ceph device ls
ceph osd df | sort -k 10 -rn
```

Check the disk types currently in use:

```bash
for osd in $(ceph osd ls); do
  echo "OSD $osd: $(ceph osd metadata osd.$osd 2>/dev/null | python3 -m json.tool | grep -E '(devices|default_device_class)')"
done
```

## Step 1 - Add New OSDs on New Disk Type

In Rook, add the new disk to the node configuration:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
spec:
  storage:
    nodes:
    - name: worker-1
      devices:
      - name: sdb    # Old HDD
      - name: nvme0n1  # New NVMe
```

Verify new OSD comes up:

```bash
ceph osd tree | grep nvme
kubectl -n rook-ceph get pods -l app=rook-ceph-osd | grep new
```

## Step 2 - Update CRUSH Map for New Disk Type

Assign the appropriate device class to the new OSD:

```bash
# SSDs are auto-detected as 'ssd', NVMe as 'nvme', HDDs as 'hdd'
ceph osd crush get-device-class osd.5

# Manually change device class if auto-detection is incorrect
ceph osd crush rm-device-class osd.5
ceph osd crush set-device-class nvme osd.5
```

Create a new CRUSH rule targeting the new device class:

```bash
ceph osd crush rule create-replicated nvme-rule default host nvme
```

Migrate a pool to use the new rule:

```bash
ceph osd pool set mypool crush_rule nvme-rule
```

## Step 3 - Let Data Rebalance

When you change the crush_rule, Ceph migrates data to OSDs matching the new rule:

```bash
watch ceph -s
# Watch for active+remapped states - data is moving
```

## Step 4 - Remove Old OSDs

Once all PGs are active+clean on the new OSDs:

```bash
# Mark old OSD out
ceph osd out osd.0

# Wait for data to migrate off the OSD
watch ceph osd df

# Stop the OSD daemon (in Rook, remove the device from CephCluster CR)
# Then purge the OSD (removes CRUSH entry, auth keys, and OSD map entry)
ceph osd purge 0 --yes-i-really-mean-it
```

## Step 5 - Remove Old CRUSH Bucket

Once all OSDs on the old disk type are removed:

```bash
ceph osd crush rule rm replicated_rule
ceph osd crush remove old-hdd-bucket
```

## Verifying All Data on New Disk Type

```bash
# Verify OSDs are all new device class
ceph osd crush dump | grep -A3 "device_class"

# Check no old OSDs remain
ceph osd tree | grep hdd

# Verify pool is using new rule
ceph osd pool get mypool crush_rule
```

## Performance Comparison

```bash
# Run bench before and after migration
rados bench -p mypool 30 write --no-cleanup
rados bench -p mypool 30 seq
rados bench -p mypool 30 rand
```

## Summary

Migrating Ceph OSDs to new disk types follows the standard add-rebalance-remove workflow combined with CRUSH map updates to direct data to the correct device class. Using CRUSH device classes allows pools to target specific hardware types, enabling precise control over where data is stored as you retire old disks and bring new ones online.
