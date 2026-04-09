# How to Handle Permission Denied After Network Disruption in CephFS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CephFS, Troubleshooting, Network

Description: Learn how to resolve permission denied errors in CephFS that occur after network disruptions, including client blocklisting and capability recovery procedures.

---

## Overview

After a network disruption, CephFS clients may find themselves unable to access files - even with correct credentials - receiving `Permission denied` (EACCES) or `Operation not permitted` (EPERM) errors. This is a deliberate safety mechanism in CephFS called client blocklisting (formerly called blacklisting). Understanding why this happens and how to resolve it is critical for maintaining CephFS availability in Rook-Ceph environments.

## Why Permission Denied Occurs After Network Disruption

When a CephFS client loses network connectivity, its session timer starts counting. If the client does not reconnect before the `mds_session_timeout` expires (default: 60 seconds), the MDS marks the client as unresponsive and:

1. Evicts the client's session
2. Revokes all capabilities the client held
3. Adds the client's IP address to the OSD blocklist to prevent stale write data from being applied

When the client reconnects, it is rejected because its IP is blocklisted, causing all operations to fail with `EBLOCKLISTED` (mapped to `ESHUTDOWN` in the Linux kernel). Applications typically see this surfaced as `Input/output error` (EIO).

## Diagnose the Issue

Check the OSD blocklist for the affected client IP:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd blocklist ls
```

You should see the client's IP address with an expiry time.

Check MDS client eviction logs:

```bash
kubectl -n rook-ceph logs -l app=rook-ceph-mds,rook_file_system=cephfs \
  --tail=200 | grep -i "evict\|blocklist\|blacklist"
```

## Remove the Client from the Blocklist

The fastest fix is to remove the client from the OSD blocklist:

```bash
# First, find the exact blocklist entry for the client
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd blocklist ls

# Remove using the exact address string from the listing above
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd blocklist rm <address-from-blocklist-ls>
```

Use the exact address string shown by `ceph osd blocklist ls` (e.g., `192.168.1.10:0/1234567890`), as it includes a nonce value that must match.

After removal, the client should be able to reconnect and access files normally.

## Remount the Filesystem

After removing from the blocklist, remount the filesystem on the client:

```bash
# Unmount (may be required even if hung)
umount -f -l /mnt/cephfs

# Remount
mount -t ceph <monitor-ip>:6789:/ /mnt/cephfs \
  -o name=admin,secretfile=/etc/ceph/admin.secret
```

Note: The `secretfile` option must point to a file containing only the raw secret key (a base64 string), not the full keyring file.

For Kubernetes pods, delete and recreate the pod to force a fresh mount.

## Prevent Future Blocklisting

Increase the session timeout to give clients more time to reconnect after disruptions:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set mds mds_session_timeout 300  # 5 minutes
```

For kernel CephFS mounts, you can enable automatic session recovery by adding the `recover_session=clean` mount option, which allows the kernel client to automatically reconnect after being evicted:

```bash
mount -t ceph <monitor-ip>:6789:/ /mnt/cephfs \
  -o name=admin,secretfile=/etc/ceph/admin.secret,recover_session=clean
```

For FUSE clients (ceph-fuse / libcephfs), configure aggressive reconnection in ceph.conf:

```bash
# In ceph.conf
cat >> /etc/ceph/ceph.conf <<EOF
[client]
client_reconnect_stale = true
client_mount_timeout = 300
EOF
```

## Handle Blocklisting in Kubernetes

In Rook-Ceph deployments, if a Kubernetes node goes offline temporarily, all pods with CephFS PVCs on that node may be blocklisted. Use the NetworkFence CRD to manage blocklisting:

```bash
# List blocklisted clients
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd blocklist ls

# Remove all blocklist entries
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd blocklist clear
```

## Summary

Permission denied errors after network disruptions in CephFS are caused by the client blocklisting mechanism, which protects data integrity by preventing reconnection of clients whose capabilities may have been granted to other clients. Resolution involves removing the client from the OSD blocklist using `ceph osd blocklist rm` and remounting the filesystem. Preventive measures include increasing MDS session timeouts and configuring clients for aggressive reconnection in Rook-Ceph environments.
