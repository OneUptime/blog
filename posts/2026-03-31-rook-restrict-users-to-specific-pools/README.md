# How to Restrict Users to Specific Pools in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Authentication

Description: Learn how to restrict Ceph user access to specific storage pools using capability strings to enforce pool-level isolation in Rook clusters.

---

## Why Restrict Users to Pools

By default, a Ceph user with `allow rw` OSD capabilities has access to all pools. In multi-tenant environments or when running multiple applications on a shared Ceph cluster, pool-level isolation ensures that:

- Application A cannot read or write Application B's data
- A compromised key only exposes one pool's data
- Access auditing is simpler when each user maps to specific pools

## Basic Pool Restriction

To restrict a user to a single pool, specify the pool name in the OSD capability:

```bash
ceph auth get-or-create client.appA \
  mon 'allow r' \
  osd 'allow rw pool=app-a-data'
```

This user can only read and write to the `app-a-data` pool. Any attempt to access another pool results in a permission denied error.

## Restricting to Multiple Pools

Grant access to several pools with comma-separated rules:

```bash
ceph auth get-or-create client.appB \
  mon 'allow r' \
  osd 'allow rw pool=app-b-primary, allow rw pool=app-b-logs'
```

## Mixed Read/Write Access

Give read access to one pool and read-write to another:

```bash
ceph auth get-or-create client.analytics \
  mon 'allow r' \
  osd 'allow r pool=raw-events, allow rw pool=analytics-results'
```

## Pool Restriction with RBD Profile

For RBD block storage, use the `profile rbd` shorthand with a pool name:

```bash
ceph auth get-or-create client.rbd-appA \
  mon 'profile rbd' \
  osd 'profile rbd pool=rbd-app-a'
```

The `profile rbd` in the OSD cap automatically includes `rwx` and class-level access for the specified pool.

## Verifying Pool Restrictions

Test that the restriction works by attempting to access a non-authorized pool:

```bash
# Set up test
ceph auth get-or-create client.restricted \
  mon 'allow r' \
  osd 'allow rw pool=allowed-pool'

ceph auth get client.restricted -o /tmp/test.keyring

# This should succeed
rados --keyring /tmp/test.keyring --name client.restricted -p allowed-pool ls

# This should fail
rados --keyring /tmp/test.keyring --name client.restricted -p other-pool ls
```

Expected error on unauthorized pool:

```text
RADOS returned error: -13 (Permission denied)
```

## Kubernetes StorageClass with Pool Restrictions

In Rook, when creating a StorageClass for a specific application, use a pool-restricted user:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rook-ceph-app-a
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  pool: app-a-data
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-rbd-node
```

Create a dedicated provisioner secret using a pool-restricted user for tighter isolation.

## Creating Pool-Per-Tenant Pattern

For multi-tenant Kubernetes environments:

```bash
#!/bin/bash
TENANTS=("tenant1" "tenant2" "tenant3")
for tenant in "${TENANTS[@]}"; do
  # Create pool
  ceph osd pool create "${tenant}-data" 32
  ceph osd pool application enable "${tenant}-data" rbd

  # Create user restricted to that pool
  ceph auth get-or-create "client.${tenant}" \
    mon 'allow r' \
    osd "allow rw pool=${tenant}-data"

  echo "Created pool and user for ${tenant}"
done
```

## Summary

Restrict Ceph users to specific pools by specifying `pool=<name>` in OSD capability strings. Use comma-separated rules for multiple pools and mixed read/write combinations. For RBD users, use `profile rbd pool=<name>` as the shorthand. This pool-per-tenant pattern is especially valuable in Rook-managed Kubernetes clusters running multiple applications on shared storage.
