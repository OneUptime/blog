# Validation Summary: How to Implement Cache Invalidation in FastAPI

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Python 3
- FastAPI
- Redis (redis-py client)
- Pydantic (mentioned/imported only)
- Standard library: `functools`, `hashlib`, `json`, `logging`, `typing`, `contextlib`

## Sources Consulted
- redis-py official documentation (https://redis-py.readthedocs.io/) — verified `ConnectionPool`, `Redis`, `setex`, `scan`, `smembers`, `sadd`, `expire`, `delete`, `pipeline` signatures
- Redis SCAN command docs (https://redis.io/commands/scan/) — confirmed cursor/match/count semantics
- FastAPI official documentation (https://fastapi.tiangolo.com/advanced/events/) — confirmed that `@app.on_event("startup")` has been deprecated since FastAPI 0.93 in favor of the `lifespan` context manager
- FastAPI BackgroundTasks docs (https://fastapi.tiangolo.com/tutorial/background-tasks/) — confirmed `background_tasks.add_task(callable, *args)` pattern

## Issues Found
1. **`cache_tags.py` — missing imports**: The `TaggedCache` class used `value: Any` and `Optional[Any]` in type hints, but only `Set, List` were imported from `typing`. `Set` was unused. Replaced the import with `from typing import List, Any, Optional` so the annotations resolve at class definition time (otherwise Python raises `NameError`).
2. **`dependency_cache.py` — missing imports and unused imports**: The class used `value: Any`, `depends_on: List[str]`, and `json.dumps(value)`, but the imports were `from typing import Dict, Set` and `from collections import defaultdict` — none of which were used, and `Any`, `List`, and `json` were not imported. Replaced with `from typing import List, Any` and `import json`.
3. **`cache_aside.py` — missing `Callable` import**: `get_or_fetch` declared `fetch_func: Callable` but only `Optional, TypeVar, Generic` were imported. `TypeVar`/`Generic`/`T`/`BaseModel`/`BackgroundTasks` were unused in the snippet. Cleaned the import block to `from typing import Optional, Callable` and removed unused `pydantic.BaseModel`, `TypeVar`, `Generic`, `BackgroundTasks`, and the dangling `T = TypeVar('T')` so the snippet imports only what it uses and resolves correctly.
4. **`cache_warming.py` — deprecated `@app.on_event("startup")`**: FastAPI 0.93 (March 2023) deprecated event handlers in favor of the `lifespan` context manager. For a 2026-dated post this is misleading. Rewrote the startup hook to use `@asynccontextmanager` / `lifespan` and `FastAPI(lifespan=lifespan)`. Also removed the unused `import asyncio`.

## Review Notes
- The post mixes the synchronous `redis-py` client with `async def` FastAPI handlers. This works but every Redis call blocks the event loop. For a production caching post, `redis.asyncio` (a.k.a. `aioredis` since redis-py 4.2+) would be more idiomatic. Not changed because it would restructure every snippet, which is out of scope for a correctness review.
- The `make_cache_key` helper relies on `json.dumps` of `args`/`kwargs`. This is fine for primitive arguments (the only example usage passes `user_id: int`), but would raise `TypeError` for non-JSON-serializable arguments such as `datetime`, sets, or Pydantic models. The post does not call this out.
- `invalidate_pattern` uses `SCAN` rather than `KEYS` (correct, non-blocking), and the comment in the code correctly notes this. The wildcard pattern in the delete-user example (`f"*user*:{user_id}*"`) is broad and could match unrelated keys; functional but worth tightening to a specific prefix in a real app.
- `MD5` is used purely as a non-cryptographic hash for cache key compaction, which is acceptable; no security implication.
- `r.get(...)` followed by `if cached_value:` will treat a cached JSON `"null"`, `"false"`, `"0"`, or `'""'` payload as a miss. Edge case; not addressed in the post.
- The `Phil Karlton` quote attribution at the top is accurate.
