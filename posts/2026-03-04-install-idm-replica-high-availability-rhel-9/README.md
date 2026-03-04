# How to Install an IdM Replica for High Availability on RHEL 9

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: RHEL, IdM, Identity Management, High Availability, Replica, Linux

Description: Learn how to install an IdM replica on RHEL 9 to provide high availability and geographic redundancy for your identity management infrastructure.

---

A single IdM server is a single point of failure for authentication across your entire RHEL infrastructure. Installing replicas ensures that users can still authenticate and services continue to function even if the primary server goes down. Replicas maintain a full copy of all IdM data through multi-master replication.

## Prerequisites

- An existing IdM server (primary) running on RHEL 9
- A new RHEL 9 system for the replica
- Network connectivity between the servers
- DNS resolution working for both servers
- Firewall ports open for IdM services

## Preparing the Replica Host

Set the hostname:

```bash
sudo hostnamectl set-hostname idm2.example.com
```

Configure DNS to point to the primary IdM server:

```bash
sudo nmcli connection modify ens192 ipv4.dns "192.168.1.10"
sudo nmcli connection up ens192
```

Verify DNS resolution:

```bash
dig idm1.example.com
dig idm2.example.com
```

## Installing Required Packages

```bash
sudo dnf module enable idm:DL1
sudo dnf distro-sync
sudo dnf install ipa-server ipa-server-dns
```

## Opening Firewall Ports

```bash
sudo firewall-cmd --add-service=freeipa-ldap --permanent
sudo firewall-cmd --add-service=freeipa-ldaps --permanent
sudo firewall-cmd --add-service=dns --permanent
sudo firewall-cmd --add-service=ntp --permanent
sudo firewall-cmd --reload
```

## Enrolling as a Client First

The replica host must first be enrolled as an IdM client:

```bash
sudo ipa-client-install --domain=example.com --realm=EXAMPLE.COM --server=idm1.example.com
```

## Promoting to a Replica

On the primary server, obtain a Kerberos ticket:

```bash
kinit admin
```

On the replica host, run the replica installation:

```bash
sudo ipa-replica-install --setup-dns --forwarder=8.8.8.8
```

For non-interactive installation:

```bash
sudo ipa-replica-install \
    --setup-dns \
    --forwarder=8.8.8.8 \
    --setup-ca \
    --no-reverse \
    --unattended
```

The `--setup-ca` flag installs a CA replica so the replica can issue certificates independently.

## Verifying the Replica

On the replica, check service status:

```bash
ipactl status
```

Check replication topology:

```bash
ipa topologysegment-find domain
ipa topologysegment-find ca
```

Verify data replication by creating a test user on the primary:

```bash
# On primary
ipa user-add testuser --first=Test --last=User

# On replica (may take a few seconds to replicate)
ipa user-find testuser
```

## Checking Replication Status

```bash
ipa-replica-manage list
ipa-replica-manage list-ruv
```

Check for replication errors:

```bash
ipa-replica-manage list-conflicts
```

## Managing Topology

View the replication topology:

```bash
ipa topologysegment-find domain
```

Add a replication agreement between two replicas:

```bash
ipa topologysegment-add domain \
    --left=idm2.example.com \
    --right=idm3.example.com \
    segment-name
```

## Testing Failover

Stop the primary server:

```bash
# On primary
sudo ipactl stop
```

On a client, verify authentication still works:

```bash
kinit admin
ipa user-find
```

The client should automatically fail over to the replica.

Restart the primary:

```bash
sudo ipactl start
```

## Adding DNS to an Existing Replica

If you installed a replica without DNS:

```bash
sudo ipa-dns-install --forwarder=8.8.8.8
```

## Adding CA to an Existing Replica

If you installed a replica without a CA:

```bash
sudo ipa-ca-install
```

## Removing a Replica

If you need to decommission a replica:

```bash
# On the replica being removed
sudo ipa-server-install --uninstall

# On another server, clean up the topology
ipa server-del idm2.example.com
```

## Best Practices

- Deploy at least 2 replicas for production
- Place replicas in different physical locations or availability zones
- Ensure each replica has at least 2 replication agreements
- Monitor replication lag and conflicts
- Test failover periodically
- Include replicas in your backup strategy

## Summary

IdM replicas on RHEL 9 provide high availability for your identity management infrastructure through multi-master replication. Install replicas by first enrolling the host as a client, then promoting it with `ipa-replica-install`. Include `--setup-dns` and `--setup-ca` to make each replica fully independent. Test failover regularly and monitor replication status to ensure your identity infrastructure remains reliable.
