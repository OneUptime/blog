# How to Plan and Design an IdM Deployment on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, IdM, Identity Management, FreeIPA, Kerberos, LDAP, Linux

Description: Learn how to plan and design a Red Hat Identity Management (IdM) deployment on RHEL, including topology, DNS, and certificate authority considerations.

---

Red Hat Identity Management (IdM), based on FreeIPA, provides centralized authentication, authorization, and account management for RHEL environments. Proper planning avoids costly redesigns later. This guide covers the key decisions you need to make before installing.

## Topology Planning

IdM uses a multi-master replication model. Each server holds a full copy of the data.

Key considerations:
- Deploy at least two IdM servers (replicas) for high availability
- Place servers in different physical locations or availability zones
- Keep replication topology simple with no more than 4 replication agreements per server
- For geographically distributed setups, place replicas near users to reduce latency

```bash
# Example topology for two data centers:
# DC1: idm1.example.com (primary)
# DC2: idm2.example.com (replica)
# Both replicate to each other
```

## DNS Planning

IdM can manage DNS or integrate with existing DNS infrastructure:

```bash
# Option 1: IdM with integrated DNS (recommended for simpler setups)
# IdM runs its own BIND DNS server
# Requires DNS delegation from parent zone

# Option 2: IdM without integrated DNS
# Use existing DNS infrastructure
# You must manually create SRV and TXT records:
# _ldap._tcp.example.com.     SRV 0 100 389 idm1.example.com.
# _kerberos._tcp.example.com. SRV 0 100 88  idm1.example.com.
# _kerberos.example.com.      TXT "EXAMPLE.COM"
```

## Certificate Authority Planning

IdM includes a Dogtag CA for certificate management:

- **Integrated CA** (default): IdM generates and manages its own CA hierarchy
- **External CA**: IdM CA is subordinate to your existing enterprise CA
- **No CA**: Use external certificates only (limited functionality)

## Sizing Requirements

```bash
# Minimum hardware per IdM server:
# CPU: 2 cores
# RAM: 4 GB (8 GB for 10,000+ users)
# Disk: 10 GB for /var/lib/dirsrv (grows with user count)

# Check available resources before installation
free -h
df -h /var
nproc
```

## Firewall Requirements

```bash
# Ports that must be open on IdM servers
sudo firewall-cmd --permanent --add-service={freeipa-ldap,freeipa-ldaps,dns,kerberos,kpasswd,http,https,ntp}
sudo firewall-cmd --reload

# Specific ports:
# 80, 443  - HTTP/HTTPS (Web UI, certificate operations)
# 389, 636 - LDAP/LDAPS
# 88, 464  - Kerberos
# 53       - DNS (if using integrated DNS)
```

## Naming Conventions

Choose your Kerberos realm and domain carefully since they cannot be changed after installation:

```bash
# Kerberos realm: EXAMPLE.COM (always uppercase)
# IdM domain: example.com (matches realm in lowercase)
# Server FQDN: idm1.example.com
```

Document your design decisions before beginning installation. Changing the realm name or CA type after deployment requires a complete reinstallation.
