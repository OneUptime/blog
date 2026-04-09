# How to Manage Device Discovery for Ceph OSDs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, OSD, Device Discovery, Kubernetes, Storage

Description: Control how Rook discovers and selects block devices for Ceph OSD provisioning using filters, node selectors, and device specifications.

---

## Overview

Rook's device discovery mechanism determines which block devices on each node become Ceph OSDs. Understanding and controlling this process is critical for preventing accidental provisioning of OS disks, boot devices, or already-used volumes.

## How Rook Discovers Devices

Rook runs a `rook-discover` DaemonSet on all nodes that scans for available block devices. Devices are eligible if they:
- Have no existing filesystem or partition table
- Are not currently mounted
- Meet minimum size requirements

Check what devices Rook has discovered:

```bash
kubectl -n rook-ceph get configmap rook-ceph-osd-worker-1 -o yaml
```

Or via the discover pods:

```bash
kubectl -n rook-ceph logs -l app=rook-discover --tail=30
```

## Using Device Filters

Filter devices with a regex to control which devices Rook uses:

```yaml
spec:
  storage:
    useAllNodes: true
    useAllDevices: false
    deviceFilter: "^sd[b-z]"
```

This example matches all `sdb` through `sdz` but excludes `sda` (typically the OS disk).

## Using Explicit Device Lists

For precise control, specify devices per node:

```yaml
spec:
  storage:
    useAllNodes: false
    nodes:
    - name: worker-1
      devices:
      - name: sdb
      - name: sdc
        config:
          deviceClass: ssd
    - name: worker-2
      devices:
      - name: nvme0n1
        config:
          deviceClass: nvme
```

## Configuring the Discover DaemonSet

Adjust discovery behavior via the Rook operator ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: rook-ceph-operator-config
  namespace: rook-ceph
data:
  ROOK_DISCOVER_DEVICES_INTERVAL: "60m"
  ROOK_ENABLE_DISCOVERY_DAEMON: "true"
```

## Preventing Accidental Provisioning

Devices that should never become OSDs can be excluded by ensuring they have a filesystem or by using the device filter:

```bash
# Check device state on a node
kubectl debug node/worker-1 -it --image=busybox -- \
  chroot /host lsblk -f
```

If a device has been accidentally wiped, re-add a dummy partition to prevent discovery:

```bash
# On the host node
parted /dev/sdb mklabel gpt
```

## Verifying Active OSDs

After discovery and provisioning, verify which devices became OSDs:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd metadata | jq '.[].devices'
```

```bash
kubectl -n rook-ceph get pods -l app=rook-ceph-osd -o wide
```

## Summary

Rook's device discovery is controlled through the CephCluster storage spec using `deviceFilter` regexes, explicit device lists per node, or the `useAllDevices` flag. The `rook-discover` DaemonSet continuously scans nodes for eligible devices, so filtering appropriately prevents accidental provisioning of OS or boot disks.
