# How to Configure NFS Client Mounts on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, NFS, Networking, File Sharing, Linux

Description: Configure NFS client mounts on Ubuntu including temporary mounts, persistent fstab entries, mount options tuning, and troubleshooting connection issues.

---

NFS (Network File System) is the standard protocol for sharing filesystems between Linux and Unix systems. Once an NFS server has exported directories, client systems can mount those exports and access them as if they were local filesystems. This guide covers the full process of configuring NFS client mounts on Ubuntu.

## Installing the NFS Client

Ubuntu does not install NFS client tools by default in all configurations. Install the necessary package:

```bash
# Install NFS common utilities (includes mount.nfs, nfsstat, etc.)
sudo apt update
sudo apt install nfs-common -y

# Verify the installation
nfsstat --version
```

The `nfs-common` package provides:
- `mount.nfs` and `mount.nfs4` - mount helpers
- `nfsstat` - NFS statistics tool
- `rpcinfo` - RPC service information
- `showmount` - query NFS server exports

## Discovering Available NFS Exports

Before mounting, check what the NFS server exports:

```bash
# Show exports from a specific NFS server
showmount -e 192.168.1.10

# Example output:
# Export list for 192.168.1.10:
# /data/shared     192.168.1.0/24
# /home/nfs        192.168.1.0/24
# /backup          192.168.1.50

# Show active mounts on the server
showmount -a 192.168.1.10
```

If `showmount` fails with "clnt_create: RPC: Port mapper failure," the server's RPC portmapper may be blocked by a firewall, or rpcbind is not running on the server.

## Temporary NFS Mounts

For testing or one-off access, mount manually:

```bash
# Create a local mount point
sudo mkdir -p /mnt/nfs/data

# Mount an NFSv4 export (recommended default)
sudo mount -t nfs4 192.168.1.10:/data/shared /mnt/nfs/data

# Or let mount auto-detect the NFS version
sudo mount -t nfs 192.168.1.10:/data/shared /mnt/nfs/data

# Verify the mount
df -h /mnt/nfs/data
mount | grep nfs
```

Check that you can read files:

```bash
ls /mnt/nfs/data
```

Unmount when done:

```bash
sudo umount /mnt/nfs/data

# If the mount is busy (open files), use lazy unmount
sudo umount -l /mnt/nfs/data
```

## Common Mount Options

NFS mount options significantly affect performance and behavior:

```bash
# Mount with performance-tuned options
sudo mount -t nfs4 192.168.1.10:/data/shared /mnt/nfs/data \
  -o rw,hard,intr,timeo=600,retrans=2,rsize=1048576,wsize=1048576,noatime
```

Key options explained:

| Option | Description |
|--------|-------------|
| `rw` / `ro` | Read-write or read-only |
| `hard` | Keep retrying if server unavailable (recommended) |
| `soft` | Return error after timeout (faster failure, risk of data corruption) |
| `intr` | Allow Ctrl+C to interrupt hung NFS operations |
| `timeo=600` | Timeout in tenths of a second (60 seconds) before retry |
| `retrans=2` | Number of retries before giving up |
| `rsize=1048576` | Read block size in bytes (1MB) |
| `wsize=1048576` | Write block size in bytes (1MB) |
| `noatime` | Do not update access time on reads (reduces write traffic) |
| `_netdev` | Wait for network before mounting (critical for fstab) |
| `vers=4.1` | Force specific NFS version |

## Persistent Mounts via /etc/fstab

For mounts that should be available after reboot, add them to `/etc/fstab`:

```bash
sudo nano /etc/fstab
```

```
# NFS mount - read-write with performance options
192.168.1.10:/data/shared  /mnt/nfs/data  nfs4  rw,hard,intr,timeo=600,retrans=2,rsize=1048576,wsize=1048576,noatime,_netdev  0  0

# NFS mount - read-only backup archive
192.168.1.10:/backup  /mnt/nfs/backup  nfs4  ro,hard,intr,timeo=600,noatime,_netdev  0  0

# NFSv3 mount (older servers)
192.168.1.10:/legacy/share  /mnt/nfs/legacy  nfs  vers=3,rw,hard,intr,noatime,_netdev  0  0
```

