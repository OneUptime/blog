# How to Configure Ceph Client Authentication Settings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Authentication, Security, Client, Storage

Description: Configure Ceph CephX authentication for clients including creating keyrings, setting capabilities, and troubleshooting auth failures.

---

Ceph uses CephX, a shared-secret authentication protocol, to authenticate all clients and daemons. Correctly configuring client authentication is essential for security and access control.

## CephX Overview

CephX uses shared-secret, ticket-based authentication modeled on Kerberos. Each entity (client, OSD, monitor) has a keyring containing a secret key. When a client connects to a monitor, it proves knowledge of the secret without transmitting it directly.

## Creating a Client Keyring

Create a new client with specific capabilities:

```bash
ceph auth get-or-create client.myapp \
  mon 'allow r' \
  osd 'allow rw pool=myapp-pool' \
  -o /etc/ceph/ceph.client.myapp.keyring
```

Capabilities follow the pattern: `allow <permissions> [pool=<pool>]`

Permission values:
- `r` - read
- `w` - write
- `x` - execute (for class calls like RBD snapshots)
- `*` - all permissions

## Viewing Client Capabilities

```bash
# List all auth entries
ceph auth list

# View a specific client
ceph auth get client.myapp
```

## Restricting Access by Namespace

For CephFS clients:

```bash
ceph auth get-or-create client.webserver \
  mon 'allow r' \
  mds 'allow rw path=/web' \
  osd 'allow rw pool=cephfs_data namespace=web' \
  -o /etc/ceph/ceph.client.webserver.keyring
```

## Keyring File Format

A keyring file looks like:

```ini
[client.myapp]
        key = AQB1234567890==
        caps mon = "allow r"
        caps osd = "allow rw pool=myapp-pool"
```

## Distributing Keyrings to Clients

```bash
# Copy keyring to client node
scp /etc/ceph/ceph.client.myapp.keyring client-node:/etc/ceph/

# Verify permissions on client
ls -la /etc/ceph/ceph.client.myapp.keyring
chmod 600 /etc/ceph/ceph.client.myapp.keyring
```

## Testing Authentication

```bash
# On the client node
ceph --id myapp --keyring /etc/ceph/ceph.client.myapp.keyring status
rbd --id myapp -p myapp-pool ls
```

## Rotating a Client Key

```bash
# Delete and recreate to generate a new key
ceph auth del client.myapp
ceph auth get-or-create client.myapp \
  mon 'allow r' \
  osd 'allow rw pool=myapp-pool'
```

## Troubleshooting Auth Failures

```bash
# Check auth log on the monitor
journalctl -u ceph-mon@$(hostname) | grep -i "auth"

# Verify keyring on client
ceph auth print-key client.myapp

# Enable auth debug logging on monitors
ceph config set mon debug_auth 10
ceph config set global auth_cluster_required cephx
```

## Summary

Ceph CephX authentication uses per-client keyrings with fine-grained capabilities. Creating a client involves specifying monitor, OSD, and optionally MDS permissions with pool or path restrictions. Regularly audit client capabilities with `ceph auth list` and rotate keys when credentials may have been compromised.
