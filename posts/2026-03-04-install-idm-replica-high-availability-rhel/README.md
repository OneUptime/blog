# How to Install an IdM Replica for High Availability on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, IdM, FreeIPA, High Availability, Replicas, Identity Management, Linux

Description: Learn how to install an IdM replica on RHEL to provide high availability for your identity management infrastructure with multi-master replication.

---

An IdM replica is a full copy of the IdM server with multi-master replication. If one server goes down, clients automatically fail over to the replica. You should always have at least two IdM servers in production.

## Prerequisites

Ensure the first IdM server is installed and running, and the replica host is enrolled as an IdM client:

```bash
# On the replica host, set the hostname
sudo hostnamectl set-hostname idm2.example.com

# Install IdM client packages first
sudo dnf module enable idm:DL1 -y
sudo dnf install -y ipa-server ipa-server-dns

# Enroll as an IdM client (if not already done)
sudo ipa-client-install \
  --domain=example.com \
  --realm=EXAMPLE.COM \
  --server=idm1.example.com \
  --unattended \
  --principal=admin \
  --password='AdminPassword123'
```

## Installing the Replica

```bash
# On the first IdM server, get a Kerberos ticket
kinit admin

# Install the replica with CA and DNS
sudo ipa-replica-install \
  --setup-dns \
  --forwarder=8.8.8.8 \
  --setup-ca

# The installer automatically:
# - Replicates the LDAP database
# - Sets up Kerberos KDC
# - Configures the CA
# - Sets up DNS
# This can take 15-30 minutes
```

## Configuring the Firewall

```bash
# Open required ports on the replica
sudo firewall-cmd --permanent --add-service={freeipa-ldap,freeipa-ldaps,dns,kerberos,kpasswd,http,https}
sudo firewall-cmd --reload
```

## Verifying Replication

```bash
# Check replication topology
kinit admin
ipa topologysegment-find suffix-name=domain
ipa topologysegment-find suffix-name=ca

# Check replication status from either server
ipa-replica-manage list
ipa-replica-manage list -v

# Test that data replicates
# Create a user on the first server
ipa user-add testuser --first=Test --last=User

# Verify it appears on the replica
ipa user-find testuser
```

## Verifying High Availability

```bash
# Check all services on the replica
ipactl status

# Verify DNS failover
dig @idm2.example.com example.com SOA

# Test authentication against the replica directly
kinit -S idm2.example.com admin
```

## Monitoring Replication Health

```bash
# Check for replication errors
ipa-healthcheck --source=ipahealthcheck.ds.replication

# View replication agreements
ipa topologysegment-find domain

# Check if servers are in sync
ipa-replica-manage force-sync --from=idm1.example.com
```

With a replica in place, IdM clients automatically discover available servers via DNS SRV records. If the primary server becomes unavailable, clients seamlessly use the replica for authentication and lookups.