The last two fields (`0 0`) tell the system not to dump the filesystem and not to run `fsck` on it - both appropriate for NFS mounts.

Test the fstab entries without rebooting:

```bash
# Mount everything in fstab that is not already mounted
sudo mount -a

# Check for errors
dmesg | tail -20
df -h | grep nfs
```

## Creating Mount Points and Permissions

```bash
# Create multiple mount points at once
sudo mkdir -p /mnt/nfs/{data,backup,home}

# Set appropriate permissions on mount points
sudo chown nobody:nogroup /mnt/nfs/data
```

## NFSv4 vs NFSv3

NFSv4 is the current standard and preferred over NFSv3 because:
- Single TCP port 2049 (simpler firewall rules)
- Stateful protocol (better performance)
- Built-in security with Kerberos support
- Correct handling of file locking

Use NFSv4 unless you have a specific reason to use NFSv3:

```bash
# Force NFSv4.1 (supports pNFS for parallel I/O)
sudo mount -t nfs4 -o vers=4.1 192.168.1.10:/data/shared /mnt/nfs/data

# Check which NFS version is in use
nfsstat -m
```

## Checking Mount Status and Statistics

```bash
# Show all NFS mounts and their options
nfsstat -m

# Show client-side NFS statistics
nfsstat -c

# Show server-side statistics (if this is also a server)
nfsstat -s

# Detailed I/O statistics per mount
cat /proc/self/mountstats | grep -A 20 nfs
```

## Handling NFS Mount Timeouts at Boot

A common problem is that NFS mounts in `/etc/fstab` cause long boot delays if the NFS server is unavailable. The `_netdev` option helps, but for critical systems configure the mount timeout:

```bash
# Add x-systemd.mount-timeout to limit how long systemd waits
# In /etc/fstab:
192.168.1.10:/data/shared  /mnt/nfs/data  nfs4  rw,hard,noatime,_netdev,x-systemd.mount-timeout=30  0  0
```

Alternatively, use `noauto` and mount via a systemd service or after confirming the network is up:

```
192.168.1.10:/data/shared  /mnt/nfs/data  nfs4  rw,hard,noatime,_netdev,noauto  0  0
```

## Troubleshooting NFS Client Issues

### "Permission Denied" on Mount

```bash
# Check what the server exports and who can access them
showmount -e 192.168.1.10

# Verify your IP is in the allowed range
# Check server /etc/exports for the export options
```

### "Connection Refused" or "No Route to Host"

```bash
# Check network connectivity
ping 192.168.1.10

# Check if NFS port is reachable
nc -zv 192.168.1.10 2049

# Check RPC services on the server
rpcinfo -p 192.168.1.10
```

### Stale NFS Mount (ls hangs)

```bash
# Force unmount a stale mount
sudo umount -f -l /mnt/nfs/data

# Remount
sudo mount /mnt/nfs/data
```

### Performance Issues

```bash
# Check current rsize/wsize
cat /proc/mounts | grep nfs

# Remount with larger read/write sizes
sudo mount -o remount,rsize=1048576,wsize=1048576 /mnt/nfs/data

# Run a simple benchmark
dd if=/dev/zero of=/mnt/nfs/data/testfile bs=1M count=100 oflag=direct
```

## Automating Mounts with systemd

For more control over when mounts happen, use systemd mount units instead of fstab:

```bash
sudo nano /etc/systemd/system/mnt-nfs-data.mount
```

```ini
[Unit]
Description=NFS Data Share
After=network-online.target
Wants=network-online.target

[Mount]
What=192.168.1.10:/data/shared
Where=/mnt/nfs/data
Type=nfs4
Options=rw,hard,intr,noatime
TimeoutSec=30

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable mnt-nfs-data.mount
sudo systemctl start mnt-nfs-data.mount
sudo systemctl status mnt-nfs-data.mount
```

NFS client configuration is straightforward once you understand mount options. The `hard` option is important for data integrity - it keeps retrying on server failure rather than returning errors that could corrupt application state.
