# How to Set Up ceph.conf on Client Nodes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Configuration, Client, Storage, Setup

Description: Learn how to create and configure ceph.conf on client nodes to connect to a Ceph cluster, including monitor addresses, auth settings, and tuning parameters.

---

Every Ceph client needs a minimal `ceph.conf` to know how to reach the cluster's monitors. This file acts as the entry point for the client before it can retrieve the full cluster map.

## Minimal ceph.conf

The minimum required configuration is the cluster FSID and at least one monitor address:

```ini
[global]
fsid = a7f4b2c3-1234-5678-abcd-ef0123456789
mon_initial_members = mon1, mon2, mon3
mon_host = 192.168.1.10, 192.168.1.11, 192.168.1.12
auth_cluster_required = cephx
auth_service_required = cephx
auth_client_required = cephx
```

## Getting the Config from an Admin Node

The simplest way to populate `ceph.conf` on a client is to copy it from an admin node:

```bash
scp ceph-admin:/etc/ceph/ceph.conf /etc/ceph/ceph.conf
scp ceph-admin:/etc/ceph/ceph.client.admin.keyring /etc/ceph/
```

For a non-admin client, copy only the client keyring:

```bash
scp ceph-admin:/etc/ceph/ceph.client.myapp.keyring /etc/ceph/
```

## Using the Ceph Config Database (Nautilus+)

Since Ceph Nautilus, clients can bootstrap from just the monitor addresses and then pull the rest from the config database:

```bash
ceph config generate-minimal-conf > /etc/ceph/ceph.conf
```

On the client:

```bash
ceph --conf /etc/ceph/ceph.conf config get global mon_host
```

## Client-Specific Sections

You can add client-specific tunables using the `[client]` section or a named section:

```ini
[global]
fsid = a7f4b2c3-1234-5678-abcd-ef0123456789
mon_host = 192.168.1.10, 192.168.1.11, 192.168.1.12

[client]
rbd_cache = true
rbd_cache_size = 67108864
rbd_cache_max_dirty = 50331648
log_file = /var/log/ceph/ceph-client.log

[client.myapp]
keyring = /etc/ceph/ceph.client.myapp.keyring
```

## Specifying Alternate Config Files

Clients can use a non-default config location:

```bash
ceph --conf /opt/myapp/ceph.conf --user myapp status
rbd --conf /opt/myapp/ceph.conf --user myapp -p mypool ls
```

Or via environment variable:

```bash
export CEPH_CONF=/opt/myapp/ceph.conf
export CEPH_KEYRING=/opt/myapp/ceph.client.myapp.keyring
ceph status
```

## Verifying the Config

```bash
# Show effective config values
ceph --show-config | grep mon_host

# Test connectivity
ceph -s
ping -c 3 192.168.1.10
```

## Using DNS for Monitor Discovery

Instead of hardcoding IPs, use DNS:

```ini
[global]
mon_host = ceph-mon.example.com
```

Update your DNS to return all monitor addresses for `ceph-mon.example.com`.

## Summary

Setting up `ceph.conf` on client nodes requires at minimum the cluster FSID and monitor addresses. Copy the file from an admin node for simplicity, or generate a minimal version using `ceph config generate-minimal-conf`. Add client-specific tuning in the `[client]` section, and always restrict keyring file permissions to `600` for security.
