# Validation Summary: How to Use Redis Lock in Python with redis-py

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (distributed locking via `SET NX PX`)
- Python
- redis-py (`Lock` class, `LockError` exception)
- Threading (`threading.Event`, `threading.Thread`)

## Sources Consulted
- redis-py official documentation: https://redis.readthedocs.io/en/latest/lock.html
- redis-py Lock source code: https://github.com/redis/redis-py/blob/master/redis/lock.py
- redis-py exceptions module: https://redis.readthedocs.io/en/latest/_modules/redis/exceptions.html
- redis-py GitHub Issue #1348 (blocking parameter on r.lock()): https://github.com/redis/redis-py/issues/1348

## Issues Found
1. **`thread_local` not set to `False` when extending lock from another thread** (Extending Lock Timeout section, line 131): The lock was created with `r.lock('long-job', timeout=30)` which uses the default `thread_local=True`. Since the lock token is stored in thread-local storage, calling `lock.extend()` from the separate extender thread would fail with `LockNotOwnedError` because that thread has no access to the token. Fixed by changing to `r.lock('long-job', timeout=30, thread_local=False)`.

## Review Notes
- The multi-resource locking example calls `lock.acquire()` directly without checking the boolean return value. If acquisition fails (returns `False`), the code would proceed and later attempt to release an unacquired lock. This is a robustness concern in the example code but does not constitute an incorrect claim about the redis-py API.
- All other API usage (`r.lock()` parameters, `lock.acquire()`, `lock.release()`, `lock.extend(additional_time=...)`, `lock.owned()`, `LockError` import path, context manager behavior) is accurate and current.
