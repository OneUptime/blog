# How to Choose Between Kernel Driver and FUSE for CephFS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CephFS, Kernel, FUSE

Description: Learn the trade-offs between the CephFS kernel driver and ceph-fuse to make the right choice for your Rook-Ceph workloads and infrastructure.

---

## Overview

CephFS can be mounted using two different client implementations: the native Linux kernel driver (`ceph.ko`) and the userspace FUSE client (`ceph-fuse`). Each has distinct trade-offs in terms of performance, feature coverage, ease of use, and resource requirements. Choosing the right client depends on your kernel version, workload characteristics, and operational preferences.

## Kernel Driver Overview

The kernel driver is built into the Linux kernel and communicates directly with Ceph daemons through kernel networking stacks.

**Advantages:**
- Lower CPU and memory overhead
- Better I/O performance due to kernel-level integration
- Stable and well-tested on modern kernels
- No additional daemon process to manage

**Disadvantages:**
- Feature support tied to the kernel version (may lag behind Ceph releases)
- Requires root privileges to mount
- Debugging is more complex (kernel logs, DebugFS)

## FUSE Client (ceph-fuse) Overview

The FUSE client runs as a userspace daemon that communicates with the kernel via the FUSE interface.

**Advantages:**
- Always has the latest CephFS client features (tied to Ceph release, not kernel)
- Easier to debug (userspace logs, ASAN support)
- Can run as non-root (with `user_allow_other`)
- Works on any kernel that supports FUSE (3.x+)

**Disadvantages:**
- Higher CPU overhead due to userspace-kernel context switches
- Lower peak throughput compared to the kernel driver
- Requires an additional running daemon process

## Performance Comparison

For a rough performance benchmark, the kernel driver typically delivers:

```text
Sequential Read:   20-30% higher throughput vs FUSE
Sequential Write:  15-25% higher throughput vs FUSE
Metadata ops/sec:  10-20% faster vs FUSE
```

Run `fio` to measure actual performance in your environment:

```bash
# Install fio
apt-get install -y fio

# Sequential write test
fio --name=seqwrite --rw=write --bs=4M --size=4G \
    --numjobs=1 --ioengine=sync --filename=/mnt/cephfs/testfile

# Sequential read test
fio --name=seqread --rw=read --bs=4M --size=4G \
    --numjobs=1 --ioengine=sync --filename=/mnt/cephfs/testfile
```

## Feature Availability by Client

```text
Feature                 Kernel Driver    FUSE Client
-------------------------------------------------
Directory Quotas        4.17+            Always
Snapshots               4.17+            Always
Encryption (fscrypt)    6.6+             Always (via ceph-fuse)
msgr2 Protocol          5.11+            Always
Multiple Filesystems    4.7+             Always
LazyIO                  Limited          Full support
```

## Decision Matrix

```text
Use Kernel Driver when:
  - Running kernel 5.4+
  - Prioritizing I/O throughput
  - Running production storage-intensive workloads
  - You have root access to nodes

Use FUSE when:
  - Running older kernel (< 4.17)
  - Need latest CephFS features not in your kernel
  - Running in containers without kernel module access
  - Prefer easier debugging and log analysis
```

## Summary

Both the kernel driver and `ceph-fuse` are production-ready CephFS clients with different trade-offs. The kernel driver wins on raw performance and is the better choice for storage-intensive production workloads on modern kernels. The FUSE client provides maximum feature coverage and is more accessible in constrained environments. In Rook-Ceph deployments, the CSI driver defaults to the kernel driver for CephFS PVC mounts (`CSI_FORCE_CEPHFS_KERNEL_CLIENT: "true"`) but can be configured to use ceph-fuse via the `mounter` parameter in the StorageClass.
