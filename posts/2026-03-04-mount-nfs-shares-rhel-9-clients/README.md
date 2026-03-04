# How to Mount NFS Shares on RHEL Clients

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, NFS, Client, Mounting, Linux

Description: Learn how to mount NFS shares on RHEL client machines, covering manual mounts, mount options, and troubleshooting common connection issues.

---

## Client-Side NFS Setup

Mounting an NFS share on a RHEL client is simple once the server is configured. The client side requires the nfs-utils package and a mount command, or an fstab entry for persistent mounts.

## Prerequisites

- RHEL client with root access
- Network connectivity to the NFS server
- The NFS server has exports configured and firewall open

## Step 1 - Install NFS Utilities

```bash
# Install NFS client tools
sudo dnf install -y nfs-utils
```

## Step 2 - Discover Available Exports

```bash
# Show what the server is exporting
showmount -e 192.168.1.10
```

For NFSv4, you can also browse the server's root export:

```bash
# Mount the NFSv4 root and browse
sudo mount -t nfs4 192.168.1.10:/ /mnt/nfs-browse
ls /mnt/nfs-browse
sudo umount /mnt/nfs-browse
```

## Step 3 - Create a Mount Point

```bash
# Create the local directory where the share will be mounted
sudo mkdir -p /mnt/nfs-shared
```

## Step 4 - Mount the Share

```bash
# Basic mount command
sudo mount -t nfs 192.168.1.10:/srv/nfs/shared /mnt/nfs-shared

# Verify the mount
df -h /mnt/nfs-shared
mount | grep nfs
```

## Mount Options

Mount options control how the NFS share behaves on the client. Here are the most useful ones:

```bash
# Mount with specific options
sudo mount -t nfs -o rw,hard,intr,rsize=65536,wsize=65536 192.168.1.10:/srv/nfs/shared /mnt/nfs-shared
```

### Common Mount Options

| Option | Description |
|--------|-------------|
| `rw` | Mount read-write |
| `ro` | Mount read-only |
| `hard` | Retry NFS requests indefinitely (recommended) |
| `soft` | Return error after timeout (risky for data) |
| `intr` | Allow interrupting hung NFS operations |
| `rsize=N` | Read buffer size in bytes |
| `wsize=N` | Write buffer size in bytes |
| `timeo=N` | Timeout in tenths of a second |
| `retrans=N` | Number of retransmissions before timeout |
| `vers=4` | Force NFSv4 |
| `noatime` | Do not update access times (better performance) |
| `nosuid` | Ignore setuid bits (security) |
| `noexec` | Prevent execution of binaries (security) |

## NFSv4 vs NFSv3 Mounts

```bash
# Force NFSv4 (recommended)
sudo mount -t nfs -o vers=4 192.168.1.10:/srv/nfs/shared /mnt/nfs-shared

# Force NFSv3 (if needed for compatibility)
sudo mount -t nfs -o vers=3 192.168.1.10:/srv/nfs/shared /mnt/nfs-shared
```

NFSv4 is the default on RHEL and is recommended. It uses a single TCP port (2049) and supports better security features.

## Verifying the Mount

```bash
# Check mount details
findmnt /mnt/nfs-shared

# Show NFS-specific information
nfsstat -m

# Test read/write
echo "test" > /mnt/nfs-shared/client-test.txt
cat /mnt/nfs-shared/client-test.txt
```

## Unmounting

```bash
# Standard unmount
sudo umount /mnt/nfs-shared

# If the mount is busy
sudo umount -l /mnt/nfs-shared  # Lazy unmount

# Force unmount (use with caution)
sudo umount -f /mnt/nfs-shared
```

## Troubleshooting Mount Failures

### Connection Refused

```bash
# Check if the NFS server is reachable
ping 192.168.1.10

# Check if NFS port is open
nc -zv 192.168.1.10 2049

# Verify firewall on the server allows NFS
```

### Permission Denied

```bash
# Verify the export allows your client IP
showmount -e 192.168.1.10

# Check SELinux on the server
# Check export options (root_squash vs no_root_squash)
```

### Mount Hangs

```bash
# Try with a shorter timeout
sudo mount -t nfs -o timeo=10,retrans=2 192.168.1.10:/srv/nfs/shared /mnt/nfs-shared

# Check if the server is responding
rpcinfo -p 192.168.1.10
```

## Network Architecture

```mermaid
graph TD
    C[RHEL Client] -->|mount -t nfs| P[Port 2049/TCP]
    P --> S[NFS Server]
    S --> E[/srv/nfs/shared]
    E --> C
```

## Wrap-Up

Mounting NFS shares on RHEL clients is a matter of installing nfs-utils, running a mount command, and choosing appropriate options. Use `hard` mounts for reliability, tune rsize and wsize for performance, and always verify the mount with `df` or `findmnt` after connecting. For persistent mounts, see the companion post on fstab configuration.
