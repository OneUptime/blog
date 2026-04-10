# Validation Summary: How to Use Redis with Temporal for Workflow State

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (redis-py Python client)
- Temporal (temporalio Python SDK)
- Python asyncio

## Sources Consulted
- Temporal Python SDK source code (temporalio package) — decorator APIs (`@activity.defn`, `@workflow.defn`, `@workflow.run`, `@workflow.signal`), `workflow.info()`, `workflow.execute_activity()`, `workflow.wait_condition()`
- Temporal determinism constraints documentation — workflow code sandboxing rules (no network I/O, no file I/O, no non-deterministic calls in workflow code)
- redis-py API documentation — `Redis()` constructor, `set()` with `nx`/`ex` parameters, `hset()` with `mapping`, `expire()`, `get()`, `hgetall()`, `eval()` for Lua scripts
- Redis distributed locking documentation — atomic check-and-delete pattern using Lua scripts

## Issues Found

1. **Pattern 1 — Unused `hashlib` import**: `import hashlib` was included but never used anywhere in the code block. Removed it.

2. **Pattern 2 — Unused `json` import and missing `timedelta` import**: `import json` was included but not used in this code block. `timedelta` was used in `schedule_to_close_timeout=timedelta(seconds=30)` but never imported. Replaced `import json` with `from datetime import timedelta`.

3. **Pattern 3 — Race condition in lock release**: The `release_resource_lock` activity used a non-atomic GET-then-DELETE pattern to release a lock. Between the GET and DELETE calls, the lock could expire and be acquired by another client, causing the DELETE to remove the wrong client's lock. This is a well-documented Redis anti-pattern. Fixed by replacing the two-step operation with an atomic Lua script that checks the lock owner and deletes in a single Redis operation.

4. **Pattern 4 — Redis I/O in workflow signal handler (Temporal determinism violation)**: The signal handler `process_event` called `cache.set()` (a network I/O operation) directly inside a `@temporalio.workflow.signal` method. Temporal workflow code must be deterministic — all I/O must go through activities. This would fail at runtime due to Temporal's sandbox restrictions. Fixed by: (a) creating a `check_and_mark_event` activity for the Redis dedup check, (b) having the signal handler queue events to a list, and (c) adding a `@temporalio.workflow.run` method that processes queued events via the activity using `workflow.wait_condition`.

5. **Pattern 4 — Unused `self._processed_signals`**: The `__init__` method initialized `self._processed_signals = set()` but it was never referenced. Replaced with `self._pending_events = []` which is used by the corrected implementation.

## Review Notes
- All four patterns use synchronous `redis.Redis` inside `async def` activities. In Temporal's Python SDK, async activities run on the asyncio event loop, so synchronous Redis calls will block the event loop. For production use, `redis.asyncio.Redis` would be more appropriate. This was not changed since the patterns are conceptually correct and the sync client keeps the examples simpler for a tutorial.
- The `database.get_user()` call in Pattern 1 is an undefined placeholder, which is acceptable for illustrative code.
- The `self._handle_event()` method in Pattern 4 is also an undefined placeholder, which is acceptable.
