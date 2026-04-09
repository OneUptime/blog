# How to Run Ceph Commands from the Toolbox in Rook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Toolbox, Operation, Kubernetes, Administration

Description: Learn how to run essential Ceph commands from the Rook toolbox pod to monitor cluster health, manage pools, OSDs, and perform administrative tasks.

---

## Overview

The Rook toolbox pod provides access to all Ceph CLI tools pre-configured for your cluster. This guide covers the most important commands for day-to-day operations, troubleshooting, and cluster management through the toolbox.

## Connecting to the Toolbox

Run commands non-interactively (one-liners):

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- <ceph-command>
```

Open an interactive shell for multiple commands:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash
```

## Cluster Health Commands

### Overall Cluster Status

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph status
```

### Detailed Health Information

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph health detail
```

Output shows specific warnings or errors:

```text
HEALTH_WARN 1 nearfull osd(s)
[WRN] OSD_NEARFULL: 1 nearfull osd(s)
    osd.5 is near full at 85%
```

### Watch Cluster Events

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph -w
```

## OSD Management Commands

### List All OSDs

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd status
```

### Show OSD Tree (CRUSH Layout)

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd tree
```

### Check OSD Utilization

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd df
```

### Mark OSD Out (Before Removal)

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd out osd.5
```

## Pool Management Commands

### List All Pools

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd pool ls detail
```

### Show Pool Usage

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph df
```

### Get Pool Configuration

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool get replicapool all
```

### Check PG Status

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph pg stat
```

### List Stuck PGs

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph pg dump_stuck inactive
```

## Monitor Commands

### Monitor Status

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph mon stat
```

### Monitor Quorum

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph quorum_status --format json-pretty
```

## RBD Commands

### List RBD Images

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- rbd ls replicapool
```

### Get RBD Image Info

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rbd info replicapool/csi-vol-abc123
```

### List RBD Snapshots

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rbd snap ls replicapool/csi-vol-abc123
```

## Object Storage Commands

### List RGW Users

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin user list
```

### Check RGW Usage Stats

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin usage show --uid=myuser
```

## Performance Monitoring

### OSD Performance Stats

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd perf
```

### Check Slow Requests

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph tell osd.0 dump_slow_requests
```

## Summary

The Rook toolbox pod serves as the primary interface for Ceph cluster administration. Use `ceph status` and `ceph health detail` for cluster monitoring, `ceph osd status` and `ceph osd df` for storage utilization, and pool or RBD commands for storage management. Running commands through `kubectl exec` means no SSH or direct cluster access is needed - all management flows through the standard Kubernetes API.
