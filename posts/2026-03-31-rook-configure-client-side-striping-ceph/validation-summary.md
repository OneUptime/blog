# Validation Summary: How to Configure Client-Side Striping in Ceph

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (RADOS, RBD, CephFS)
- Rook (context/tags)
- libradosstriper (C API)
- fio (benchmarking)
- Linux extended attributes (setfattr/getfattr)

## Sources Consulted
- Ceph Architecture - Striping: https://docs.ceph.com/en/reef/architecture/
- rbd man page: https://docs.ceph.com/en/quincy/man/8/rbd/
- CephFS File Layouts: https://docs.ceph.com/en/latest/cephfs/file-layouts/
- libradosstriper.h (Ceph source): https://github.com/ceph/ceph/blob/main/src/include/radosstriper/libradosstriper.h
- Librados Python API: https://docs.ceph.com/en/latest/rados/api/python/
- fio RBD engine source: https://github.com/axboe/fio/blob/master/engines/rbd.c

## Issues Found

### 1. "Striping with RADOS Directly" section contained incorrect code examples (lines 69-87)

**What was wrong:** The C code example used `rados_ioctx_set_op_flags(io, LIBRADOS_OP_FLAG_FADVISE_SEQUENTIAL)`, which is an I/O advisory hint for sequential access patterns -- it has nothing to do with striping. The Python example used `ioctx.set_locator_key("key")`, which overrides the CRUSH placement group key -- also unrelated to striping and effectively the opposite of distributing data.

**What was changed:** Replaced both code examples with a correct `libradosstriper` C example showing `rados_striper_create()`, `rados_striper_set_object_layout_stripe_unit()`, `rados_striper_set_object_layout_stripe_count()`, `rados_striper_set_object_layout_object_size()`, and `rados_striper_write()`. Removed the incorrect Python example since libradosstriper's Python bindings are less commonly used and documented.

**Why:** RADOS itself does not implement striping. Striping at the RADOS layer requires the separate `libradosstriper` library, which implements the striping logic on top of librados.

## Review Notes
- The fio benchmark example omits `--clientname`, which defaults to `admin`. This is not an error but may need to be specified in environments with non-default authentication.
- All other sections (RBD defaults, `rbd create` flags, CephFS layout xattrs, striping concepts) are technically accurate.
- The post correctly notes that striping is less beneficial for small random I/O workloads.
