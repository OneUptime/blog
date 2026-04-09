# How to Fix Mount Error 5 (Input/Output Error) in CephFS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CephFS, Troubleshooting, Mount

Description: Learn how to diagnose and fix mount error 5 (EIO - Input/Output Error) in CephFS, covering common causes like network issues, OSD failures, and corrupted metadata.

---

## Overview

Mount error 5 (`EIO` - Input/Output Error) in CephFS typically indicates that the kernel client encountered an error communicating with the cluster during or after mounting. This error can manifest at mount time or during file operations and has several potential root causes including network issues, OSD failures, MDS problems, and metadata corruption.

## Identify the Error

When a CephFS mount encounters EIO, you may see:

```text
mount: /mnt/cephfs: can't read superblock.
```

Or during file operations:

```text
Input/output error
ls: cannot open directory '/mnt/cephfs': Input/output error
```

Check kernel logs immediately:

```bash
dmesg | tail -50 | grep -i "ceph\|error\|EIO"
```

## Common Causes and Fixes

### 1. OSD Down or Degraded

The most common cause is insufficient healthy OSDs to serve I/O:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph -s
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph health detail
```

If OSDs are down:

```bash
kubectl -n rook-ceph get pods -l app=rook-ceph-osd | grep -v Running
kubectl -n rook-ceph logs <osd-pod-name> --tail=100
```

Restart failed OSD pods or investigate disk health on the affected node.

### 2. Network Connectivity Issues

Check connectivity from the client to monitors and OSDs:

```bash
# Verify monitor connectivity
nc -zv <monitor-ip> 6789

# Check for packet loss
ping -c 100 <monitor-ip> | tail -5

# Check MTU issues (jumbo frames)
ping -c 3 -M do -s 8972 <monitor-ip>
```

### 3. MDS Not Active

If no active MDS is available, metadata operations return EIO:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph fs status cephfs
```

If the MDS is down or in an unhealthy state:

```bash
kubectl -n rook-ceph get pods -l app=rook-ceph-mds
kubectl -n rook-ceph delete pod <stuck-mds-pod>  # Force restart
```

### 4. Pool Degraded Below Minimum Replicas

If the data pool falls below its minimum replica count, writes fail with EIO:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool get cephfs-data0 min_size

# Check pool PG state
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph pg stat
```

### 5. Blacklisted (Blocklisted) Client

A client may be blocklisted if it held caps too long or reconnected improperly:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd blocklist ls

# Remove the blocklist entry for this client
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd blocklist rm <client-ip>:0/0
```

## Recovery Steps

```bash
# 1. Unmount the affected filesystem
umount -f /mnt/cephfs

# 2. Fix the underlying cause (OSD, MDS, network)

# 3. Verify cluster health
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph -s

# 4. Remount
mount -t ceph <mon-ip>:6789:/ /mnt/cephfs \
  -o name=admin,secretfile=/etc/ceph/admin.secret
```

## Summary

CephFS mount error 5 (EIO) results from the client being unable to complete I/O operations, most commonly due to OSD failures reducing pool availability below minimum replica count, MDS unavailability, network connectivity issues, or client blocklisting. Diagnosing EIO errors requires checking `ceph -s`, OSD status, MDS state, and kernel logs. Resolving the underlying cluster health issue and remounting is the correct remediation path in Rook-Ceph environments.
