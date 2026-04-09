# Validation Summary: How to Understand librados for Direct Object Access in Ceph

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph RADOS object store
- librados Python bindings (`rados` module)
- Rook-Ceph (Kubernetes operator)
- Kubernetes Pod configuration

## Sources Consulted
- Ceph official Python librados documentation: https://docs.ceph.com/en/latest/rados/api/python/
- Ceph librados introduction (language bindings): https://docs.ceph.com/en/latest/rados/api/librados-intro/
- Ceph source code (rados.pyx): https://github.com/ceph/ceph/blob/main/src/pybind/rados/rados.pyx
- Ceph librados header (constants): https://github.com/ceph/ceph/blob/main/src/include/rados/librados.h

## Issues Found

1. **Incorrect language bindings list (line 15):** Ruby was listed as an official librados binding. The official bindings are C, C++, Python, Java, and PHP. Ruby is not officially supported by the Ceph project. Removed Ruby from the list.

2. **OMap write example used incorrect API (lines 77-83):** `ioctx.set_omap('my-object', dict)` is not a valid call. The `set_omap` method requires a `WriteOpCtx` as the first argument, keys as a tuple, and values as a separate tuple. Rewrote to use `WriteOpCtx` with `ioctx.set_omap(op, keys_tuple, vals_tuple)` and `ioctx.operate_write_op(op, oid)`.

3. **OMap read-by-keys example used incorrect API (lines 85-89):** `ioctx.get_omap_vals_by_keys('my-object', keys)` is not valid. This method requires a `ReadOpCtx` as the first argument. Rewrote to use `ReadOpCtx` with `ioctx.get_omap_vals_by_keys(op, keys_tuple)` and `ioctx.operate_read_op(op, oid)`.

4. **OMap iterate example used wrong method name (line 93):** `ioctx.operate_read('my-object', op)` should be `ioctx.operate_read_op(op, 'my-object')`. The correct method is `operate_read_op` with the operation context as the first argument and the object ID as the second.

5. **Wrong comparison constant name (line 106):** `rados.CEPH_OSD_CMPXATTR_OP_EQ` does not exist in the rados module. The correct constant is `rados.LIBRADOS_CMPXATTR_OP_EQ`.

6. **Atomic write used wrong method name (line 111):** `ioctx.operate_write('my-object', op)` should be `ioctx.operate_write_op(op, 'my-object')`, matching the documented API with op-first argument order.

## Review Notes
- The Kubernetes Pod spec uses a secret named `rook-ceph-admin-keyring` which is not a standard Rook-created secret. Users will need to adapt the pod spec to match their specific Rook-Ceph deployment (e.g., using the `rook-ceph-mon` secret or a custom CephClient CR). This is acceptable for an illustrative example.
- The basic RADOS operations (write_full, read, stat, remove_object), xattr operations, and the Rados constructor are all correct.
- The `rados.OSError` exception class used in the atomic write example is valid for catching RADOS operation failures.
