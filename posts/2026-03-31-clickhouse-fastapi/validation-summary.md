# Validation Summary: How to Use ClickHouse with FastAPI

## Status
validated

## Post Type
Tutorial / Integration Guide

## Technologies Covered
- ClickHouse (MergeTree, DateTime64, LowCardinality, generateUUIDv4, uniq, has/groupArray, toStartOfHour, TTL)
- FastAPI (APIRouter, Query validators, response_model, lifespan events, StreamingResponse)
- clickhouse-connect (Python client: `get_client`, `query`, `insert`, parameterized queries, `query_row_block_stream`)
- Pydantic (BaseModel)
- Python 3.11+ (`datetime`, `typing`, `functools.lru_cache`)
- Uvicorn (ASGI server)

## Sources Consulted
- FastAPI docs — Query params / String validations: https://fastapi.tiangolo.com/tutorial/query-params-str-validations/
- FastAPI docs — Lifespan Events: https://fastapi.tiangolo.com/advanced/events/
- FastAPI PR #10085 (`regex` → `pattern`): https://github.com/tiangolo/fastapi/pull/10085
- Python `datetime.utcnow()` deprecation (Python 3.12): https://docs.python.org/3/library/datetime.html#datetime.datetime.utcnow
- Miguel Grinberg — "It's time for a change: datetime.utcnow() is now deprecated": https://blog.miguelgrinberg.com/post/it-s-time-for-a-change-datetime-utcnow-is-now-deprecated
- clickhouse-connect docs (PyPI): https://pypi.org/project/clickhouse-connect/
- ClickHouse Python advanced querying: https://clickhouse.com/docs/integrations/language-clients/python/advanced-querying
- clickhouse-connect issue #159 (String param auto-quoting): https://github.com/ClickHouse/clickhouse-connect/issues/159

## Issues Found

1. **Deprecated `regex=` parameter in FastAPI `Query()`** — In the `/analytics/timeseries` endpoint, `Query(default="hour", regex="^(minute|hour|day)$")` used the deprecated `regex` keyword. FastAPI 0.100.0+ (July 2023) replaced this with `pattern` to align with Pydantic v2. Changed to `pattern="^(minute|hour|day)$"`.

2. **SQL injection / double-quoting bug in funnel query** — The original code wrote `has(groupArray(event_type), '{step_i:String}')` with surrounding single quotes. clickhouse-connect auto-quotes top-level String parameters, so this produces invalid SQL like `has(groupArray(event_type), ''login'')`. Removed the surrounding quotes so the driver handles quoting correctly: `has(groupArray(event_type), {step_i:String})`.

3. **Dead / misleading code in funnel endpoint** — A `step_conditions` variable was built but never referenced (it also re-introduced raw string interpolation from user input, bypassing parameterization). Removed the unused block.

4. **Deprecated `datetime.utcnow()`** — Used in both routers and in the funnel endpoint. Deprecated in Python 3.12 (scheduled for removal). Replaced all occurrences with `datetime.now(timezone.utc)` and added `timezone` to the imports in both `events.py` and `analytics.py`. clickhouse-connect handles timezone-aware datetimes correctly when inserting into `DateTime64(3)`.

5. **Deprecated `@app.on_event("startup")`** — FastAPI's `on_event` startup/shutdown decorators are deprecated in favor of a lifespan context manager. Refactored `app/main.py` to use `@asynccontextmanager async def lifespan(app): ...` and pass `lifespan=lifespan` to `FastAPI(...)`, removing the `on_event` handler.

## Review Notes
- The module-level `_client` singleton is fine for clickhouse-connect — the HTTP client is thread-safe and handles its own connection pool, so sharing across threads/requests is correct. Worth noting the `lru_cache(maxsize=1)` on `get_settings` returns a mutable dict reference each time; harmless here since it's only read.
- The events router imports `Depends` and `HTTPException` from FastAPI but never uses them — minor, not corrected (no functional impact).
- `Optional` is imported from `typing` in `models.py` but unused — minor, not corrected.
- The SQL `LIMIT {limit:UInt32}` clause uses parameterization correctly and is safe.
- `ch.insert()` column order must match the list order; the current code provides explicit `column_names` so this is correct.
- TTL of `1 YEAR` is reasonable for an analytics table; readers should tune for their retention needs.
- The `/export` streaming endpoint correctly uses `query_row_block_stream()` as a context manager — that method is real and documented. Note that for very large exports, the SQL `LIMIT 10000000` in the example is still materialized server-side; true unbounded streaming should remove the LIMIT.
- `port=8443` is correct for HTTPS-secured ClickHouse HTTP interface; `port=8123` for plain HTTP. Both appear in the post and are used appropriately.
