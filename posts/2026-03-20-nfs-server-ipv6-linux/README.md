# How to Configure NFS Server with IPv6 on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, NFS, Linux, Storage, Network File System, Server

Description: Configure an NFS server on Linux to export file systems over IPv6, including exports configuration, firewall rules, and verification of IPv6 NFS mounts.

## Introduction

NFS (Network File System) supports IPv6 on Linux, with comprehensive client and server support added in kernel 2.6.37+. Configuring an NFS server for IPv6 requires updating `/etc/exports` with IPv6 client addresses, ensuring `rpcbind` and `nfsd` listen on IPv6 interfaces, and configuring firewall rules for NFS ports over IPv6.

## Install NFS Server

```bash
# Debian/Ubuntu

apt-get install -y nfs-kernel-server

# RHEL/CentOS/Rocky
dnf install -y nfs-utils

# Enable and start services
systemctl enable --now nfs-server rpcbind
```

## Configure /etc/exports for IPv6

```bash
# /etc/exports
# Note: IPv6 addresses must NOT be wrapped in [ ] in /etc/exports -
# brackets are interpreted as character-class wildcards by exportfs.

# Export to a specific IPv6 client
/srv/data    2001:db8::50(rw,sync,no_subtree_check)

# Export to an IPv6 subnet (/64)
/srv/shared  2001:db8:cafe:1::/64(rw,sync,no_subtree_check,no_root_squash)

# Export to an IPv6 /48 range
/srv/backup  2001:db8:cafe::/48(ro,sync,no_subtree_check)

# Export to multiple clients (both IPv4 and IPv6)
/srv/data    192.168.1.0/24(rw,sync) fd00::/8(rw,sync,no_subtree_check)

# Export to any client (not recommended for production)
/srv/public  *(ro,sync,no_subtree_check)
```

## Reload and Verify Exports

```bash
# Apply exports configuration
exportfs -ra

# List active exports
exportfs -v
# Expected output includes IPv6 entries:
# /srv/data    2001:db8::50(rw,wdelay,root_squash,no_subtree_check,...)
# /srv/shared  2001:db8:cafe:1::/64(rw,...)

# Verify NFS is listening on IPv6
ss -tlnp | grep -E '(nfsd|rpcbind|2049|111)'
# Should show [::]:2049 and [::]:111
```

## Configure rpcbind for IPv6

```bash
# Modern rpcbind binds to all interfaces (IPv4 and IPv6) by default.
# Verify by querying over IPv6 transports:
rpcinfo -T tcp6 ::1
rpcinfo -s ::1

# To restrict rpcbind to specific addresses, use -h <address> in
# /etc/sysconfig/rpcbind (RHEL) or /etc/default/rpcbind (Debian):
#   RPCBIND_ARGS="-h 2001:db8::1 -h 192.0.2.1"
#   OPTIONS="-h 2001:db8::1 -h 192.0.2.1"
# When -h is used, rpcbind automatically also binds 127.0.0.1 and ::1.
```

## NFS over IPv6 with NFSv4

```bash
# /etc/nfs.conf (or /etc/nfs.conf.d/ipv6.conf)
# Configure NFS to listen on IPv6

[nfsd]
# Listen on all interfaces including IPv6
vers4=y
vers4.0=y
vers4.1=y
vers4.2=y
```

## Firewall Rules for NFS over IPv6

```bash
# ip6tables rules for NFS server

# Allow NFS (port 2049) from trusted IPv6 clients
ip6tables -A INPUT -p tcp --dport 2049 -s 2001:db8:cafe::/48 -j ACCEPT
ip6tables -A INPUT -p udp --dport 2049 -s 2001:db8:cafe::/48 -j ACCEPT

# Allow rpcbind (port 111) for NFSv3
ip6tables -A INPUT -p tcp --dport 111 -s 2001:db8:cafe::/48 -j ACCEPT
ip6tables -A INPUT -p udp --dport 111 -s 2001:db8:cafe::/48 -j ACCEPT

# For NFSv4-only (preferred for IPv6), only port 2049 is needed
# NFSv4 does not require rpcbind for operation

# Save rules (Debian/Ubuntu with iptables-persistent)
ip6tables-save > /etc/iptables/rules.v6
```

## Verify NFS Server IPv6 Operation

```bash
# From the NFS server, list RPC registrations over IPv6
# (rpcinfo -p uses portmapper v2 which is IPv4-only; use -T tcp6 or -s for IPv6)
rpcinfo -T tcp6 ::1
rpcinfo -s ::1

# From an IPv6 client, query the NFS server's MOUNT service (NFSv3 only)
# showmount uses the MOUNT protocol and will not work on NFSv4-only servers.
showmount -e 2001:db8::1
# Expected (NFSv3 export list):
# Export list for 2001:db8::1:
# /srv/data  2001:db8::50
# /srv/shared 2001:db8:cafe:1::/64

# For NFSv4-only servers, browse the v4 pseudo-root instead:
mount -t nfs4 [2001:db8::1]:/ /mnt/nfsroot

# Mount the share from the client (next article covers this)
mount -t nfs [2001:db8::1]:/srv/shared /mnt/shared
```

## Conclusion

Configuring NFS over IPv6 on Linux requires writing IPv6 addresses in `/etc/exports` without square brackets (brackets collide with character-class wildcards), ensuring rpcbind listens on IPv6 interfaces, and opening firewall ports for NFS traffic from trusted IPv6 CIDRs. NFSv4 is preferred for IPv6 deployments because it uses only port 2049 and does not require rpcbind for mount operations, simplifying firewall rules. Always specify a network prefix (e.g., `/64`) rather than a wildcard in exports to restrict access to authorized IPv6 clients.
