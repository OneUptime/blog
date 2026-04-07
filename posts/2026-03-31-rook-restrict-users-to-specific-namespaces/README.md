# How to Restrict Users to Specific Namespaces in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Authentication

Description: Learn how to use Ceph RADOS namespaces to isolate user access within a single pool, restricting clients to a specific namespace in Rook deployments.

---

## What Are RADOS Namespaces

RADOS namespaces provide a logical partitioning mechanism within a single Ceph pool. Objects within different namespaces in the same pool are isolated from each other, and user capabilities can be scoped to a specific namespace. This allows multiple tenants to share a pool without being able to see each other's data.

Note: RADOS namespaces are different from Kubernetes namespaces. They are a Ceph-level concept within RADOS.

## Namespace Restriction in Capabilities

To restrict a user to a specific RADOS namespace, use the `namespace` keyword in OSD caps:

```bash
ceph auth get-or-create client.tenant1 \
  mon 'allow r' \
  osd 'allow rw pool=shared-pool namespace=tenant1-ns'
```

This user can only read and write objects in the `tenant1-ns` namespace within `shared-pool`.

## Combining Pool and Namespace Restrictions

Restrict a user to multiple namespaces across pools:

```bash
ceph auth get-or-create client.multiapp \
  mon 'allow r' \
  osd 'allow rw pool=data namespace=appA, allow r pool=data namespace=shared'
```

## Creating Namespaces in RADOS

RADOS namespaces do not need to be explicitly created - they exist implicitly when the first object is written with that namespace. To verify namespaces in use:

```bash
# List objects in a specific namespace
rados -p shared-pool -N tenant1-ns ls
```

## Testing Namespace Isolation

Verify that namespace restriction works correctly:

```bash
# Create a test object in tenant1-ns
rados -p shared-pool -N tenant1-ns put testobj /tmp/testfile

# Verify tenant1 user can access it
rados --name client.tenant1 --keyring /tmp/tenant1.keyring \
  -p shared-pool -N tenant1-ns get testobj /tmp/retrieved

# Verify tenant1 user cannot access tenant2-ns
rados --name client.tenant1 --keyring /tmp/tenant1.keyring \
  -p shared-pool -N tenant2-ns ls
```

The last command should return:

```text
error listing shared-pool/tenant2-ns: (1) Operation not permitted
```

## Using Namespaces with RBD

RBD images can use RADOS namespaces. To create and restrict access to RBD images within a namespace:

```bash
# Create RBD namespace
rbd namespace create mypool/mynamespace

# Create user with namespace-scoped RBD access
ceph auth get-or-create client.rbd-ns-user \
  mon 'profile rbd' \
  osd 'allow rwx pool=mypool namespace=mynamespace'
```

Rook's `CephBlockPool` CRD also supports namespaces for isolation between workloads sharing the same pool.

## Ceph RADOS Namespace vs Kubernetes Namespace

It is important not to confuse these two concepts:

| Concept | Scope | Purpose |
|---|---|---|
| Kubernetes namespace | Cluster-wide | Isolate Kubernetes resources |
| RADOS namespace | Within a Ceph pool | Isolate objects in storage |

A single Kubernetes namespace may use multiple RADOS namespaces, or a RADOS namespace may serve multiple Kubernetes namespaces.

## Listing Objects Across Namespaces

To audit all namespaces in a pool from the Rook toolbox:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash

# List all objects in all namespaces
rados -p shared-pool ls --all
```

Sample output:

```text
tenant1-ns    object1
tenant1-ns    object2
tenant2-ns    object3
```

## Summary

Ceph RADOS namespaces allow multiple tenants to share a pool while maintaining object-level isolation. Restrict user access to specific namespaces using `namespace=<name>` in OSD capability strings. Test isolation by attempting cross-namespace access with a restricted user. This pattern is useful in Rook environments where multiple applications or teams share a single CephBlockPool.
