# How to Fix 'Stale NFS File Handle' Error on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, NFS, Troubleshooting, File System, Network Storage

Description: Fix 'Stale NFS file handle' errors on RHEL caused by server-side export changes, inode reuse, or NFS service restarts.

---

A "Stale NFS file handle" error occurs when the NFS client holds a reference to a file or directory that no longer exists on the server in the same form. The file handle cached by the client no longer maps to a valid object on the server.

## Understanding the Error

```bash
# The error appears when accessing NFS-mounted files

ls /mnt/nfs/somefile
# ls: cannot access '/mnt/nfs/somefile': Stale file handle

# Or in application logs
# "Stale NFS file handle" (errno 116 / ESTALE)
```

## Quick Fix: Remount the NFS Share

```bash
# Unmount the NFS share
sudo umount /mnt/nfs

# If umount fails because it is busy
sudo umount -l /mnt/nfs   # lazy unmount

# Or force unmount
sudo umount -f /mnt/nfs

# Remount the NFS share
sudo mount -t nfs server:/export /mnt/nfs
```

## Check Server-Side Issues

On the NFS server:

```bash
# Verify the export is still active
sudo exportfs -v

# Check if the exported directory still exists
ls -la /export/

# If the export was re-created (deleted and recreated with same path),
# the inode changed, causing stale handles on clients

# Re-export the filesystem
sudo exportfs -ra
```

## Check NFS Service Status

```bash
# On the server
sudo systemctl status nfs-server

# Restart if needed
sudo systemctl restart nfs-server

# On the client, check the NFS mount status
mount | grep nfs
nfsstat -m
```

## Prevent Future Stale Handles

```bash
# Use the 'hard' mount option for resilience during transient outages.
# It does not prevent stale handles caused by deleted or re-created objects.
# Edit /etc/fstab on the client
# server:/export  /mnt/nfs  nfs  hard,timeo=600,retrans=3  0 0

# Verify current mount options
nfsstat -m

# If using autofs, check the auto.master and auto.nfs configurations
cat /etc/auto.master
```

## Clearing Stale Handles on Individual Files

```bash
# If only specific files are stale, check whether the parent directory
# can still be listed successfully
cd /mnt/nfs
ls -la

# Stat the file to confirm whether it still returns ESTALE
stat /mnt/nfs/somefile

# If that does not work, the full remount is required
```

## Debugging NFS Issues

```bash
# Enable NFS client debugging
sudo rpcdebug -m nfs -s all

# Watch the debug output
sudo dmesg | tail -20

# Disable debugging when done
sudo rpcdebug -m nfs -c all

# Check NFS statistics for errors
nfsstat -c
```

Stale NFS handles are commonly caused by server-side object or export changes, such as deleting or re-creating files or directories, changing exports, failover/remount events, or fileid/fsid changes. A service restart alone should not invalidate stable file handles, but maintenance can expose these changes. Coordinate server maintenance with client remount procedures to avoid disruption.
