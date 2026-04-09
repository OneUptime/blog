# How to Use RBD Snapshots for VM Backup

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RBD, Snapshot, VM, Backup, KVM, Virtualization

Description: Use Ceph RBD snapshots to back up virtual machine disk images with crash-consistent or application-consistent snapshots and efficient export to backup storage.

---

## Overview

RBD (RADOS Block Device) snapshots provide a fast, space-efficient way to back up VM disk images stored in Ceph. This guide covers taking consistent VM snapshots, exporting them, and restoring VMs from RBD snapshots.

## How RBD Snapshots Work for VMs

RBD uses copy-on-write (COW) for snapshots. When you take a snapshot, the original blocks are preserved and new writes go to a new location. This means the snapshot operation is near-instantaneous regardless of disk size.

## Step 1 - Quiesce the VM Before Snapshotting

For filesystem-consistent backups, freeze the VM's filesystem before snapshotting:

```bash
# For KVM/QEMU VMs, use virsh to freeze guest filesystem
virsh qemu-agent-command myvm \
  '{"execute":"guest-fsfreeze-freeze"}'
```

## Step 2 - Create the RBD Snapshot

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash

# Identify the RBD image backing the VM disk
rbd ls vms

# Create the snapshot
rbd snap create vms/myvm-disk@backup-2026-03-31
```

## Step 3 - Thaw the VM Filesystem

```bash
virsh qemu-agent-command myvm \
  '{"execute":"guest-fsfreeze-thaw"}'
```

## Step 4 - Export the Snapshot

Export the snapshot to a file for off-cluster storage:

```bash
rbd export vms/myvm-disk@backup-2026-03-31 /backup/myvm-2026-03-31.img
```

Or export only the delta since the last snapshot (incremental):

```bash
rbd export-diff \
  --from-snap backup-2026-03-30 \
  vms/myvm-disk@backup-2026-03-31 \
  /backup/myvm-diff-2026-03-31.img
```

## Step 5 - Verify the Backup

```bash
# Check snapshot info
rbd info vms/myvm-disk@backup-2026-03-31

# List all snapshots for a VM
rbd snap ls vms/myvm-disk
```

Output example:

```text
SNAPID  NAME               SIZE    PROTECTED  TIMESTAMP
12      backup-2026-03-30  50 GiB  no         Mon Mar 30 02:00:01 2026
13      backup-2026-03-31  50 GiB  no         Tue Mar 31 02:00:01 2026
```

## Step 6 - Restore a VM from Snapshot

Rollback the entire disk to a snapshot:

```bash
# Stop the VM first
virsh shutdown myvm

# Rollback the RBD image to the snapshot
rbd snap rollback vms/myvm-disk@backup-2026-03-31

# Start the VM
virsh start myvm
```

Or clone the snapshot to a new disk for parallel testing:

```bash
rbd snap protect vms/myvm-disk@backup-2026-03-31
rbd clone vms/myvm-disk@backup-2026-03-31 vms/myvm-restored
```

## Step 7 - Automate with a Backup Script

```bash
#!/bin/bash
VM=$1
DATE=$(date +%Y-%m-%d)
POOL=vms
IMAGE="${VM}-disk"

# Freeze guest
virsh qemu-agent-command $VM '{"execute":"guest-fsfreeze-freeze"}'

# Snapshot
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  rbd snap create ${POOL}/${IMAGE}@backup-${DATE}

# Thaw guest
virsh qemu-agent-command $VM '{"execute":"guest-fsfreeze-thaw"}'

# Remove snapshot from 7 days ago
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  rbd snap rm ${POOL}/${IMAGE}@backup-$(date -d '-7 days' +%Y-%m-%d)
```

## Summary

RBD snapshots provide near-instantaneous VM backups with minimal performance impact, thanks to Ceph's copy-on-write architecture. Pairing filesystem freeze/thaw with snapshot creation ensures consistency. For long-term storage, exporting snapshots to files or using incremental export-diff minimizes backup storage consumption.
