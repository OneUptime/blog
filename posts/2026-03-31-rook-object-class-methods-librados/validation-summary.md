# Validation Summary: How to Use Object Class Methods from librados

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph RADOS
- librados (C++ library)
- Python `rados` module (Ceph Python bindings)
- C++ (librados.hpp)
- Ceph object classes (server-side OSD plugins)

## Sources Consulted
- Ceph Python rados bindings source: `src/pybind/rados/rados.pyx` (Ceph GitHub `main` branch) — verified `Ioctx.execute()` returns `Tuple[int, object]`, not just bytes
- Ceph librados C++ headers: `src/include/rados/librados.hpp` — verified `IoCtx::exec()` signature and `ObjectWriteOperation`/`ObjectReadOperation` inheritance from `ObjectOperation`
- Ceph Debian packaging files (`debian/*.install`) — verified `encoding.h` is NOT shipped with `librados-dev` or `libradospp-dev`
- Ceph `src/include/encoding.h` — confirmed `ceph::decode()` lives here, not in the public librados API
- Ceph Python rados `WriteOpCtx`/`ReadOpCtx` API — verified compound operation context manager pattern

## Issues Found

1. **Python `execute()` return value not unpacked (2 occurrences)**: `Ioctx.execute()` returns a tuple `(ret, output_bytes)`, but the code assigned the result to a single variable. This would cause a runtime error when trying to `struct.unpack` a tuple instead of bytes. Fixed both occurrences: `result_bytes = ioctx.execute(...)` changed to `ret, result_bytes = ioctx.execute(...)` and `ret, _ = ioctx.execute(...)`.

2. **C++ `ceph::decode()` not available from librados public headers**: The code used `ceph::decode(word_count, iter)` which requires `include/encoding.h` — a Ceph internal header not shipped with `librados-dev` or `libradospp-dev`. Replaced with `std::memcpy(&word_count, out_bl.c_str(), sizeof(word_count))` which works with just the public librados API. Added `#include <cstring>` for `std::memcpy`.

3. **Incorrect/unnecessary compile flag**: The compile command included `-I/usr/include/rados` which is unnecessary (the default search path already includes `/usr/include`) and could cause header resolution issues by making the compiler look for `rados/librados.hpp` inside `/usr/include/rados/`. Removed the flag and added `-std=c++11` which is needed for `auto` type deduction.

4. **Compound operation section was non-functional**: The original code claimed to "combine write + exec in one atomic operation" but only called `ioctx.set_alloc_hint(op, 0, 0, 0)` — a method that does not exist in the Python rados module. No actual write or exec was included. Replaced with correct example using `rados.WriteOpCtx()` context manager with `op.write_full()` and `op.execute()` calls, plus a secondary example showing the older `create_write_op`/`release_write_op` style.

## Review Notes
- The `int32_t` type used in the C++ decode is appropriate for matching Ceph's little-endian int32 encoding, but assumes the host is little-endian. On big-endian systems, `le32toh()` conversion would be needed. This is a minor portability note, not a bug, since Ceph clusters overwhelmingly run on x86_64.
- The Python `execute()` method has a `length` parameter (default 8192) that controls the output buffer size. If the class method returns more than 8192 bytes, the output will be truncated. The post doesn't mention this, but it's acceptable for the examples shown.
