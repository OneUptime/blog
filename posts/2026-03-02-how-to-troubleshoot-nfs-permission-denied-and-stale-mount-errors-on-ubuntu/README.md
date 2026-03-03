# How to Troubleshoot NFS 'Permission Denied' and Stale Mount Errors on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, NFS, Troubleshooting, Networking, Linux

Description: Fix NFS Permission Denied errors caused by UID mismatches, export options, and root squashing, plus recover from stale NFS mounts on Ubuntu client systems.

---

NFS errors fall into two main categories: access errors that prevent you from reading or writing files, and connectivity errors that leave mounts in a broken state. Both have distinct causes and fixes. This guide covers the most common problems encountered in day-to-day NFS administration.

## Understanding NFS Permission Errors

NFS uses Unix UID/GID for access control. When a client accesses an NFS mount, the NFS server checks whether the client's UID has permission to access the requested file based on standard Unix permissions. This creates a classic problem: UID 1001 on the client might be a different user than UID 1001 on the server.

## Diagnosing "Permission Denied" on NFS Mounts

### Step 1: Identify the UID/GID Mismatch

```bash
# On the NFS client, check your current UID and GID
id

# On the NFS server, check who owns the files you're trying to access
ls -la /srv/nfs/shared/
# If the file is owned by UID 1001 on the server, and your UID on the client
# is also 1001 but maps to a different username, you still get access.
# The problem is when UIDs genuinely differ.

# Compare user mappings
# On client:
id username
# On server:
id username  # run via SSH to compare
```

### Step 2: Check Root Squashing

NFS servers apply "root squashing" by default. When a root user on the client tries to access the NFS mount, the server remaps that UID (0) to the `nobody` user (usually UID 65534). This prevents root on a client from having root-level access on the server.

Check the current export options:

```bash
# On the NFS server
sudo exportfs -v

# Example output:
# /srv/nfs/shared  192.168.1.0/24(rw,wdelay,root_squash,no_subtree_check,sec=sys)
# The 'root_squash' option is the default and applies squashing
```

If a root process needs access (for backup scripts, etc.), you can use `no_root_squash`, but understand the security implications:

```bash
# In /etc/exports on the server:
/srv/nfs/backup  192.168.1.50(rw,sync,no_subtree_check,no_root_squash)
```

`no_root_squash` should only be used for specific trusted clients, never for a subnet or wildcard.

### Step 3: Check All Squash Option

The `all_squash` export option maps all client UIDs to the anonymous user (`nobody`). If this is set, no client user can access the share with their own identity:

```text
/srv/nfs/public  *(ro,sync,no_subtree_check,all_squash,anonuid=1000,anongid=1000)
```

With `all_squash`, specify `anonuid` and `anongid` to map all clients to a specific user that has appropriate access.

### Step 4: Verify Filesystem Permissions on the Server

```bash
# Check permissions on the shared directory and its parents
namei -l /srv/nfs/shared/

# Check specific file permissions
ls -la /srv/nfs/shared/

# If using ACLs, check those too
getfacl /srv/nfs/shared/
```

The NFS server daemon runs as root but accesses files as the client's UID. If the filesystem permissions do not allow the relevant UID access, the client gets Permission Denied.

### Step 5: Check Export Options for the Client's IP

The export options in `/etc/exports` may differ per client or subnet:

```bash
# On the NFS server, view all current exports
sudo exportfs -v

# Verify your client IP is in the allowed range
# Example /etc/exports entry:
# /srv/nfs/shared  192.168.1.0/24(rw,sync,no_subtree_check)
# A client at 10.0.0.5 would not match this export and gets Permission Denied
```

If the client IP is not in any export rule, the mount may still succeed (the server exports to `*` or a broad range) but individual file access fails.

### Fixing UID Mismatches

The clean solution is consistent UID/GID allocation across all NFS clients and the server. Use LDAP, NIS, or a centralized identity system.

For simpler setups, align UIDs manually:

```bash
# On the NFS server, find the UID of the user who owns the files
id nfsuser  # outputs: uid=1500(nfsuser)

# On the NFS client, ensure the user has the same UID
# Check if UID 1500 is in use
getent passwd | awk -F: '$3==1500'

# If a different user has UID 1500, you need to remap
# Change the local user's UID to match the server
sudo usermod -u 1500 localuser
sudo find /home/localuser -user 1001 -exec chown 1500 {} \;  # fix home dir ownership
```

## Diagnosing Stale NFS Mount Errors

"Stale file handle" errors occur when the NFS server has been restarted, the export has been removed and re-created, or the server's underlying filesystem was modified in ways that invalidated the file handles the client has cached.

### Symptoms of Stale Mounts

