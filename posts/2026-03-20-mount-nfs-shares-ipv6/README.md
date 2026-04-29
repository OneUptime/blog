# How to Mount NFS Shares over IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, NFS, Mount, Linux, Storage, Fstab

Description: Mount NFS shares from IPv6-addressed servers using various methods including mount command, fstab, systemd mount units, and autofs, with performance and troubleshooting guidance.

## Introduction

Mounting NFS shares over IPv6 follows the same patterns as IPv4 NFS, with the key difference that the server address uses bracket notation and must be a valid IPv6 address or hostname resolving to AAAA records. This guide covers practical mounting techniques, persistent mounts, and troubleshooting for NFS over IPv6.

## Prerequisites

```bash
# Verify IPv6 connectivity to NFS server

ping6 2001:db8::1
# or
ping -6 2001:db8::1

# Check NFS exports are available
showmount -e [2001:db8::1]
# Expected:
# Export list for [2001:db8::1]:
# /srv/data  *
# /srv/home  [2001:db8:clients::]/48

# Install NFS client
apt-get install -y nfs-common    # Debian/Ubuntu
dnf install -y nfs-utils         # RHEL/CentOS
```

## Mount Command Syntax for IPv6

```bash
# NFSv4 (recommended) - server address in brackets
mount -t nfs4 [2001:db8::1]:/srv/data /mnt/data

# NFSv3 - specify nfsvers
mount -t nfs -o nfsvers=3 [2001:db8::1]:/srv/data /mnt/data

# With performance options
mount -t nfs4 \
    -o rw,hard,intr,rsize=1048576,wsize=1048576,timeo=600,retrans=3 \
    [2001:db8::1]:/srv/data /mnt/data

# Read-only mount
mount -t nfs4 -o ro [2001:db8::1]:/srv/backup /mnt/backup

# Verify mount
df -hT /mnt/data
mount | grep nfs
```

## /etc/fstab Persistent Mounts

```bash
# /etc/fstab - NFS shares over IPv6

# NFSv4 (preferred for IPv6)
[2001:db8::1]:/srv/data     /mnt/data     nfs4   rw,hard,intr,rsize=1048576,wsize=1048576,_netdev,auto   0 0

# NFSv4 read-only backup
[2001:db8::1]:/srv/backup   /mnt/backup   nfs4   ro,hard,_netdev,auto                                    0 0

# Multiple servers (if using HA NFS)
[2001:db8::1]:/srv/home     /home         nfs4   rw,hard,intr,_netdev,auto,x-systemd.automount           0 0

# Important: _netdev tells systemd to mount after network is available
# x-systemd.automount creates an automount unit (mount on first access)
```

```bash
# Apply fstab changes without reboot
mount -a

# Verify all NFS mounts are active
findmnt -t nfs,nfs4
```

## systemd Mount Units for IPv6 NFS

```ini
# /etc/systemd/system/mnt-data.mount
# Filename must match the mount point path (replace / with -)

[Unit]
Description=NFS /srv/data over IPv6
After=network-online.target
Wants=network-online.target

[Mount]
What=[2001:db8::1]:/srv/data
Where=/mnt/data
Type=nfs4
Options=rw,hard,intr,rsize=1048576,wsize=1048576,timeo=600

[Install]
WantedBy=multi-user.target
```

```ini
# /etc/systemd/system/mnt-data.automount
# Companion automount unit - mounts on first access

[Unit]
Description=Automount NFS /srv/data over IPv6
After=network-online.target

[Automount]
Where=/mnt/data
TimeoutIdleSec=600

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start
systemctl daemon-reload
systemctl enable --now mnt-data.automount

# Check status
systemctl status mnt-data.mount
systemctl status mnt-data.automount
```

## autofs for IPv6 NFS

```bash
# /etc/auto.master
/mnt/nfs    /etc/auto.nfs    --timeout=300 --ghost

# /etc/auto.nfs
# IPv6 colons must be escaped with backslash in autofs
data     -fstype=nfs4,rw,hard,intr,rsize=1048576    [2001\:db8\:\:1]:/srv/data
home     -fstype=nfs4,rw,hard,intr                   [2001\:db8\:\:1]:/srv/home
backup   -fstype=nfs4,ro                             [2001\:db8\:\:1]:/srv/backup

# Enable autofs
systemctl enable --now autofs

# Test: access triggers mount
ls /mnt/nfs/data
ls /mnt/nfs/home
```

## NFS over IPv6 with Kerberos

```bash
# Mount NFS with Kerberos security over IPv6
# Requires: KDC reachable over IPv6, server keytab, client ticket

kinit user@EXAMPLE.COM

mount -t nfs4 \
    -o sec=krb5p,rw,hard \
    [2001:db8::1]:/srv/secure /mnt/secure

# /etc/fstab with Kerberos
[2001:db8::1]:/srv/secure  /mnt/secure  nfs4  sec=krb5p,rw,hard,_netdev  0 0
```

## Troubleshooting NFS over IPv6

```bash
# Check IPv6 route to NFS server
ip -6 route get 2001:db8::1

# Test NFS port reachability
nc -6 -zv 2001:db8::1 2049
# Should show: Connection succeeded

# Check RPC services (NFSv3)
rpcinfo -s 2001:db8::1

# Check mount errors in system log
journalctl -u mnt-data.mount -n 50
journalctl -k | grep nfs | tail -20

# Enable verbose NFS debugging
mount -t nfs4 -v [2001:db8::1]:/srv/data /mnt/data 2>&1 | head -30

# Check NFS statistics
nfsstat -c    # Client statistics
iostat -n     # NFS I/O statistics (if sysstat installed)
```

## Conclusion

Mounting NFS shares over IPv6 requires bracket notation for the server address in mount commands and `/etc/fstab`. The `_netdev` fstab option is essential for IPv6 NFS mounts because it prevents mount attempts before the network stack is fully initialized. NFSv4 is strongly preferred for IPv6 because it operates over a single port (2049), simplifying firewall rules compared to NFSv3's use of rpcbind and portmapper. For automounting, both systemd automount units and autofs work with IPv6 NFS - autofs requires escaping colons in IPv6 addresses. Performance tuning parameters like `rsize`, `wsize`, and `timeo` are identical for IPv4 and IPv6 NFS.
