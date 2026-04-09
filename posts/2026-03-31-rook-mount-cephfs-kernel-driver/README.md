# How to Mount CephFS Using the Kernel Driver

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CephFS, Kernel, Mount

Description: Learn how to mount a CephFS filesystem using the Linux kernel driver for high-performance, low-overhead access to Rook-Ceph shared storage.

---

## Overview

The Linux kernel CephFS driver (`ceph.ko`) provides native, high-performance access to CephFS filesystems without requiring a userspace FUSE daemon. It is the recommended mount method for production workloads due to lower CPU overhead and better performance compared to FUSE. The kernel driver is included in mainline Linux and supported on most modern distributions.

## Prerequisites

- Linux kernel 4.x or later (5.4+ recommended for latest features)
- `ceph-common` package installed for the `mount.ceph` helper
- A valid CephX keyring for authentication
- Monitor addresses from your Rook cluster

## Get Monitor Addresses and Keyring

Extract the monitor endpoints from your Rook-Ceph cluster:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph mon dump | grep -E "^[0-9]"
```

Get the client keyring:

```bash
kubectl -n rook-ceph get secret rook-csi-cephfs-node -o jsonpath='{.data.adminID}' | base64 -d
kubectl -n rook-ceph get secret rook-csi-cephfs-node -o jsonpath='{.data.adminKey}' | base64 -d
```

## Install ceph-common

```bash
# Debian/Ubuntu
apt-get install -y ceph-common

# RHEL/CentOS
dnf install -y ceph-common
```

## Create a Secret File

```bash
# Create a file containing just the secret key (required by secretfile= mount option)
echo "AQC...base64key...==" > /etc/ceph/admin.secret
chmod 600 /etc/ceph/admin.secret
```

## Mount with the Kernel Driver

```bash
# Mount using monitor IPs and the admin keyring
mount -t ceph 192.168.1.10:6789,192.168.1.11:6789,192.168.1.12:6789:/ \
  /mnt/cephfs \
  -o name=admin,secretfile=/etc/ceph/admin.secret
```

## Mount with Secret Inline

```bash
mount -t ceph 192.168.1.10:6789:/ /mnt/cephfs \
  -o name=admin,secret=AQC...base64key...==
```

## Verify the Mount

```bash
df -h /mnt/cephfs
mount | grep ceph
```

## Common Mount Options

```text
rw                - Read-write (default)
ro                - Read-only
noatime           - Do not update atime on reads (performance)
nodiratime        - Do not update directory atime
rbytes            - Report recursive byte sum as directory size via st_size
ms_mode=secure    - Enable encrypted transport (kernel 5.11+, Ceph Nautilus+)
```

## Example with Performance Options

```bash
mount -t ceph 192.168.1.10:6789:/ /mnt/cephfs \
  -o name=admin,secretfile=/etc/ceph/admin.secret,noatime,nodiratime
```

## Summary

Mounting CephFS with the Linux kernel driver provides the best performance and lowest overhead for accessing Rook-Ceph shared storage from Linux hosts. The process involves obtaining monitor addresses and a CephX keyring, installing `ceph-common`, and using `mount -t ceph` with appropriate options. The kernel driver is preferred over FUSE for production workloads where performance and stability are critical.
