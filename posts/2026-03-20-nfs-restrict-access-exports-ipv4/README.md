# How to Restrict NFS Access Using IPv4-Based Export Rules

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NFS, IPv4, Security, Export, Access Control, Firewall

Description: Restrict NFS share access to specific IPv4 clients using /etc/exports rules, iptables firewall policies, and TCP wrappers for defense-in-depth security.

## Introduction

NFS has limited built-in authentication-it trusts IP addresses. Securing NFS requires multiple layers: `/etc/exports` defines which IPs can mount, iptables restricts which IPs can even reach NFS ports, and static port assignments for NFSv3 RPC services make those firewall rules predictable. All three layers together provide meaningful access control.

## Layer 1: /etc/exports (Primary Access Control)

```bash
# /etc/exports

# Grant specific IPs read-write

/srv/data  10.0.0.5(rw,sync,no_subtree_check) \
           10.0.0.6(rw,sync,no_subtree_check)

# Grant subnet read-only
/srv/data  192.168.1.0/24(ro,sync,no_subtree_check)

# Deny everyone else (NFS denies by default if not listed)
# No entry needed - unlisted IPs cannot mount

# Verify no wildcard exports exist:
grep "\*" /etc/exports  # Should return nothing for production
```

## Layer 2: iptables (Network-Level Restriction)

```bash
# NFS ports to restrict:
# 111  - portmapper/rpcbind
# 2049 - NFS service
# (Additional ports for NFS v3: mountd, statd, lockd - use static ports)

# Allow NFS only from trusted subnets
sudo iptables -A INPUT -p tcp --dport 2049 -s 10.0.0.0/24 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 2049 -j DROP

sudo iptables -A INPUT -p tcp --dport 111 -s 10.0.0.0/24 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 111 -j DROP

sudo iptables -A INPUT -p udp --dport 111 -s 10.0.0.0/24 -j ACCEPT
sudo iptables -A INPUT -p udp --dport 111 -j DROP

# Save rules
sudo iptables-save | sudo tee /etc/iptables/rules.v4
```

## Layer 3: Static NFS Port Assignment (Makes Firewall Rules Reliable)

```bash
# NFSv3 uses dynamic RPC ports for mountd, statd, lockd
# Fix them so iptables rules work consistently

# /etc/default/nfs-kernel-server (Debian/Ubuntu)
RPCMOUNTDOPTS="--manage-gids --port 2050"

# /etc/default/nfs-common (Debian/Ubuntu) - statd lives here, not in nfs-kernel-server
STATDOPTS="--port 2051 --outgoing-port 2052"

# /etc/sysconfig/nfs (RHEL/CentOS 7; on RHEL 8+ prefer /etc/nfs.conf)
LOCKD_TCPPORT=2053
LOCKD_UDPPORT=2053
MOUNTD_PORT=2050
STATD_PORT=2051
STATD_OUTGOING_PORT=2052

# Now open these fixed ports in iptables:
for port in 111 2049 2050 2051 2052 2053; do
  sudo iptables -A INPUT -p tcp --dport $port -s 10.0.0.0/24 -j ACCEPT
  sudo iptables -A INPUT -p tcp --dport $port -j DROP
  sudo iptables -A INPUT -p udp --dport $port -s 10.0.0.0/24 -j ACCEPT
  sudo iptables -A INPUT -p udp --dport $port -j DROP
done
```

## Audit Access Control

```bash
# Check current exports and their clients
sudo exportfs -v

# Monitor NFS access
sudo nfsstat -s

# Watch for unauthorized mount attempts
sudo journalctl -u nfs-kernel-server -f | grep -i "refused\|denied\|fail"

# Check NFS connections
sudo ss -tnp | grep 2049

# Verify exports match expected clients
sudo showmount -a localhost
```

## Conclusion

Restrict NFS access at multiple layers: `/etc/exports` for mount-level control (only listed IPs can mount) and iptables for network-level control (only listed IPs can reach NFS ports). For NFSv3, fix mountd/statd/lockd to static ports so iptables rules are predictable. Never export to 0.0.0.0/0 or use wildcards in production environments.
