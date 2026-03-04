# How to Plan and Design an IdM Deployment on RHEL 9

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: RHEL, IdM, Identity Management, FreeIPA, Planning, Linux

Description: Learn how to plan and design a Red Hat Identity Management (IdM) deployment on RHEL 9, including topology, DNS, and sizing considerations.

---

Red Hat Identity Management (IdM) provides centralized authentication, authorization, and account management for RHEL environments. Based on the FreeIPA project, IdM integrates LDAP, Kerberos, DNS, and certificate authority services into a single solution. Proper planning before deployment prevents costly redesigns and ensures a reliable identity infrastructure.

## What IdM Provides

IdM bundles several services:

- **389 Directory Server** - LDAP directory for user, group, and host data
- **MIT Kerberos** - Authentication protocol for single sign-on
- **Dogtag Certificate System** - Certificate authority for issuing and managing certificates
- **BIND DNS** - Optional integrated DNS management
- **SSSD** - System Security Services Daemon for client authentication

## Deployment Topology Decisions

### Single Server vs. Replicated

A single IdM server is a single point of failure. Always deploy at least two servers (one primary, one replica) for production environments.

Recommended topologies:

- **Small environment (up to 50 hosts)**: 2 IdM servers
- **Medium environment (50-500 hosts)**: 3-4 IdM servers
- **Large environment (500+ hosts)**: 4+ IdM servers with geographic distribution

### Topology Rules

- Each replica should be connected to at least two other replicas
- Do not create more than 4 replication agreements per server
- Keep the maximum number of hops between any two servers to 3 or fewer

## DNS Planning

### Integrated DNS vs. External DNS

**Integrated DNS (recommended):**
- IdM manages DNS zones and records automatically
- Simplifies Kerberos and service discovery
- Less administrative overhead

**External DNS:**
- Use when DNS is managed by a different team or system
- Requires manual creation of SRV and TXT records
- More initial setup work

### Required DNS Records

If using external DNS, you must create:

```text
_kerberos._udp.example.com.     SRV  0 100 88  idm1.example.com.
_kerberos._tcp.example.com.     SRV  0 100 88  idm1.example.com.
_kerberos-master._udp.example.com. SRV 0 100 88 idm1.example.com.
_kpasswd._udp.example.com.      SRV  0 100 464 idm1.example.com.
_ldap._tcp.example.com.         SRV  0 100 389 idm1.example.com.
_kerberos.example.com.          TXT  "EXAMPLE.COM"
```

## Naming Conventions

### Realm Name

The Kerberos realm should be your DNS domain in uppercase:

- DNS domain: `example.com`
- Kerberos realm: `EXAMPLE.COM`

### Server Naming

Use descriptive hostnames:

```text
idm1.example.com  (primary server)
idm2.example.com  (replica)
idm3.example.com  (replica in secondary site)
```

## Hardware Sizing

### Minimum Requirements per Server

| Component | Small (<1000 users) | Medium (1000-10000) | Large (10000+) |
|-----------|--------------------|--------------------|----------------|
| CPU | 2 cores | 4 cores | 8+ cores |
| RAM | 4 GB | 8 GB | 16+ GB |
| Disk | 20 GB | 50 GB | 100+ GB |

### Disk Layout

Recommended partition layout:

```text
/              20 GB
/var/lib/dirsrv  Depends on user count (estimate 1 KB per entry)
/var/log       10 GB (LDAP and Kerberos logs)
```

## Certificate Authority Planning

### Integrated CA (recommended)

IdM includes a full certificate authority based on Dogtag:

- Issues certificates for hosts and services automatically
- Manages certificate lifecycle
- Integrates with Kerberos for PKINIT

### External CA

Use an external CA when:

- Your organization requires certificates from a specific CA
- Compliance mandates a particular certificate chain
- You need to integrate with an existing PKI

## Firewall Requirements

IdM servers need these ports open:

| Port | Protocol | Service |
|------|----------|---------|
| 80 | TCP | HTTP (redirect to HTTPS) |
| 443 | TCP | HTTPS (Web UI) |
| 389 | TCP | LDAP |
| 636 | TCP | LDAPS |
| 88 | TCP/UDP | Kerberos |
| 464 | TCP/UDP | Kerberos password change |
| 53 | TCP/UDP | DNS (if integrated) |
| 123 | UDP | NTP |

## Integration Planning

### Active Directory Integration

If you have AD, plan for:

- Cross-forest trust (recommended for coexistence)
- ID ranges that do not conflict with AD
- DNS forwarding between IdM and AD domains

### Client Enrollment

Plan how clients will be enrolled:

- **Manual enrollment**: `ipa-client-install` on each host
- **Automated enrollment**: Kickstart or Ansible automation
- **One-time passwords**: For unattended enrollment

## Migration Planning

If migrating from LDAP or NIS:

1. Export existing user and group data
2. Map attributes to IdM schema
3. Plan password migration (users reset or migrate hashes)
4. Test with a pilot group before full migration

## Backup Strategy

Plan for regular backups:

```bash
# Full server backup
ipa-backup

# Data-only backup
ipa-backup --data
```

Store backups off-site and test restoration periodically.

## Summary

Planning an IdM deployment on RHEL 9 requires decisions about topology, DNS integration, certificate authority configuration, and hardware sizing. Always deploy at least two servers for redundancy, use integrated DNS when possible, and plan firewall rules and client enrollment before installation. Proper planning ensures a stable identity management infrastructure that scales with your organization.
