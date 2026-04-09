# How to Use Ceph RBD Snapshots for VM Snapshots

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RBD, Snapshot, VM, KVM, Libvirt

Description: Use Ceph RBD snapshots as the backing mechanism for virtual machine snapshots, enabling instant VM state capture and rollback with efficient copy-on-write storage.

---

## Overview

When VM disks live in Ceph RBD, you can leverage RBD snapshots for VM disk state capture. This provides near-instantaneous snapshot creation regardless of disk size, and efficient storage using copy-on-write semantics. This guide covers taking VM snapshots via libvirt, creating RBD snapshots directly, and using them for rollback.

## VM Snapshot Types

- **Disk-only snapshot**: Captures disk state without memory. The VM continues running but the snapshot may not be application-consistent.
- **Full snapshot (disk + memory)**: Pauses the VM momentarily to capture both disk and memory state for a fully consistent restore point.

## Step 1 - Take a Disk-Only Snapshot via libvirt

```bash
# Create a disk-only external snapshot
virsh snapshot-create-as myvm \
  --name "pre-upgrade" \
  --description "Before package upgrade" \
  --disk-only \
  --atomic

virsh snapshot-list myvm
```

## Step 2 - View the Underlying RBD Snapshot

```bash
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  rbd snap ls vms/myvm-disk
```

This lists any RBD-level snapshots on the image. Note that libvirt external snapshots (created with `--disk-only` in Step 1) create qcow2 overlay files rather than RBD-level snapshots. To create snapshots at the RBD level, use the direct commands in Step 5.

## Step 3 - Take a Memory + Disk Snapshot (Full)

For full application consistency, capture memory state too:

```bash
# Full snapshot - briefly pauses VM
virsh snapshot-create-as myvm \
  --name "before-migration" \
  --description "Full state snapshot" \
  --memspec file=/tmp/myvm-mem.img \
  --diskspec vda,snapshot=external

virsh snapshot-list myvm --tree
```

## Step 4 - Rollback to a Snapshot

```bash
# Gracefully shut down the VM first for clean rollback
virsh shutdown myvm
virsh snapshot-revert myvm pre-upgrade

# Start VM from the snapshot state
virsh start myvm
```

Note: `virsh snapshot-revert` for external snapshots (created with `--disk-only`) requires libvirt 9.9.0 or later. On older versions, shut down the VM and use `rbd snap rollback` directly (see Step 5).

## Step 5 - Manage RBD Snapshots Directly

For situations where you want direct RBD control:

```bash
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- bash

# Create snapshot
rbd snap create vms/myvm-disk@pre-upgrade-$(date +%Y%m%d)

# List all snapshots
rbd snap ls vms/myvm-disk --all

# Delete a snapshot
rbd snap rm vms/myvm-disk@old-snap

# Rollback RBD image to snapshot (VM must be off)
rbd snap rollback vms/myvm-disk@pre-upgrade-20260331
```

## Step 6 - Prune Old Snapshots

```bash
#!/bin/bash
POOL=vms
IMAGE=myvm-disk
KEEP=7  # Keep last 7 snapshots

# List snapshots sorted by creation time
SNAPS=$(rbd snap ls ${POOL}/${IMAGE} --format json | \
  jq -r 'sort_by(.id) | .[].name')

COUNT=$(echo "$SNAPS" | wc -l)
DELETE_COUNT=$((COUNT - KEEP))

if [ $DELETE_COUNT -gt 0 ]; then
  echo "$SNAPS" | head -n $DELETE_COUNT | while read snap; do
    echo "Deleting old snapshot: $snap"
    rbd snap rm ${POOL}/${IMAGE}@${snap}
  done
fi
```

## Step 7 - Snapshot Storage Accounting

```bash
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  rbd du vms/myvm-disk
```

Output shows provisioned vs actual disk usage:

```text
NAME                    PROVISIONED  USED
myvm-disk               50 GiB       8.2 GiB
myvm-disk@pre-upgrade   50 GiB       256 MiB
```

Snapshot overhead depends on how much data changed since the snapshot was taken.

## Summary

Ceph RBD snapshots provide instant VM checkpoint capability through copy-on-write mechanics - the actual snapshot operation takes milliseconds regardless of disk size. The integration with libvirt means VM snapshot management tools work transparently on top of RBD, while direct RBD commands give you low-level control for pruning and storage management. Regularly pruning old snapshots prevents unbounded snapshot chain growth.
