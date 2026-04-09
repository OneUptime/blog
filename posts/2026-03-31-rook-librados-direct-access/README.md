# How to Understand librados for Direct Object Access in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, librados, RADOS, Storage, SDK

Description: Learn how to use librados to access Ceph object storage directly from applications, bypassing higher-level abstractions for maximum control and performance.

---

## What Is librados

librados is the native Ceph client library that provides direct access to the RADOS object store. All higher-level Ceph interfaces (librbd for block storage, libcephfs for filesystem, and the RGW gateway) are built on top of librados. Applications that use librados directly can avoid the overhead of these layers and interact with objects using the full power of the RADOS API.

librados bindings are available for C, C++, Python, Java, and PHP.

## When to Use librados

Use librados when you need:
- Custom object naming and metadata not supported by S3/Swift
- Server-side computation via object class methods
- Atomic multi-operation transactions (compare-and-swap, conditional writes)
- Direct OMap access for structured key-value storage
- Maximum throughput for bulk object workloads

## Python Example: Basic RADOS Operations

```python
import rados

# Connect to Ceph cluster
cluster = rados.Rados(conffile='/etc/ceph/ceph.conf',
                      conf={'keyring': '/etc/ceph/keyring'})
cluster.connect()

# Open an I/O context for a pool
ioctx = cluster.open_ioctx('mypool')

# Write an object
ioctx.write_full('my-object', b'Hello from librados!')

# Read the object back
data = ioctx.read('my-object')
print(data.decode())

# Get object size and modification time
size, mtime = ioctx.stat('my-object')
print(f"Size: {size}, Modified: {mtime}")

# Delete the object
ioctx.remove_object('my-object')

# Clean up
ioctx.close()
cluster.shutdown()
```

## Working with Extended Attributes (Xattrs)

```python
# Set extended attributes
ioctx.set_xattr('my-object', 'content-type', b'application/json')
ioctx.set_xattr('my-object', 'created-by', b'myapp-v1')

# Get an xattr
value = ioctx.get_xattr('my-object', 'content-type')
print(value.decode())

# List all xattrs
for key, value in ioctx.get_xattrs('my-object'):
    print(f"{key}: {value.decode()}")
```

## Working with OMap (Key-Value Store)

```python
# Write omap entries (structured metadata)
with rados.WriteOpCtx() as op:
    ioctx.set_omap(op, ('field1', 'field2', 'counter'),
                       (b'value1', b'value2', b'42'))
    ioctx.operate_write_op(op, 'my-object')

# Read omap entries by keys
with rados.ReadOpCtx() as op:
    omap_iter, ret = ioctx.get_omap_vals_by_keys(op, ('field1', 'counter'))
    ioctx.operate_read_op(op, 'my-object')
    for key, value in omap_iter:
        print(f"{key}: {value.decode()}")

# Iterate over all omap entries
with rados.ReadOpCtx() as op:
    omap_iter, ret = ioctx.get_omap_vals(op, '', '', 100)
    ioctx.operate_read_op(op, 'my-object')
    for key, value in omap_iter:
        print(f"{key}: {value}")
```

## Atomic Write Operations

librados supports compare-and-swap via write operations:

```python
# Create an atomic write operation
with rados.WriteOpCtx() as op:
    # Conditional: only write if xattr equals expected value
    op.cmpxattr('version', rados.LIBRADOS_CMPXATTR_OP_EQ, b'1')
    op.write_full(b'new content')
    op.set_xattr('version', b'2')

    try:
        ioctx.operate_write_op(op, 'my-object')
        print("Conditional write succeeded")
    except rados.OSError as e:
        print(f"Condition failed: {e}")
```

## Connecting from a Kubernetes Pod

To use librados from a pod running alongside Rook-Ceph:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: librados-app
  namespace: rook-ceph
spec:
  containers:
    - name: app
      image: myapp:latest
      env:
        - name: CEPH_CONF
          value: /etc/ceph/ceph.conf
      volumeMounts:
        - name: ceph-config
          mountPath: /etc/ceph
  volumes:
    - name: ceph-config
      secret:
        secretName: rook-ceph-admin-keyring
```

## Summary

librados provides the most direct and flexible interface to Ceph's object store. It supports rich operations beyond simple read/write: extended attributes, omap key-value storage, atomic conditional writes, and server-side object class method calls. Applications that require custom storage semantics, bulk throughput optimization, or structured metadata management benefit from accessing RADOS directly through librados rather than through S3, RBD, or CephFS abstractions.
