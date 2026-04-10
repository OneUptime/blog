# Validation Summary: How to Debug Object Class Execution in Ceph

## Status
validated

## Post Type
Tutorial / Debugging Guide

## Technologies Covered
- Ceph (RADOS object classes, OSD logging)
- Rook (Ceph orchestration context)
- C++ (object class implementation with CLS_LOG/CLS_ERR macros)
- Python (librados / python-rados client library)
- Linux (systemd journalctl, shared library debugging with ldd)

## Sources Consulted
- Ceph source code `src/common/subsys.h` — subsystem definitions confirming `objclass` subsystem name (https://github.com/ceph/ceph/blob/main/src/common/subsys.h)
- Ceph source code `src/osd/objclass.cc` — cls_log() implementation routing through `ceph_subsys_objclass` (https://github.com/ceph/ceph/blob/main/src/osd/objclass.cc)
- Ceph source code `src/include/rados/objclass.h` — CLS_LOG/CLS_ERR macro definitions and cls_method_cxx_call_t typedef (https://github.com/ceph/ceph/blob/main/src/include/rados/objclass.h)
- Ceph source code `src/tools/rados/rados.cc` — full subcommand dispatch table confirming no `cls-call` subcommand exists (https://github.com/ceph/ceph/blob/main/src/tools/rados/rados.cc)
- Ceph source code `src/pybind/rados/rados.pyx` — Python `Ioctx.execute()` signature and return type (https://github.com/ceph/ceph/blob/main/src/pybind/rados/rados.pyx)
- Ceph source code `src/osd/osd_op_util.cc` and `src/crimson/osd/ops_executer.cc` — error code returned when class/method not found is EOPNOTSUPP (-95) (https://github.com/ceph/ceph/blob/main/src/osd/osd_op_util.cc)
- Ceph Logging and Debugging documentation (https://docs.ceph.com/en/reef/rados/troubleshooting/log-and-debug/)
- Ceph example class `src/cls/hello/cls_hello.cc` (https://github.com/ceph/ceph/blob/main/src/cls/hello/cls_hello.cc)

## Issues Found

1. **`debug_class` config option does not exist — corrected to `debug_objclass`.**
   - Lines 20 and 24 used `ceph tell osd.X config set debug_class 20`. The Ceph subsystem for object classes is `objclass` (defined in `src/common/subsys.h`), so the correct config option is `debug_objclass`.
   - Changed both occurrences of `debug_class` to `debug_objclass`.

2. **`rados cls-call` CLI subcommand does not exist — replaced with Python librados script.**
   - The entire "Using RADOS `cls-call` for Ad-Hoc Testing" section used a fabricated `rados cls-call` subcommand and a nonexistent `--input-base64` flag. The `rados` CLI has no mechanism for invoking object class methods; this must be done programmatically via the librados API.
   - Replaced the section with a Python script using `ioctx.execute()` for ad-hoc testing.

3. **Wrong error code for "Class or method not found" — corrected from ENOSYS to EOPNOTSUPP.**
   - The error table listed `-38 (ENOSYS)` for class/method not found. Ceph source code (`osd_op_util.cc`) shows that when `ClassHandler::open_class()` or `get_method_flags()` returns `-ENOENT`, it is converted to `-EOPNOTSUPP` (-95) before being returned to the client.
   - Changed to `-95 (EOPNOTSUPP)`.

4. **Python `ioctx.execute()` return value is a tuple, not a single value.**
   - `execute()` returns `(ret, output_bytes)`. The original code assigned the result to a single variable `result`. Changed to unpack: `ret, output = ioctx.execute(...)`.

5. **Summary section referenced nonexistent `rados cls-call` CLI — corrected.**
   - Updated the summary to reference `ioctx.execute()` instead.

## Review Notes
- The CLS_LOG level description "0=always, 1-9=info, 10-19=debug, 20+=trace" is an informal convention, not an official Ceph categorization. Ceph uses a simple numeric scale where lower = louder. This is a reasonable approximation and was left as-is.
- `cls_cxx_read(hctx, 0, 0, &data)` with `len=0` is valid — in RADOS convention, reading with length 0 means "read from offset to end of object." This is correct but the convention may not be obvious to all readers.
- The `ceph-cls-test` section is sparse but not incorrect. Ceph does provide test harnesses for object classes (e.g., `unittest_cls_hello`).
- The rados-classes library path `/usr/lib/rados-classes/` is the standard location for Ceph package installations on Debian/Ubuntu. RPM-based systems may use `/usr/lib64/rados-classes/`. This is not an error but is distribution-specific.