```bash
# Running commands on the mount hangs or returns:
ls /mnt/nfs/data
# ls: cannot access '/mnt/nfs/data': Stale file handle

# Or the terminal freezes entirely when accessing the mount
```

### Step 1: Identify Stale Mounts

```bash
# Check current NFS mount status
nfsstat -m

# List all NFS mounts
mount | grep nfs

# Check if the mount point is accessible
stat /mnt/nfs/data
```

### Step 2: Unmount the Stale Mount

If the mount is just stale (server rebooted, export was re-exported):

```bash
# Normal unmount may hang if the mount is truly stale
sudo umount /mnt/nfs/data

# If normal unmount hangs, use force unmount
sudo umount -f /mnt/nfs/data

# If force unmount also hangs, use lazy unmount
# (detaches the mount point immediately, cleans up when it stops being used)
sudo umount -l /mnt/nfs/data
```

### Step 3: Check if Processes Are Using the Mount

```bash
# Find processes using the NFS mount
sudo lsof +D /mnt/nfs/data
sudo fuser -m /mnt/nfs/data

# Kill processes holding the mount open (carefully)
sudo fuser -km /mnt/nfs/data
```

### Step 4: Remount After Clearing the Stale Handle

```bash
# Verify the NFS server is reachable
ping 192.168.1.10

# Check the NFS server's exports are active
showmount -e 192.168.1.10

# Remount
sudo mount /mnt/nfs/data  # if in /etc/fstab
# or
sudo mount -t nfs4 192.168.1.10:/srv/nfs/data /mnt/nfs/data
```

### Preventing Stale Mounts

Configure the `hard` and `intr` mount options:

```text
# In /etc/fstab
192.168.1.10:/srv/nfs/data  /mnt/nfs/data  nfs4  hard,intr,timeo=600,retrans=3,noatime,_netdev  0  0
```

- `hard`: The NFS client keeps retrying indefinitely when the server is unavailable. Operations block rather than fail.
- `intr`: Allows Ctrl+C or signals to interrupt blocked NFS operations.

With `soft` mounts, a timeout returns ESTALE errors to applications, which can cause data corruption. Use `hard` for production mounts.

## Common NFS Error Codes

| Error | Likely Cause |
|-------|-------------|
| `Permission denied` | UID mismatch, export options, filesystem permissions |
| `Stale file handle` | Server restarted, export was deleted and recreated |
| `Connection refused` | NFS server not running, firewall blocking port 2049 |
| `No route to host` | Network connectivity issue |
| `RPC timeout` | Packet loss, server overloaded, firewall dropping packets |
| `Input/output error` | Server filesystem error, disk failure |

## Checking NFS Server Health from the Client

```bash
# Check if the NFS server is responding
rpcinfo -p 192.168.1.10

# Verify NFS port 2049 is accessible
nc -zv 192.168.1.10 2049

# Test the mount point performance
dd if=/dev/zero of=/mnt/nfs/data/test bs=1M count=10 oflag=direct
rm /mnt/nfs/data/test
```

## Monitoring NFS Errors Over Time

```bash
# Watch NFS client error counters
watch -n 5 'nfsstat -c | grep -E "timeout|badxid|retrans"'

# Check kernel messages for NFS errors
sudo dmesg | grep nfs
sudo journalctl -k | grep -i nfs

# Monitor specific mount statistics
cat /proc/self/mountstats
```

A rising `retrans` counter in `nfsstat -c` indicates the client is retransmitting requests because responses are not arriving in time. This points to network issues or an overloaded server.

## Quick Recovery Script

For systems where stale mounts are a recurring issue, a recovery script helps:

```bash
sudo nano /usr/local/bin/nfs-recover.sh
```

```bash
#!/bin/bash
# Recover stale NFS mounts

MOUNT_POINT="/mnt/nfs/data"
NFS_SERVER="192.168.1.10"
NFS_EXPORT="/srv/nfs/data"

# Check if mount is stale
if ! timeout 5 stat "$MOUNT_POINT" > /dev/null 2>&1; then
    echo "Mount appears stale, attempting recovery..."

    # Force unmount
    umount -f -l "$MOUNT_POINT"

    # Wait for cleanup
    sleep 2

    # Remount
    mount -t nfs4 "${NFS_SERVER}:${NFS_EXPORT}" "$MOUNT_POINT" \
        -o hard,intr,noatime

    if mount | grep -q "$MOUNT_POINT"; then
        echo "Recovery successful"
    else
        echo "Recovery failed - check NFS server status"
        exit 1
    fi
else
    echo "Mount appears healthy"
fi
```

```bash
sudo chmod +x /usr/local/bin/nfs-recover.sh
```

Most NFS issues come down to either UID mismatches (for permission errors) or server restarts (for stale file handles). Consistent UID allocation and appropriate mount options handle the majority of cases.
