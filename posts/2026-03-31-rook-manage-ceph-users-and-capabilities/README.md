# How to Manage Ceph Users and Capabilities

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Authentication, User, Capability

Description: Learn how to create, modify, and delete Ceph users and configure their capabilities for pools, monitors, and object storage.

---

## Ceph User Model

Ceph uses CephX for authentication. Each user is identified by a type and name in the format `type.name`, for example `client.admin` or `client.myapp`. Users have capabilities (caps) that control what they can access on monitors, OSDs, and MDS daemons.

## Listing Users

View all users in the cluster:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph auth list
```

Get a specific user's key and capabilities:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph auth get client.admin
```

## Creating a New User

Create a user with read-only access to monitors and read/write access to a specific pool:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph auth get-or-create client.myapp \
    mon 'allow r' \
    osd 'allow rw pool=mypool'
```

For RGW (object storage) users, create them via the RGW admin API:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin user create \
    --uid=myuser \
    --display-name="My Application User" \
    --email=myuser@example.com
```

## Capability Syntax

Capabilities use a simple allow-based syntax:

```text
mon 'allow r'                    - read-only monitor access
osd 'allow rw pool=mypool'       - read/write on one pool
osd 'allow *'                    - full OSD access
mds 'allow'                      - basic MDS access
mgr 'allow r'                    - read-only manager access
```

You can combine multiple pools:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph auth get-or-create client.app \
    mon 'allow r' \
    osd 'allow rw pool=data, allow r pool=metadata'
```

## Modifying User Capabilities

Update an existing user's capabilities:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph auth caps client.myapp \
    mon 'allow r' \
    osd 'allow rw pool=mypool, allow r pool=archive'
```

## Exporting Keys as Kubernetes Secrets

In Rook, store CephX keys as Kubernetes Secrets for application use:

```bash
KEYRING=$(kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph auth get client.myapp 2>/dev/null)

kubectl create secret generic ceph-myapp-keyring \
  --from-literal=keyring="$KEYRING" \
  -n myapp-namespace
```

## Deleting a User

Remove a user when it is no longer needed:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph auth del client.myapp
```

## Printing a User's Key Only

To get just the secret key for use in application config:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph auth get-key client.myapp
```

## Summary

Ceph user management revolves around creating users with appropriate capabilities using `ceph auth get-or-create`. Capabilities are scoped per service (mon, osd, mds, mgr) and per pool. In Rook environments, export CephX keys as Kubernetes Secrets for application consumption. Audit users regularly with `ceph auth list` and delete unused accounts to maintain a minimal attack surface.
