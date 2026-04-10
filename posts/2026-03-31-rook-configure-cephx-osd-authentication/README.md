# How to Configure CephX for OSD Authentication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CephX, OSD, Authentication, Security

Description: Configure CephX authentication for Ceph OSDs in Rook to control data access by pool, enforce capability restrictions, and secure OSD-to-OSD communication.

---

OSD authentication in CephX controls which clients can read and write data, and to which pools. Properly scoping OSD capabilities ensures applications can only access the storage they are authorized to use.

## OSD Capability Syntax

OSD capabilities follow this format:

```text
allow [rwx] [pool=<pool>] [object_prefix <prefix>] [namespace=<ns>]
```

Common capability combinations:

| Capability | Meaning |
|------------|---------|
| `allow r` | Read-only access to all pools |
| `allow rw pool=mypool` | Read-write to a specific pool |
| `allow *` | Full access including admin operations |
| `allow rw object_prefix rbd_` | RBD-specific access |

## Create Application Keys with OSD Scope

Create a key for an application with access to a single pool:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph auth get-or-create client.app-prod \
  mon 'allow r' \
  osd 'allow rw pool=app-prod-data'
```

Create a key for a read-only analytics service:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph auth get-or-create client.analytics \
  mon 'allow r' \
  osd 'allow r pool=app-prod-data, allow r pool=app-prod-metadata'
```

## Configure OSD Authentication in CephCluster

Enforce OSD authentication cluster-wide:

```yaml
spec:
  cephConfig:
    global:
      auth_cluster_required: "cephx"
      auth_service_required: "cephx"
```

## OSD Key Rotation

Each OSD has its own key automatically created by Rook. View an OSD key:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph auth get osd.0
```

## RBD-Specific OSD Capabilities

For RBD block storage clients, use the `profile rbd` capability:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph auth get-or-create client.rbd-user \
  mon 'profile rbd' \
  osd 'profile rbd pool=rbd-pool'
```

The `profile rbd` shortcut sets appropriate read/write permissions for RBD operations.

## Verify OSD Authentication

Check that a client key works against the OSD:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph --id app-prod \
  --keyring /tmp/app-prod.keyring \
  osd stat
```

Confirm pool access is restricted:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph --id app-prod osd dump | grep "^pool"
```

## Summary

OSD CephX capabilities enforce data access boundaries at the pool level. Always use `profile rbd` for RBD clients and explicit pool names in OSD capability strings rather than `allow *`. Rook manages OSD-to-OSD keys automatically, but application-facing keys should be created with the minimum required pool access.
