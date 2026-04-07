# How to Replace Failed Disks in a Rook-Ceph Cluster

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Disk Replacement, OSD, Storage, Operation

Description: Learn how to replace failed physical disks in a Rook-Ceph cluster - from detecting disk failure and evacuating data to provisioning a new OSD on the replacement disk.

---

## Detecting a Failed Disk

Ceph reports disk failures through OSD status changes:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph health detail
# Example output: 1 osds down, 1 osds out

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd tree | grep down
```

Check OSD pod status and logs:

```bash
kubectl -n rook-ceph get pods | grep osd
kubectl -n rook-ceph logs rook-ceph-osd-5-<pod> --tail=100 | grep -i "error\|failed\|disk"
```

Check node-level disk health:

```bash
ssh worker-node-2 sudo smartctl -a /dev/sde
ssh worker-node-2 sudo dmesg | grep -i "I/O error\|sector\|failed"
```

## Step 1: Mark the OSD Out

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd out osd.5
```

Wait for PG recovery to complete before physically replacing the disk:

```bash
watch kubectl -n rook-ceph exec deploy/rook-ceph-tools -- ceph status
```

Do not proceed until `active+clean` is reported for all PGs.

## Step 2: Remove the OSD from Ceph

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd crush remove osd.5
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph auth del osd.5
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd rm osd.5
```

Delete the Kubernetes OSD deployment:

```bash
kubectl -n rook-ceph delete deployment rook-ceph-osd-5
```

## Step 3: Physically Replace the Disk

Work with your hardware provider or data center team to:
1. Identify the physical slot for the failed disk using the node and device path
2. Hot-swap the disk if the server supports it
3. Confirm the new disk is detected by the OS

```bash
ssh worker-node-2 lsblk
# The new disk appears as /dev/sde with no partitions
```

## Step 4: Wipe the New Disk

The new disk must be clean before Rook can provision it:

```bash
ssh worker-node-2 sudo sgdisk --zap-all /dev/sde
ssh worker-node-2 sudo blkdiscard /dev/sde 2>/dev/null || true
ssh worker-node-2 sudo partprobe /dev/sde
```

## Step 5: Trigger OSD Provisioning

Rook detects new clean disks if configured with `useAllDevices: true`. To trigger an immediate reconciliation, restart the operator:

```bash
kubectl -n rook-ceph delete pod -l app=rook-ceph-operator
# The operator pod restarts and re-scans for available devices
```

Or explicitly add the device back to the node config in the CephCluster CR and re-apply:

```bash
kubectl -n rook-ceph apply -f ceph-cluster.yaml
```

## Step 6: Verify the New OSD

```bash
kubectl -n rook-ceph get pods | grep osd | grep worker-node-2
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd tree
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph status
```

Confirm the new OSD is `up` and `in` and data is rebalancing.

## Summary

Disk replacement in Rook-Ceph requires data evacuation before physical replacement. Mark the OSD out, wait for clean PGs, remove it from the CRUSH map, replace the disk, wipe it clean, and let the operator provision a new OSD. Rushing any step risks compounding the failure.
