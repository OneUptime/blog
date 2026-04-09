# How to Troubleshoot No OSDs Available for Provisioning in Rook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Kubernetes, OSD, Troubleshooting, Storage

Description: Diagnose and resolve the 'no OSDs available for provisioning' error in Rook-Ceph by identifying pool and OSD configuration mismatches.

---

## Overview

When Ceph reports that no OSDs are available for provisioning, PVC creation fails even if OSDs appear to be running. This condition usually means either the pool's replication requirements cannot be met by the available OSDs, or the OSDs are in a state that prevents data placement.

## Identifying the Problem

First, check the overall cluster state:

```bash
kubectl exec -n rook-ceph -it deploy/rook-ceph-tools -- ceph status
```

Key indicators in the output:

```text
health: HEALTH_WARN
    1 pool(s) have insufficient replication
    no osds
```

Check OSD map directly:

```bash
kubectl exec -n rook-ceph -it deploy/rook-ceph-tools -- ceph osd stat
```

If the output shows `0 osds` or all OSDs are `down`, provisioning cannot proceed.

## Checking OSD Pod Status

```bash
kubectl get pods -n rook-ceph -l app=rook-ceph-osd
```

If no OSD pods exist, the issue is at the provisioning stage. Check operator logs:

```bash
kubectl logs -n rook-ceph \
  -l app=rook-ceph-operator \
  --tail=200 | grep -i osd
```

## Common Causes

### Not Enough Raw Devices

Rook did not find devices matching your configuration. Check the operator's device detection:

```bash
kubectl logs -n rook-ceph \
  -l app=rook-ceph-operator | grep -i "device\|disk\|no available"
```

Verify that the `CephCluster` device configuration matches actual available disks:

```bash
kubectl describe cephcluster -n rook-ceph | grep -A20 "Storage:"
```

### Minimum OSD Count Not Met

Rook requires at least 3 OSDs for a 3-replica pool. Verify your pool settings:

```bash
kubectl exec -n rook-ceph -it deploy/rook-ceph-tools -- \
  ceph osd pool get replicapool size
```

If pool size is 3 but you have fewer than 3 OSDs, either add more nodes/disks or reduce the replication factor.

### Devices Already Partitioned or Filesystem-Formatted

Rook skips devices that have existing partitions, filesystems, or LVM data. These devices must be wiped before Rook will provision OSDs on them.

Wipe devices manually if safe to do so:

```bash
# On the node
sgdisk --zap-all /dev/sdb
dd if=/dev/zero of=/dev/sdb bs=1M count=100 oflag=direct,dsync
wipefs -a /dev/sdb
partprobe /dev/sdb
```

### Placement Group Issues

When the cluster has too few OSDs for the configured CRUSH rule, placement group assignment fails:

```bash
kubectl exec -n rook-ceph -it deploy/rook-ceph-tools -- \
  ceph health detail | grep pg
```

Adjust the pool's replication factor to match available OSD count:

```bash
kubectl exec -n rook-ceph -it deploy/rook-ceph-tools -- \
  ceph osd pool set replicapool size 1
kubectl exec -n rook-ceph -it deploy/rook-ceph-tools -- \
  ceph osd pool set replicapool min_size 1
```

Only do this temporarily - setting size and min_size to 1 means no redundancy and risks data loss. Restore proper replication when more OSDs are available.

## Verifying OSD Recovery

After adding devices or fixing configuration, monitor OSD creation:

```bash
kubectl get pods -n rook-ceph -l app=rook-ceph-osd -w
```

Once OSDs reach Running state, check Ceph health:

```bash
kubectl exec -n rook-ceph -it deploy/rook-ceph-tools -- ceph health
```

## Summary

"No OSDs available for provisioning" in Rook-Ceph usually results from insufficient raw devices matching the cluster configuration, pool replication requirements exceeding the available OSD count, or pre-formatted disks. Verify device availability, match pool size to OSD count, and ensure disks are clean before re-running the operator reconciliation.
