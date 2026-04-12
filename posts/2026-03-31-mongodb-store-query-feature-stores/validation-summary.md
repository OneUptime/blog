# Validation Summary: How to Store and Query Feature Stores in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (document model, TTL indexes, compound indexes, `_id` key lookups)
- Python (pymongo driver)
- FastAPI (REST API serving layer)
- Machine Learning / MLOps (feature store concepts, point-in-time retrieval)

## Sources Consulted
- PyMongo documentation — `bulk_write`, `UpdateOne`, `find_one` with `sort`, TTL indexes: https://pymongo.readthedocs.io/en/stable/
- Python `datetime` module documentation — `utcnow()` deprecation (Python 3.12+): https://docs.python.org/3/library/datetime.html#datetime.datetime.utcnow
- MongoDB documentation — TTL indexes, `expireAfterSeconds`, `createIndex`: https://www.mongodb.com/docs/manual/core/index-ttl/
- FastAPI documentation — sync vs async path operation functions: https://fastapi.tiangolo.com/async/#path-operation-functions

## Issues Found

1. **`datetime.utcnow()` is deprecated (Python 3.12+)**
   - **What was wrong:** The code used `datetime.utcnow()` which has been deprecated since Python 3.12. It returns a naive datetime and its use is discouraged.
   - **What was changed:** Replaced with `datetime.now(timezone.utc)` and added `timezone` to the import from `datetime`.
   - **Why:** `datetime.now(timezone.utc)` returns a timezone-aware datetime and is the recommended replacement per the Python documentation.

2. **Synchronous pymongo call inside `async def` FastAPI handler**
   - **What was wrong:** The `/features/{entity_type}/{entity_id}` endpoint was declared as `async def` but used synchronous `pymongo.find_one()` inside it. This blocks the asyncio event loop during the database call, degrading concurrency.
   - **What was changed:** Changed `async def get_entity_features` to `def get_entity_features`.
   - **Why:** When a FastAPI path operation is a regular `def` (not `async def`), FastAPI automatically runs it in an external threadpool, preventing event loop blocking. This is the correct pattern when using synchronous drivers like pymongo.

## Review Notes
- The Best Practices section describes `_id` lookups as "O(1) point lookups." MongoDB's default `_id` index uses a B-tree, making lookups technically O(log n). In practice the distinction is negligible for typical collection sizes, but readers should be aware this is a simplification.
- For production use with FastAPI, consider using Motor (the async MongoDB driver) instead of pymongo to get true async I/O without threadpool overhead.
- The `computedAt` field returned in the REST API response is a Python `datetime` object; FastAPI's default JSON encoder handles this correctly by serializing it to an ISO 8601 string.
