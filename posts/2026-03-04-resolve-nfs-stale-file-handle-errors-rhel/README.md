# How to Resolve 'NFS Stale File Handle' Errors on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, NFS, Filesystems, Troubleshooting, Storage

Description: Fix NFS stale file handle errors on RHEL by re-exporting shares, remounting clients, and tuning NFS configurations.

---

The "Stale file handle" (ESTALE) error occurs when an NFS client holds a reference to a file or directory that no longer exists on the server, or when the server-side export has changed. This is a common issue after server restarts, export modifications, or file deletions.

## Identifying the Problem

Check which mounts are affected:

```bash
# Try to list files on the NFS mount
ls /mnt/nfs-share

# If you get "Stale file handle", check the mount status
mount | grep nfs

# Check dmesg for NFS-related errors
dmesg | grep -i nfs | tail -20
```

## Quick Fix: Remount the NFS Share

The simplest fix is to unmount and remount:

```bash
# Attempt a lazy unmount if the regular unmount fails
sudo umount -l /mnt/nfs-share

# Remount the NFS share
sudo mount -t nfs4 nfs-server:/export/share /mnt/nfs-share
```

If the unmount hangs, force it:

```bash
# Force unmount the stale NFS mount
sudo umount -f /mnt/nfs-share
```

## Server-Side Fixes

On the NFS server, verify the export configuration:

```bash
# Check current exports
sudo exportfs -v

# If the export was modified, re-export all shares
sudo exportfs -ra

# Verify the NFS service is healthy
systemctl status nfs-server
```

If the underlying filesystem on the server was replaced or reformatted (even with the same path), the file handles change. You must re-export:

```bash
# Unexport and re-export the share
sudo exportfs -u nfs-server:/export/share
sudo exportfs -o rw,sync,no_subtree_check 192.168.1.0/24:/export/share
```

## Client-Side Configuration

Add resilient mount options in `/etc/fstab` to handle future issues:

```bash
# Edit fstab with soft mount and timeout options
# soft = return error instead of hanging; timeo = timeout in tenths of a second
nfs-server:/export/share  /mnt/nfs-share  nfs4  soft,timeo=50,retrans=3,_netdev  0  0
```

## Clearing the NFS Client Cache

Sometimes the client caches stale metadata. Clear it:

```bash
# Drop all kernel caches (including NFS attribute cache)
echo 3 | sudo tee /proc/sys/vm/drop_caches

# Alternatively, remount with the noac option to disable attribute caching
sudo mount -o remount,noac /mnt/nfs-share
```

## Preventing Stale Handles

Use `actimeo=0` or shorter attribute cache timeouts for frequently changed exports:

```bash
# Mount with shorter attribute cache (values in seconds)
sudo mount -t nfs4 -o acregmin=0,acregmax=5,acdirmin=0,acdirmax=5 \
  nfs-server:/export/share /mnt/nfs-share
```

Keep the NFS server and client versions aligned. Check the negotiated NFS version:

```bash
# On the client, check which NFS version is in use
nfsstat -m
```
