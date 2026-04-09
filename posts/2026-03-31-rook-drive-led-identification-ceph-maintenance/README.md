# How to Set Up Drive LED Identification for Ceph Maintenance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, LED, Drive Identification, Maintenance, OSD, Hardware

Description: Use Ceph's drive LED control and IPMI tools to physically locate specific disks in a server rack when performing OSD replacement or maintenance.

---

## Overview

When replacing a failed OSD in a large server with many disks, identifying the correct physical disk is critical. Ceph supports controlling drive LED indicators (using `ledctl` or enclosure management) to visually identify disks without manual guessing.

## Prerequisites

Install `ledctl` or `sg3-utils` on nodes for enclosure management:

```bash
# On RHEL/CentOS nodes
kubectl -n rook-ceph debug node/worker-1 -- \
  chroot /host dnf install -y ledmon

# On Ubuntu/Debian nodes
kubectl -n rook-ceph debug node/worker-1 -- \
  chroot /host apt-get install -y ledmon sg3-utils
```

## Step 1: Find the Device Path for an OSD

Identify which physical device corresponds to the OSD that needs replacement:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd metadata <osd-id> | grep -E "device|path"
```

Or get the block device from the OSD pod:

```bash
kubectl -n rook-ceph get pod -l ceph-osd-id=<osd-id> -o wide
kubectl -n rook-ceph exec -it rook-ceph-osd-<id>-<hash> -- \
  ls -la /var/lib/ceph/osd/ceph-*/block
```

## Step 2: Enable LED Identification via Ceph

Ceph's device health module can interact with enclosure LEDs:

```bash
# Enable fault LED for a device
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph device light on <device-id> fault

# Enable locate LED
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph device light on <device-id> ident
```

Turn off after identification:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph device light off <device-id> ident
```

## Step 3: Use ledctl Directly on the Host

If Ceph LED control is not available, use `ledctl` directly:

```bash
# Turn on locate LED for a specific device
kubectl -n rook-ceph debug node/worker-1 -- \
  chroot /host ledctl locate=/dev/sdb

# Turn off
kubectl -n rook-ceph debug node/worker-1 -- \
  chroot /host ledctl locate_off=/dev/sdb
```

## Step 4: Use sg_ses for SAS Enclosures

For SAS enclosures, use `sg_ses` to control enclosure LEDs:

```bash
kubectl -n rook-ceph debug node/worker-1 -- \
  chroot /host sg_ses --index=0 --set=ident /dev/sg0
```

List enclosure devices:

```bash
kubectl -n rook-ceph debug node/worker-1 -- \
  chroot /host sg_ses /dev/sg0
```

## Step 5: IPMI Chassis LED Control

For servers with IPMI support, use `ipmitool`:

```bash
kubectl -n rook-ceph debug node/worker-1 -- \
  chroot /host ipmitool chassis identify 30
```

This blinks the chassis LED for 30 seconds to identify the server.

## Automating LED Control During Maintenance

Create a script that turns on LEDs before maintenance and off after:

```bash
#!/bin/bash
OSD_ID=$1
DEVICE=$(ceph osd metadata $OSD_ID | jq -r '.device_ids')
echo "Identifying device: $DEVICE on node..."
ceph device light on $DEVICE ident
echo "Press Enter when disk is replaced..."
read
ceph device light off $DEVICE ident
echo "LED off. Verify OSD recovery."
```

## Summary

Drive LED identification is essential for safe disk replacement in multi-disk Ceph deployments. Use Ceph's `ceph device light` commands for enclosure-aware LED control, `ledctl` for direct SCSI locate commands, or IPMI for server-level identification. Always turn off LEDs after maintenance to avoid confusion.
