# How to Set CephFS Mount Prerequisites

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CephFS, Mount, Installation

Description: Learn the prerequisites for mounting CephFS filesystems from Linux hosts, including kernel requirements, packages, and network configuration for Rook-Ceph.

---

## Overview

Successfully mounting a CephFS filesystem requires several prerequisites on the client host. These include a compatible kernel version, the `ceph-common` userspace tools, network connectivity to Ceph monitors, and valid authentication credentials. Meeting these requirements before attempting to mount prevents common configuration errors.

## Kernel Requirements

For the kernel CephFS driver:
- Minimum: Linux kernel 4.x (basic CephFS support)
- Recommended: Linux kernel 5.4+ (for msgr2, encryption, and latest features)

Check your kernel version:

```bash
uname -r
```

Verify the CephFS kernel module is available:

```bash
modinfo ceph
```

If the module is not found, you may need to install kernel extras or fall back to `ceph-fuse`.

## Install Required Packages

```bash
# Debian/Ubuntu
apt-get update
apt-get install -y ceph-common

# RHEL/CentOS/Fedora
dnf install -y ceph-common

# Verify installation
ceph --version
```

The `ceph-common` package provides:
- `mount.ceph` helper for kernel mounts
- `ceph` CLI for keyring management
- `rados` and other utilities

For FUSE-based mounts, install the separate `ceph-fuse` package.

## Network Requirements

The client must have TCP connectivity to:
- Ceph monitors on port 6789 (or 3300 for msgr2)
- Ceph OSDs on ports 6800-7300

Verify monitor connectivity:

```bash
# Replace with your monitor IPs
nc -zv 192.168.1.10 6789
nc -zv 192.168.1.10 3300
```

## Obtain Cluster Configuration

Copy the Ceph cluster configuration from your Rook deployment:

```bash
kubectl -n rook-ceph get configmap rook-ceph-config -o jsonpath='{.data.ceph\.conf}' \
  > /etc/ceph/ceph.conf
```

## Obtain Authentication Credentials

Extract the client keyring from Kubernetes secrets:

```bash
kubectl -n rook-ceph get secret rook-csi-cephfs-node \
  -o jsonpath='{.data.adminKey}' | base64 -d
```

Store it in the standard location:

```bash
cat > /etc/ceph/ceph.client.admin.keyring <<EOF
[client.admin]
    key = <paste-key-here>
EOF
chmod 600 /etc/ceph/ceph.client.admin.keyring
```

## Verify Prerequisites Checklist

```bash
# 1. Kernel module
lsmod | grep ceph || echo "ceph module not loaded"
modprobe ceph

# 2. ceph-common installed
mount.ceph --version

# 3. Configuration file exists
cat /etc/ceph/ceph.conf

# 4. Keyring exists and is readable only by root
ls -la /etc/ceph/ceph.client.admin.keyring

# 5. Monitor connectivity
ping -c 3 <monitor-ip>

# 6. Test cluster connectivity
ceph -s
```

## Create the Mount Point

```bash
mkdir -p /mnt/cephfs
```

## Summary

Meeting CephFS mount prerequisites ensures a smooth mounting experience in Rook-Ceph environments. The key requirements are a compatible Linux kernel with the `ceph.ko` module, the `ceph-common` package, network access to monitor and OSD ports, a valid `ceph.conf`, and a CephX keyring. Running through the verification checklist before mounting saves time debugging common connectivity and authentication failures.
