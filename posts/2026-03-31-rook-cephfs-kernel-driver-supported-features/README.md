# How to Understand Supported Features of the CephFS Kernel Driver

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CephFS, Kernel, Feature

Description: Learn which CephFS features are supported by the Linux kernel driver across different kernel versions and how to check compatibility for Rook-Ceph deployments.

---

## Overview

The Linux kernel CephFS driver evolves alongside the Ceph project, but kernel releases lag behind Ceph releases. This means not all CephFS features are available in every kernel version. Understanding which features are supported by the kernel driver you are running helps you make informed decisions about mount options, client configuration, and cluster feature flags.

## Check Kernel Driver Version

The CephFS kernel driver version is tied to the Linux kernel version:

```bash
uname -r
modinfo ceph | grep version
```

## Feature Support Matrix

Here are key CephFS features and the minimum kernel version required:

```text
Feature                         Min Kernel Version
----------------------------------------------
Basic CephFS mount              3.10+
CephX authentication            3.10+
Quotas (directory)              4.17+
Multiple filesystems            4.7+
Snapshots (snapshot directory)  4.17+
msgr2 protocol                  5.11+
Encryption (fscrypt)            6.6+
Async dirops                    5.8+
Delegation inodes               5.9+
Multi-reconnect                 5.9+
```

## Check Supported Features at Runtime

After mounting CephFS, check which features the kernel driver negotiated with the MDS:

```bash
# View mount options and features
cat /proc/mounts | grep ceph

# Check kernel client features via debugfs (if available)
ls /sys/kernel/debug/ceph/
cat /sys/kernel/debug/ceph/<mount-id>/mds_sessions
```

## Detect Feature Gaps

When your kernel driver does not support a feature required by the cluster, you may see errors like:

```text
mount: /mnt/cephfs: can't read superblock
```

or from the MDS logs:

```bash
kubectl -n rook-ceph logs -l app=rook-ceph-mds --tail=50 | \
  grep -i "feature\|unsupported\|required"
```

## Verify msgr2 Support

Ceph Nautilus introduced msgr2 (messenger v2 protocol) with encryption support. To check if your kernel supports it:

```bash
# Extract the raw key from the keyring into a secret file
ceph-authtool --name client.admin /etc/ceph/ceph.client.admin.keyring --print-key > /etc/ceph/admin.secret

# Try mounting with msgr2
mount -t ceph 192.168.1.10:3300:/ /mnt/cephfs \
  -o name=admin,secretfile=/etc/ceph/admin.secret,ms_mode=prefer-crc
```

Port 3300 is the msgr2 port. The `secretfile` option requires a file containing only the raw base64-encoded key, not a full keyring file. If the mount fails, your kernel may not support msgr2.

## Use FUSE as a Fallback

If your kernel does not support a required feature, use `ceph-fuse` as the client instead:

```bash
ceph-fuse /mnt/cephfs
```

The FUSE client is maintained in the Ceph userspace codebase and always supports the latest features regardless of kernel version.

## Upgrade Kernel for Feature Support

On managed Kubernetes clusters, update the node kernel to access newer features:

```bash
# Ubuntu
apt-get install --install-recommends linux-generic-hwe-22.04

# RHEL 8/9 - install ELrepo kernel
dnf install -y elrepo-release
dnf install -y kernel-ml
```

## Summary

Understanding the CephFS kernel driver feature support matrix is essential for correctly configuring Rook-Ceph client mounts. Features like msgr2, directory quotas, snapshots, and fscrypt encryption require specific minimum kernel versions. When your kernel version is too old for required features, use `ceph-fuse` as a fully-featured fallback, or upgrade the node kernel to gain access to newer CephFS capabilities.
