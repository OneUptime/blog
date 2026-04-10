# How to Use ceph-bluestore-tool for BlueStore Repair

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, BlueStore, ceph-bluestore-tool, Repair, OSD

Description: Use ceph-bluestore-tool to diagnose and repair BlueStore OSD corruption, inspect device layout, and recover from disk-level failures in Ceph clusters.

---

## When to Use ceph-bluestore-tool

`ceph-bluestore-tool` operates directly on BlueStore OSD devices, allowing you to inspect the raw BlueStore layout, check allocations, and repair certain types of corruption without needing a running Ceph cluster.

## Stop the OSD First

Always stop the OSD before using the tool:

```bash
# Scale down in Rook
kubectl -n rook-ceph scale deployment rook-ceph-osd-0 --replicas=0

# Verify the OSD is fully stopped
kubectl get pods -n rook-ceph | grep osd-0
```

## Check BlueStore Consistency

```bash
# Run a full fsck on the BlueStore device
ceph-bluestore-tool \
  fsck \
  --path /var/lib/ceph/osd/ceph-0 \
  --deep

# Quick fsck (no data verification)
ceph-bluestore-tool \
  fsck \
  --path /var/lib/ceph/osd/ceph-0
```

## Repair BlueStore Corruption

```bash
# Attempt automatic repair of detected inconsistencies
ceph-bluestore-tool \
  repair \
  --path /var/lib/ceph/osd/ceph-0

# Run fsck again after repair to verify
ceph-bluestore-tool \
  fsck \
  --path /var/lib/ceph/osd/ceph-0
```

## Inspect BlueStore Device Layout

```bash
# Show block device metadata and superblock info
ceph-bluestore-tool \
  show-label \
  --dev /dev/sdb

# Expected output includes:
# osd_uuid, ceph_fsid, whoami (OSD ID), and device roles
```

## Migrate BlueFS Data Between Devices

```bash
# Copy WAL/DB from one device to another
ceph-bluestore-tool \
  bluefs-bdev-migrate \
  --path /var/lib/ceph/osd/ceph-0 \
  --dev-target /dev/nvme0n1 \
  --devs-source /dev/sdb
```

## Check Free Space Fragmentation

```bash
# View allocator fragmentation stats
ceph-bluestore-tool \
  free-dump \
  --path /var/lib/ceph/osd/ceph-0 \
  --allocator block

# Summarize free space
ceph-bluestore-tool \
  free-score \
  --path /var/lib/ceph/osd/ceph-0 \
  --allocator block
```

## Expand BlueFS into Free Space

When adding a larger device:

```bash
# Expand BlueFS to use newly available space
ceph-bluestore-tool \
  bluefs-bdev-expand \
  --path /var/lib/ceph/osd/ceph-0
```

## Summary

`ceph-bluestore-tool` is essential for recovering from BlueStore-level corruption that prevents OSD startup. The `fsck` and `repair` subcommands handle most structural inconsistencies, while `show-label` and `bluefs-bdev-migrate` help when physical devices need to be replaced or reorganized. Always run in offline mode with the OSD stopped.
