# How to Configure Required Client Features in CephFS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CephFS, Client, Security

Description: Learn how to configure required client features in CephFS to enforce minimum client capabilities and prevent outdated clients from mounting the filesystem.

---

## Overview

CephFS supports a feature flag system that allows administrators to require clients to support specific capabilities before being allowed to mount the filesystem. This mechanism prevents old or incompatible clients from connecting to a filesystem that uses features they cannot safely handle, protecting data integrity and cluster stability.

## How Required Client Features Work

When required features are set on a CephFS filesystem, the MDS will reject any client that does not advertise support for all required features during the mount handshake. The client receives a `ENOTSUP` error and cannot proceed with mounting.

## List Available Features

To see which features can be required, check the Ceph feature flags documentation or query the current filesystem configuration:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph fs get cephfs
```

Look for the `required_client_features` field in the output.

## Set Required Client Features

Add a required feature to the filesystem using `ceph fs required_client_features`:

```bash
# Require clients to support the "reply_encoding" feature
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph fs required_client_features cephfs add reply_encoding
```

Common features you may want to require:

```text
reply_encoding       - MDS encodes request reply in extensible format
reclaim_client       - Clients must support session reclaim (used by NFS-Ganesha)
lazy_caps_wanted     - MDS only re-issues explicitly wanted caps when a stale client resumes
multi_reconnect      - Clients can split large reconnect messages into multiple ones during MDS failover
deleg_ino            - MDS delegates inode numbers to clients for async file creation
metric_collect       - Clients can send performance metrics to MDS
alternate_name       - Clients support alternate names for directory entries (encrypted file names)
```

## Remove a Required Feature

To remove a requirement and allow older clients to connect again:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph fs required_client_features cephfs rm reply_encoding
```

## Verify Required Features

Check the current set of required features:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph fs get cephfs | grep required_client_features
```

## Testing Client Compatibility

Before enforcing a new required feature, test whether your clients support it by checking the kernel or FUSE client version:

```bash
# Kernel client - check kernel version
uname -r

# FUSE client - check ceph-fuse version
ceph-fuse --version
```

The `reply_encoding` feature is supported by:
- ceph-fuse with Nautilus (14.x) or later
- Kernel client 5.4+ (Nautilus-era kernel support)

## Impact on Existing Clients

Adding a required feature will automatically evict any connected client that does not support it. Plan the change during a maintenance window or use `min_compat_client` alongside feature flags:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph fs set cephfs min_compat_client luminous
```

## Summary

Configuring required client features in CephFS is a proactive security and compatibility measure that prevents outdated clients from mounting your filesystem. By using `ceph fs required_client_features` to add or remove feature requirements, you can enforce a minimum client capability baseline in your Rook-Ceph cluster. Always verify client versions before enabling new requirements to avoid unintended client evictions.
