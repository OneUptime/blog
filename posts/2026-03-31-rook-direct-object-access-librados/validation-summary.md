# Validation Summary: How to Perform Direct Object Access with librados

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph RADOS (Reliable Autonomic Distributed Object Store)
- librados (C and Python bindings)
- Python `rados` module (Ceph Python bindings via `rados.pyx`)
- Rook (Ceph orchestration on Kubernetes)

## Sources Consulted
- Ceph Python bindings source code: `src/pybind/rados/rados.pyx` on the Ceph `main` branch (GitHub: ceph/ceph)
- Ceph C API header: `src/include/rados/librados.h`
- Official Ceph documentation at docs.ceph.com for librados API reference

## Issues Found

### 1. Atomic Compare-and-Swap section: incorrect API methods on `ioctx` (critical)
**What was wrong:** The original code called `ioctx.set_write_op_assert_version(op, 0)`, `ioctx.write_op_cmpxattr(...)`, and `ioctx.write_op_setxattr(...)`. None of these methods exist on the `Ioctx` object. In the Python bindings, `assert_version()` and `set_xattr()` are methods on the `WriteOp` object itself (e.g., `op.assert_version(ver)`, `op.set_xattr(name, val)`). Additionally, `cmpxattr` is not exposed in the Python bindings at all — it exists only in the C API (`rados_write_op_cmpxattr`). The constant `rados.CEPH_OSD_CMPXATTR_OP_EQ` also does not exist; the correct name would be `rados.LIBRADOS_CMPXATTR_OP_EQ`.

**What was changed:** Rewrote the entire CAS example to use the idiomatic Python librados pattern: `ioctx.stat()` + `ioctx.get_last_version()` to capture the current object version, then `op.assert_version(ver)` to guard the write, with `op.write_full()` and `op.set_xattr()` as the atomic mutations. Updated the section description from "ObjectWriteOperation" to "WriteOp with assert_version".

### 2. Listing Objects section: `list_objects()` used as context manager (moderate)
**What was wrong:** The code used `with ioctx.list_objects() as obj_iter:` but `ObjectIterator` returned by `list_objects()` does not implement `__enter__`/`__exit__` and is not a context manager. This code would raise an `AttributeError` at runtime.

**What was changed:** Removed the `with` statement and used a direct `for` loop: `for obj in ioctx.list_objects():`.

### 3. Bulk Object Copy: `read()` without length would truncate data (moderate)
**What was wrong:** `src_ioctx.read(key)` was called without specifying a `length` parameter. The default `length` is 8192 bytes, so any object larger than 8KB would be silently truncated during the copy.

**What was changed:** Added `size, _ = src_ioctx.stat(key)` before the read, then passed `length=size` to `src_ioctx.read(key, length=size)` to ensure the full object is read.

### 4. Summary text: referenced non-existent class name
**What was wrong:** The summary referenced "atomic compare-and-swap via `ObjectWriteOperation`", but the correct class name is `WriteOp`.

**What was changed:** Updated to "atomic compare-and-swap via `WriteOp` with `assert_version`".

## Review Notes
- `ioctx.stat()` returns `(int, time.struct_time)`, not a raw numeric timestamp. The code example works correctly as-is since `time.struct_time` has a useful string representation, but readers should be aware that the `mtime` variable is a `time.struct_time` object, not a Unix timestamp.
- The `ioctx.release_write_op(op)` call is correct but is simply a wrapper around `op.release()`. Either form works.
- The C API examples (`rados_write` and `rados_read`) have correct argument order: `(ioctx, oid, buf, len, off)`.
- The `cmpxattr` operation is available in the C API but not yet exposed in the Python bindings. If xattr-based compare-and-swap is needed in Python, users should use the version-based `assert_version` pattern shown in the corrected example or implement application-level locking.
