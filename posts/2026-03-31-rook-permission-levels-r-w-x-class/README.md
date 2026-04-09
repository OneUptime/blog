# How to Set Permission Levels (r, w, x, class-read, class-write) in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Authentication

Description: Learn how Ceph permission levels r, w, x, class-read, and class-write work and how to apply them correctly in capability strings for Rook users.

---

## Ceph OSD Permission Levels

Ceph OSD capabilities support five distinct permission levels. Understanding what each level grants is essential for implementing least-privilege access.

| Permission | Meaning |
|---|---|
| `r` | Read - can read objects |
| `w` | Write - can write and delete objects |
| `x` | Execute - can call object class methods |
| `class-read` | Can call read-only class methods |
| `class-write` | Can call write class methods |

## The r Permission

`allow r` grants read access to objects in a pool. A client with only read permission can fetch objects but cannot create, modify, or delete them:

```bash
ceph auth get-or-create client.reader \
  mon 'allow r' \
  osd 'allow r pool=data'
```

Use case: backup agents, analytics pipelines, and monitoring tools that need to read data but must not modify it.

## The w Permission

`allow w` grants write access, which includes creating, updating, and deleting objects. Note that `w` alone without `r` would allow writes but not reads - this is rarely useful in practice:

```bash
ceph auth get-or-create client.writer \
  mon 'allow r' \
  osd 'allow rw pool=data'
```

`rw` together is the most common combination for application users that need full object access.

## The x Permission

`allow x` permits the client to call Ceph object class methods (RADOS classes). These are server-side functions that operate on objects. RBD and CephFS both rely heavily on object classes.

```bash
ceph auth get-or-create client.rbd-client \
  mon 'allow r' \
  osd 'allow rwx pool=rbd'
```

Without `x`, RBD operations such as creating images and managing snapshots will fail because they use RADOS class calls.

## class-read and class-write

These are fine-grained alternatives to `x`. `class-read` allows only read-type class method calls, and `class-write` allows write-type class method calls:

```bash
# Read-only class access
ceph auth get-or-create client.class-reader \
  mon 'allow r' \
  osd 'allow r class-read pool=data'

# Write class access for RBD-like workloads
ceph auth get-or-create client.rbd-restricted \
  mon 'allow r' \
  osd 'allow rw class-read class-write pool=rbd'
```

In practice, `allow *` includes all permissions including class calls. When using explicit permissions, RBD requires both `rw` and class access:

```bash
osd 'allow rw class-read class-write pool=rbd'
```

This is equivalent to `allow rwx pool=rbd`.

## Combining Permissions

Permissions can be combined in a single rule:

```bash
# Read and execute class methods, but no writes
osd 'allow rx pool=readonly-rbd'

# Full access with class support
osd 'allow rwx pool=rbd'

# Different access per pool
osd 'allow r pool=logs, allow rwx pool=rbd'
```

## Rook CSI Driver Requirements

Rook's CSI driver users need class-level permissions for RBD:

```bash
# RBD node user - needs rwx for snapshot operations
osd 'profile rbd pool=mypool'
```

Using `profile rbd` is equivalent to `rwx` plus class access for the specified pool, which is the recommended approach for Rook CSI users.

## Least Privilege Examples

Match the permission to the actual need:

```bash
# Backup agent - read only
ceph auth get-or-create client.backup mon 'allow r' osd 'allow r'

# RBD application - full block storage
ceph auth get-or-create client.rbd-app mon 'allow r' osd 'allow rwx pool=rbd'

# Log writer - write only to logs pool
ceph auth get-or-create client.logger mon 'allow r' osd 'allow w pool=logs'
```

## Summary

Ceph OSD permissions are `r` (read), `w` (write), `x` (execute class methods), `class-read`, and `class-write`. Use `rw` for general application access, `rwx` for RBD workloads that need object class methods, and `r` only for read-only consumers. The `profile rbd` shorthand includes the appropriate rwx and class permissions for RBD clients in Rook CSI deployments.
