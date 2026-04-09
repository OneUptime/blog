# Validation Summary: How to Use librados with Python

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (distributed storage)
- librados (RADOS object store C library)
- Python `rados` module (Python bindings for librados)
- Rook (Ceph operator for Kubernetes, mentioned in tags)

## Sources Consulted
- Official Ceph documentation for librados Python API: https://docs.ceph.com/en/latest/rados/api/python/
- Ceph source code for Python rados bindings: https://github.com/ceph/ceph/blob/main/src/pybind/rados/rados.pyx
- PyPI registry (confirmed no `rados` package exists)

## Issues Found

### 1. Omap API usage was completely incorrect (Critical)
**What was wrong:** The blog used `ioctx.set_omap("myobj", {"status": b"active", ...})` and `ioctx.get_omap_vals("myobj", "", "", 100)`, passing the object name as the first argument and a dict for key-value pairs. This API does not exist. The real `set_omap` and `get_omap_vals` methods require `WriteOp`/`ReadOp` objects as their first argument, with keys and values passed as separate sequences.

**What was changed:** Replaced with the correct WriteOp/ReadOp pattern using `rados.WriteOpCtx()` and `rados.ReadOpCtx()` context managers, `ioctx.set_omap(write_op, keys_tuple, values_tuple)`, `ioctx.operate_write_op(write_op, "myobj")`, and the equivalent read pattern.

### 2. `pip3 install rados` is not a valid installation method (Moderate)
**What was wrong:** The blog listed `pip3 install rados` as an installation option. There is no `rados` package on PyPI. The Python rados module can only be installed via system packages from Ceph repositories.

**What was changed:** Removed the `pip3 install rados` line and its comment from the installation section.

### 3. `cluster.version()` was mislabeled as "Ceph version" (Minor)
**What was wrong:** The blog printed `cluster.version()` with the label "Ceph version". This method returns the librados C library version as a tuple (major, minor, extra), not the Ceph cluster version.

**What was changed:** Changed the label from "Ceph version" to "librados version".

## Review Notes
- `ioctx.read("mykey")` defaults to reading only 8192 bytes. For objects larger than 8 KiB, a `length` parameter must be specified. The blog's examples use small data, so this works correctly but could be misleading for readers working with larger objects.
- `ioctx.stat("mykey")` returns `(size, time.struct_time)`, not a raw numeric mtime. The blog's destructuring `size, mtime = ioctx.stat("mykey")` works correctly, but readers should be aware `mtime` is a `time.struct_time` object.
- The error handling example catches `rados.ObjectNotFound` for a nonexistent pool, which is correct — `open_ioctx` on a missing pool raises `ObjectNotFound` (mapped from ENOENT). The exception name may be confusing since it's a pool, not an object, that's missing, but the code is technically correct.
