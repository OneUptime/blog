# How to Use the ceph auth Command Suite

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CLI, Authentication, Authorization, Security, Keyring

Description: Manage Ceph authentication using the ceph auth commands to create, list, modify, and revoke client credentials and capability sets.

---

## Introduction

Ceph uses a capability-based authentication system called CephX. The `ceph auth` command suite manages authentication entities - clients, OSDs, MDSes, and RGW instances. Understanding these commands is essential for securing cluster access and troubleshooting authentication failures.

## Listing All Auth Entities

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash

ceph auth ls
```

Output shows all entities with their capabilities:

```text
client.admin
    key: AQBxyz...
    caps: [mds] allow
    caps: [mgr] allow *
    caps: [mon] allow *
    caps: [osd] allow *
```

## Creating a New Client

Create a client with specific capabilities:

```bash
ceph auth get-or-create client.myapp \
  mon 'allow r' \
  osd 'allow rwx pool=myapp-pool' \
  -o /etc/ceph/ceph.client.myapp.keyring
```

Capability shorthand:

- `r` - Read
- `w` - Write
- `x` - Execute (e.g., class methods)
- `*` - All capabilities

## Getting an Existing Client's Key

```bash
ceph auth get client.myapp
ceph auth get-key client.myapp
```

Export to keyring file:

```bash
ceph auth get client.myapp -o client.myapp.keyring
```

## Modifying Client Capabilities

```bash
# Update capabilities for an existing client
ceph auth caps client.myapp \
  mon 'allow r' \
  osd 'allow rwx pool=myapp-pool, allow r pool=shared-pool'
```

## Creating a Read-Only Client

```bash
ceph auth get-or-create client.readonly \
  mon 'allow r' \
  osd 'allow r'
```

## Creating an RBD Client

For a client that only accesses RBD volumes:

```bash
ceph auth get-or-create client.rbd-user \
  mon 'profile rbd' \
  osd 'profile rbd pool=rbd-pool'
```

## Deleting a Client

```bash
ceph auth del client.myapp
```

## Rotating Keys

Ceph does not rotate keys automatically. To rotate:

```bash
# Delete and recreate
ceph auth del client.myapp
ceph auth get-or-create client.myapp \
  mon 'allow r' \
  osd 'allow rwx pool=myapp-pool'

# Update the Kubernetes secret with the new key
NEW_KEY=$(ceph auth get-key client.myapp)
kubectl -n rook-ceph create secret generic client-myapp-keyring \
  --from-literal=key=$NEW_KEY \
  --dry-run=client -o yaml | kubectl apply -f -
```

## Importing a Keyring into Kubernetes

```bash
ceph auth get client.myapp -o /tmp/myapp.keyring

kubectl -n myapp-namespace create secret generic ceph-client-keyring \
  --from-file=keyring=/tmp/myapp.keyring
```

## Summary

The `ceph auth` command suite provides complete management of CephX authentication entities. Creating least-privilege clients - granting only the specific pool access and capabilities needed - is a security best practice. Storing generated keyrings as Kubernetes Secrets allows application pods to authenticate with Ceph without embedding credentials in container images.
