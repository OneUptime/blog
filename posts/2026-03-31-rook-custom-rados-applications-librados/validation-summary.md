# Validation Summary: How to Create Custom RADOS Applications with librados

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph RADOS (Reliable Autonomic Distributed Object Store)
- librados Python bindings (`rados` module)
- Rook (mentioned in tags/context)
- Python

## Sources Consulted
- Ceph source code: `src/pybind/rados/rados.pyx` on the main branch (authoritative reference for the Python rados API)
- Ceph official documentation for librados Python API at https://docs.ceph.com/en/latest/rados/api/python/
- Ceph WriteOpCtx / ReadOpCtx API documentation

## Issues Found

### 1. Omap operations used incorrect API (all instances)
**What was wrong:** The post called `ioctx.set_omap(object_name, dict)`, `ioctx.get_omap_vals(object_name, ...)`, and `ioctx.remove_omap_keys(object_name, set)` as if they were direct methods taking an object name. In reality, all omap operations in the Python rados bindings require a `WriteOpCtx` or `ReadOpCtx` as the first argument, with keys and values as separate sequences (not a dict). The operation must then be executed via `ioctx.operate_write_op()` or `ioctx.operate_read_op()`.

**What was changed:** Rewrote all omap operations across `submit_task`, `claim_task`, and `complete_task` to use `rados.WriteOpCtx()` / `rados.ReadOpCtx()` context managers with the correct `set_omap(write_op, keys_tuple, values_tuple)`, `get_omap_vals(read_op, ...)`, and `remove_omap_keys(write_op, keys_tuple)` signatures, followed by `operate_write_op` / `operate_read_op`.

**Why:** The original code would raise `TypeError` at runtime because the method signatures don't match.

### 2. Watch callback had incorrect signature
**What was wrong:** The `on_notify` callback was defined with 5 parameters `(notify_id, notifier_id, watch_id, data, ioctx)`. The actual callback signature is 4 parameters: `(notify_id, notifier_id, watch_id, data)`. There is no `ioctx` parameter passed to callbacks.

**What was changed:** Removed the `ioctx` parameter from the callback signature.

**Why:** The extra parameter would cause the callback to fail when invoked by the watch mechanism.

### 3. `notify_ack` called manually but doesn't exist as a user-facing API
**What was wrong:** The post called `ioctx.notify_ack(notify_id, watch_id, b"")` inside the callback. In the Python rados bindings, notification acknowledgment is handled automatically by the Watch object internally. There is no user-facing `notify_ack` method.

**What was changed:** Removed the `notify_ack` call from the callback.

**Why:** This method doesn't exist on `Ioctx` and would raise `AttributeError`.

### 4. `ioctx.notify()` msg parameter should be str, not bytes
**What was wrong:** The post passed `b"new_task"` (bytes) to `ioctx.notify()`. The `msg` parameter is typed as `str`.

**What was changed:** Changed `b"new_task"` to `"new_task"`.

**Why:** Passing bytes where str is expected could cause a TypeError.

### 5. `ioctx.watch()` returns a Watch object, not a watch_id
**What was wrong:** The post assigned the result to `watch_id`, implying it returns an integer. It actually returns a `Watch` object.

**What was changed:** Changed variable name from `watch_id` to `watch`.

**Why:** Minor naming issue, but important for readers to understand the return type.

## Review Notes
- `ioctx.read()` has a default `length=8192`. If task objects exceed 8KB, reads will be silently truncated. For a production application, callers should either pass a larger length or use `stat()` first to determine object size. This was not changed since the example task objects are small JSON payloads well under 8KB.
- The claim_task method's read-then-update pattern is not truly atomic across concurrent consumers. The post mentions "atomic operations" and "compare-and-swap" in the design principles but doesn't use RADOS compare operations (`cmpext` or write op assertions). In a real production system, multiple consumers could claim the same task. This is acceptable for a tutorial but worth noting.
- The design principle #4 mentions "compare-and-swap" but the example code never demonstrates it. This is a minor content gap but not a technical error.
