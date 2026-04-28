# How to Configure NFS Client with IPv6 on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, NFS, Linux, Storage, Mount, Client

Description: Mount NFS shares from an IPv6-addressed NFS server on Linux, including mount command syntax, fstab configuration, and autofs for automatic NFS over IPv6 mounts.

## Introduction

Mounting NFS shares over IPv6 requires using bracket notation for the server address in mount commands and `/etc/fstab`. Modern Linux systems with kernel 2.6.37+ and nfs-utils fully support NFS over IPv6. NFSv4 is recommended for IPv6 as it simplifies port requirements and has better IPv6 support than NFSv3.

## Install NFS Client

```bash
# Debian/Ubuntu

apt-get install -y nfs-common

# RHEL/CentOS/Rocky
dnf install -y nfs-utils

# Enable required services
systemctl enable --now rpcbind
```

## Basic Mount Command

```bash
# Mount NFS share from IPv6 server
# Server address must be in brackets
mount -t nfs [2001:db8::1]:/srv/shared /mnt/shared

# Force NFSv4
mount -t nfs4 [2001:db8::1]:/srv/shared /mnt/shared

# Mount with options
mount -t nfs \
    -o rw,sync,hard,intr,rsize=1048576,wsize=1048576,timeo=600 \
    [2001:db8::1]:/srv/data /mnt/data

# Verify mount
df -h /mnt/shared
mount | grep nfs
```

## /etc/fstab Configuration for IPv6 NFS

```bash
# /etc/fstab entries for IPv6 NFS mounts
# Format: [server]:export  mountpoint  type  options  dump  pass

# NFSv4 mount (preferred)
[2001:db8::1]:/srv/shared   /mnt/shared   nfs4   rw,sync,hard,intr,_netdev   0   0

# NFSv3 mount (requires rpcbind and portmapper)
[2001:db8::1]:/srv/data     /mnt/data     nfs    rw,sync,hard,intr,nfsvers=3,_netdev   0   0

# Read-only backup mount
[2001:db8:backup::1]:/srv/backups   /mnt/backups   nfs4   ro,hard,_netdev   0   0

# The _netdev option ensures the mount waits for network availability
```

## Mount with systemd .mount Unit

```ini
# /etc/systemd/system/mnt-nfs-shared.mount

[Unit]
Description=NFS Mount: shared volume over IPv6
After=network-online.target
Wants=network-online.target

[Mount]
What=[2001:db8::1]:/srv/shared
Where=/mnt/nfs/shared
Type=nfs4
Options=rw,sync,hard,intr,rsize=1048576,wsize=1048576,timeo=600

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start the mount unit
systemctl daemon-reload
systemctl enable --now mnt-nfs-shared.mount

# Check status
systemctl status mnt-nfs-shared.mount
```

## Automount with autofs over IPv6

```bash
# /etc/auto.master
/mnt/nfs    /etc/auto.nfs --timeout=300

# /etc/auto.nfs
# Format: mountpoint  options  server:export
shared      -fstype=nfs4,rw,sync,hard,intr    [2001\:db8\:\:1]:/srv/shared
data        -fstype=nfs4,rw,sync,hard,intr    [2001\:db8\:\:1]:/srv/data
# Note: colons in IPv6 addresses must be escaped with backslash in autofs maps

# Enable and start autofs
systemctl enable --now autofs

# Test: access the automounted share
ls /mnt/nfs/shared
```

## Performance Tuning for NFS over IPv6

```bash
# Mount with optimized options for performance
mount -t nfs4 \
    -o rw,hard,intr,\
rsize=1048576,wsize=1048576,\
async,noatime,\
timeo=600,retrans=2 \
    [2001:db8::1]:/srv/data /mnt/data

# Check NFS statistics
nfsstat -c
# Shows client-side NFS operations and retransmissions

# Monitor NFS traffic on IPv6 interface
tcpdump -i eth0 -n "ip6 and port 2049"
```

## Verify IPv6 NFS Connectivity

```bash
# Test connectivity to NFS server over IPv6
ping6 2001:db8::1

# List available exports from the server
showmount -e [2001:db8::1]

# Check mounted NFS filesystems
mount | grep nfs
# Should show: [2001:db8::1]:/srv/shared on /mnt/shared type nfs4

# Check NFS mount options
cat /proc/mounts | grep nfs

# Verify I/O is working
dd if=/dev/zero of=/mnt/shared/test bs=1M count=100 oflag=direct
```

## Troubleshooting Common Issues

```bash
# "No route to host" - check IPv6 connectivity
ip -6 route get 2001:db8::1

# "Permission denied" - check /etc/exports on server
# Verify client's IPv6 is in the export's allowed range
showmount -e [2001:db8::1]

# "mount.nfs: Connection timed out" - check firewall
ip6tables -L INPUT -n | grep 2049

# "RPC timeout" on NFSv3 - ensure rpcbind is running and accessible
# Use -T tcp6 because rpcinfo -p uses the v2 portmapper protocol which
# does not support IPv6 netids
rpcinfo -T tcp6 2001:db8::1 100000
# If this fails, use NFSv4 instead
```

## Conclusion

Mounting NFS over IPv6 on Linux uses bracket notation for the server address in mount commands and `/etc/fstab`. NFSv4 is the recommended version for IPv6 because it operates over a single port (2049) and does not require rpcbind for mounting. Use the `_netdev` fstab option to prevent mount attempts before the network is ready. For production systems, systemd `.mount` units or autofs provide reliable automatic mounting with proper ordering. Performance options like `rsize=1048576` and `wsize=1048576` apply identically to IPv6 NFS as to IPv4.
