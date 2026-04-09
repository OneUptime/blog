# How to Fix Mount Error 12 (Cannot Allocate Memory) in CephFS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CephFS, Troubleshooting, Mount

Description: Learn how to diagnose and fix mount error 12 (ENOMEM) in CephFS caused by insufficient kernel memory, too many caps, or misconfigured mount options in Rook-Ceph.

---

## Overview

Mount error 12 (`ENOMEM` - Cannot Allocate Memory) during CephFS mounting is typically not a simple out-of-memory condition. It often indicates that the kernel CephFS client is hitting internal limits related to capability (caps) allocation, session establishment resources, or specific kernel memory subsystem constraints. Understanding the true cause is key to resolving this error.

## Error Manifestation

The error appears as:

```text
mount: /mnt/cephfs: cannot allocate memory.
```

Check kernel logs immediately after the failure:

```bash
dmesg | tail -50 | grep -E "ceph|enomem|ENOMEM|memory"
```

## Common Causes and Fixes

### 1. Too Many CephFS Mounts on One Node

The kernel CephFS client has limits on simultaneous mounts. If many pods on the same node mount CephFS, you may hit kernel resource limits:

```bash
# Count current CephFS mounts on the node
mount | grep ceph | wc -l

# Check system file descriptor usage
cat /proc/sys/fs/file-nr
```

Solution - increase kernel limits or reduce concurrent mounts per node:

```bash
# Increase max open files if applicable
sysctl -w fs.file-max=2097152
echo "fs.file-max = 2097152" >> /etc/sysctl.conf
```

### 2. Insufficient Memory for Kernel Client

The CephFS kernel client allocates memory for the session, caps, and cache. If the node is under severe memory pressure:

```bash
free -h
cat /proc/meminfo | grep -E "MemAvailable|Slab|KernelStack"
```

Free memory or evict pods from the node to allow the mount to proceed.

### 3. CephX Keyring Issues Causing Error Misreporting

Sometimes ENOMEM is misreported and the actual cause is an authentication failure. Verify:

```bash
# Test authentication separately
ceph -s --id admin --keyring /etc/ceph/ceph.client.admin.keyring
```

### 4. Monitor Connection Failure Misreported as ENOMEM

Certain kernel versions misreport monitor connection failures as ENOMEM:

```bash
# Test monitor connectivity
nc -zv <monitor-ip> 6789
nc -zv <monitor-ip> 3300  # msgr2 port

# Try specifying only one monitor address
# Note: secretfile must contain only the secret key, not a full keyring
# Extract it with: ceph auth get-key client.admin > /etc/ceph/admin.secret
mount -t ceph <single-monitor-ip>:6789:/ /mnt/cephfs \
  -o name=admin,secretfile=/etc/ceph/admin.secret
```

### 5. Outdated Kernel Driver

Some older kernel versions have bugs that cause ENOMEM on valid mounts. Upgrade the kernel:

```bash
uname -r
# Update to 5.4 LTS or later
```

### 6. Switch to ceph-fuse as a Workaround

If the kernel driver consistently returns ENOMEM, use the FUSE client instead:

```bash
apt-get install -y ceph-fuse
ceph-fuse /mnt/cephfs --client_fs=cephfs
```

The FUSE client uses userspace memory management and avoids kernel memory allocation limits.

## Diagnostics Script

Run this to gather information for debugging:

```bash
#!/bin/bash
echo "=== Memory ==="
free -h
echo "=== Kernel CephFS mounts ==="
mount | grep ceph
echo "=== dmesg (ceph) ==="
dmesg | grep ceph | tail -30
echo "=== OSD connectivity ==="
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph -s
```

## Summary

CephFS mount error 12 (ENOMEM) in Rook-Ceph environments most commonly stems from node memory pressure, too many simultaneous CephFS kernel mounts, authentication issues misreported as memory errors, or monitor connectivity failures in certain kernel versions. Investigate kernel logs, verify monitor connectivity, check node memory availability, and consider switching to `ceph-fuse` as a reliable workaround when the kernel driver cannot be made to work.
