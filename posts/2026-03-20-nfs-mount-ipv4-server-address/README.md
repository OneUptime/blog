# How to Mount an NFS Share by IPv4 Server Address

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NFS, IPv4, Mount, Linux, Client, File System

Description: Mount an NFS share from an IPv4 server address using the mount command, specify NFS version and mount options, and verify the mounted filesystem.

## Introduction

Mounting NFS shares on Linux clients requires the NFS client utilities and the server's IPv4 address. The mount command syntax is straightforward, but choosing appropriate options (NFS version, buffer sizes, timeouts) affects performance and reliability.

## Installing NFS Client

```bash
# Debian/Ubuntu

sudo apt install nfs-common

# RHEL/CentOS/Fedora
sudo dnf install nfs-utils

# Verify NFS client is available
showmount --version
```

## Basic Mount Commands

```bash
# Mount an NFS share (NFSv3/v4 auto-negotiated)
sudo mount 203.0.113.10:/srv/data /mnt/nfs

# Mount with explicit NFSv4
sudo mount -t nfs4 203.0.113.10:/srv/data /mnt/data

# Mount with explicit NFSv3
sudo mount -t nfs -o vers=3 203.0.113.10:/srv/data /mnt/data

# Create mount point first
sudo mkdir -p /mnt/nfs-data
sudo mount -t nfs 203.0.113.10:/srv/data /mnt/nfs-data
```

## Mount with Options

```bash
# Mount with performance options
sudo mount -t nfs \
  -o rw,soft,rsize=8192,wsize=8192,timeo=14 \
  203.0.113.10:/srv/data /mnt/nfs-data

# Mount options explained:
# rw          - Read-write
# soft        - Return error if server unreachable (vs. hang indefinitely)
# rsize=8192  - Read buffer size in bytes
# wsize=8192  - Write buffer size in bytes
# timeo=14    - Timeout in tenths of a second (1.4 seconds)
# Note: the intr option is deprecated and ignored on Linux kernels >= 2.6.25;
# only SIGKILL can interrupt a pending NFS operation on hard mounts.

# For performance (large transfers):
sudo mount -t nfs \
  -o rw,hard,rsize=65536,wsize=65536,timeo=600 \
  203.0.113.10:/srv/data /mnt/nfs-data
```

## Common Mount Options Reference

| Option | Description |
|---|---|
| `vers=4` | Force NFSv4 |
| `soft` | Return error on timeout (safe for non-critical data) |
| `hard` | Retry indefinitely (for critical data) |
| `intr` | Deprecated and ignored on Linux >= 2.6.25; SIGKILL interrupts hung operations |
| `rsize=65536` | Large read buffer for throughput |
| `wsize=65536` | Large write buffer for throughput |
| `noatime` | Don't update access times (performance) |
| `noacl` | Disable ACL support |

## Verifying the Mount

```bash
# List mounted filesystems
mount | grep nfs
# Expected: 203.0.113.10:/srv/data on /mnt/nfs-data type nfs4 (rw,...)

# Check with df
df -h /mnt/nfs-data
# Expected: shows server's disk usage

# Test write (if mounted rw)
touch /mnt/nfs-data/testfile
ls -la /mnt/nfs-data/testfile

# Test read performance
sudo dd if=/mnt/nfs-data/largefile of=/dev/null bs=1M count=100

# Unmount
sudo umount /mnt/nfs-data
```

## Viewing Available Exports

```bash
# See what the server exports before mounting
showmount -e 203.0.113.10
# /srv/data  10.0.0.0/24
# /srv/backups  10.0.0.5

# Check which NFS versions the server supports
sudo rpcinfo -p 203.0.113.10 | grep nfs
```

## Conclusion

Mount NFS shares with `mount -t nfs server_ip:/path /local/mountpoint`. Use `nfs4` type for NFSv4 or add `-o vers=3` for NFSv3. Choose `soft` for mounts where a timeout-induced error is acceptable, and `hard` for mounts carrying critical data (use SIGKILL to interrupt hung operations on modern kernels, since the legacy `intr` option is now ignored). Verify with `mount | grep nfs` and `df -h` after mounting.
