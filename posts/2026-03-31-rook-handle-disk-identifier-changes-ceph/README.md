# How to Handle Disk Identifier Changes in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, OSD, Disk Identifier, Storage, Troubleshooting, Kubernetes

Description: Resolve Ceph OSD failures caused by disk identifier changes after reboots or hardware changes, using persistent device paths and Rook recovery procedures.

---

## Overview

Disk identifiers like `/dev/sdX` are not persistent across reboots on Linux. A disk that was `/dev/sdb` before a reboot may appear as `/dev/sdc` after, causing Ceph OSDs to fail to start. This guide covers how to use persistent identifiers and recover from identifier changes.

## Understanding the Problem

When a Ceph OSD fails to start after a reboot, check its logs:

```bash
kubectl -n rook-ceph logs -l app=rook-ceph-osd --tail=50 | grep -i "failed\|error\|not found"
```

Common error:

```text
unable to open OSD superblock on /dev/sdb: No such file or directory
```

This means the disk is present but at a different path.

## Step 1: Identify the Current Device Path

Find where the disk is now:

```bash
kubectl debug node/worker-1 --image=busybox -it -- \
  chroot /host lsblk -o NAME,WWN,MODEL,SERIAL,MOUNTPOINT
```

Match by serial or WWN to find the current device name.

## Step 2: Use Persistent Device Identifiers

Switch from `/dev/sdX` to persistent paths in the CephCluster spec:

```yaml
spec:
  storage:
    nodes:
    - name: worker-1
      devices:
      - name: /dev/disk/by-id/wwn-0x500a075144e28580
      - name: /dev/disk/by-id/scsi-360000000000000001
      - name: /dev/disk/by-path/pci-0000:00:1f.2-ata-2
```

Verify available persistent paths:

```bash
kubectl debug node/worker-1 --image=busybox -it -- \
  chroot /host ls -la /dev/disk/by-id/ | grep -v part
```

## Step 3: Recover OSDs After Identifier Change

If an OSD is down due to the change, force OSD restart with the correct device:

```bash
# Identify the failed OSD number
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd tree | grep down

# Get the OSD deployment
kubectl -n rook-ceph get deployment -l ceph_daemon_type=osd
```

Edit the OSD deployment to correct the device path if needed, or allow Rook to reconcile by updating the CephCluster.

## Step 4: Update CephCluster Configuration

Apply the corrected spec with persistent paths:

```bash
kubectl -n rook-ceph edit cephcluster rook-ceph
```

Trigger reconciliation:

```bash
kubectl -n rook-ceph annotate cephcluster rook-ceph \
  rook.io/do-reconcile=true --overwrite
```

## Step 5: Prevent Future Issues

Configure udev rules to create stable symlinks:

```bash
cat /etc/udev/rules.d/61-ceph-stable.rules
```

```text
SUBSYSTEM=="block", ENV{ID_SERIAL}=="?*", \
  SYMLINK+="ceph-by-serial/$env{ID_SERIAL}"
```

Then reference `/dev/ceph-by-serial/<serial>` in Rook config.

## Verifying Recovery

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph -s
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd tree
```

## Summary

Disk identifier changes are a common cause of Ceph OSD failures after reboots. Using persistent device paths via `/dev/disk/by-id/` or `/dev/disk/by-path/` in the CephCluster spec prevents these issues. When failures do occur, identifying the new device path and updating the Rook configuration resolves them.
