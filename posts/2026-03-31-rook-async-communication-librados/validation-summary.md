# Validation Summary: How to Use Async Communication with librados

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (distributed storage)
- librados (RADOS client library)
- Python `rados` module (Ceph Python bindings)
- C librados API
- Asynchronous I/O with completion callbacks

## Sources Consulted
- Ceph Python rados bindings source code: https://github.com/ceph/ceph/blob/main/src/pybind/rados/rados.pyx
- C librados header: https://github.com/ceph/ceph/blob/main/src/include/rados/librados.h
- Ceph official documentation: https://docs.ceph.com/en/latest/rados/api/

## Issues Found

### Issue 1: Python write callback signature (wrong number of parameters)
**What was wrong:** The `on_write_complete(completion, data)` callback accepted 2 parameters, but the `aio_write_full` `oncomplete` callback is invoked with only 1 argument (the Completion object). This would raise a `TypeError` at runtime.
**What was changed:** Replaced the standalone callback function with an inline lambda using a default argument to capture the object name: `lambda c, _name=obj_name: print(...)`. This correctly accepts the single Completion argument while preserving access to the object name via closure.

### Issue 2: `completion.get_data()` does not exist in Python rados Completion
**What was wrong:** The read callback called `completion.get_data()`, but the Completion class has no `get_data()` method. For `aio_read`, the read data is passed as the **second argument** to the `oncomplete` callback, not accessed via a method.
**What was changed:** Updated `on_read_complete` to accept `(completion, data, name)` where `data` is the buffer passed by the library, replacing the non-existent `completion.get_data()` call.

### Issue 3: Read lambda default argument overwritten by callback invocation
**What was wrong:** `lambda c, _n=name: on_read_complete(c, _n)` — the `aio_read` callback is invoked with 2 positional arguments (completion, data), so `_n` would receive the data buffer instead of using the default `name` value. The name was never captured correctly.
**What was changed:** Changed to a 3-parameter lambda: `lambda c, d, _n=name: on_read_complete(c, d, _n)`. Now `c` receives the completion, `d` receives the data buffer, and `_n` uses the default value to capture the object name.

### Issue 4: `comp.release()` does not exist in Python rados
**What was wrong:** All three Python examples called `comp.release()` on Completion objects. The Python `rados.Completion` class has no `release()` method — completion objects are automatically cleaned up via Python garbage collection (`__dealloc__` calls `rados_aio_release` internally). These calls would raise `AttributeError`.
**What was changed:** Removed all `comp.release()` calls from the three Python code examples.

### Issue 5: C example use-after-free bug
**What was wrong:** The C callback function called `rados_aio_release(comp)` inside the callback, then the main code called `rados_aio_wait_for_complete(comp)` on the already-released completion. This is undefined behavior (use-after-free).
**What was changed:** Moved `rados_aio_release(comp)` out of the callback and placed it after `rados_aio_wait_for_complete(comp)` in the main code, which is the correct lifecycle: create → use → wait → release.

## Review Notes
- The `onsafe` parameter in both the Python and C examples is deprecated since Ceph Luminous (12.x). With BlueStore, `oncomplete` and `onsafe` are functionally equivalent. The code still works with `onsafe=None` / `NULL`, but the newer C API offers `rados_aio_create_completion2()` which removes the `onsafe` parameter entirely. This is not a bug but worth noting for future updates.
- The async timing diagram is a simplification (`Total time ≈ max(write_time) + 1 * network_RTT`). In practice, total time depends on cluster load, OSD distribution, and replication factors. The simplification is acceptable for educational purposes.
- The throttling example correctly uses a FIFO approach to drain completions, which is a common and effective pattern for bounding in-flight operations.
