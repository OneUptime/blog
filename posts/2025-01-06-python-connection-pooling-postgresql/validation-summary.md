# Validation Summary: How to Implement Connection Pooling in Python for PostgreSQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Python
- PostgreSQL
- psycopg2 (`ThreadedConnectionPool`)
- asyncpg (`create_pool`, `Pool`)
- SQLAlchemy (sync `QueuePool` and async `AsyncAdaptedQueuePool`)
- Flask integration
- FastAPI integration (lifespan + dependency injection)
- Prometheus client (pool monitoring metrics)

## Sources Consulted
- psycopg2 connection pooling docs — https://www.psycopg.org/docs/pool.html (behavior of `ThreadedConnectionPool.getconn()` / `putconn()` and `PoolError`)
- asyncpg API reference — https://magicstack.github.io/asyncpg/current/api/index.html (`create_pool` parameters: `min_size`, `max_size`, `max_queries`, `max_inactive_connection_lifetime`, `command_timeout`; `Pool.acquire`, `Pool.get_size`, `Pool.get_idle_size`)
- FastAPI lifespan events — https://fastapi.tiangolo.com/advanced/events/
- SQLAlchemy engine/pool configuration — https://docs.sqlalchemy.org/en/20/core/pooling.html (`pool_size`, `max_overflow`, `pool_timeout`, `pool_recycle`, `pool_pre_ping`)
- SQLAlchemy asyncio extension — https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html

## Issues Found
- **psycopg2 pool exhaustion behavior (line 73):** The `get_connection` docstring stated the pool "blocks if none available." This is incorrect — `psycopg2.pool.ThreadedConnectionPool.getconn()` does **not** block when the pool reaches `maxconn`; it raises `psycopg2.pool.PoolError: connection pool exhausted`. The claim also contradicted the post's own comment (line 94) about avoiding pool exhaustion. Changed the docstring to "Get a connection from the pool (raises PoolError if exhausted)". This contrasts correctly with asyncpg's `pool.acquire()`, which genuinely waits for a free connection, so the async examples were left unchanged.

## Review Notes
- The asyncpg `create_pool` keyword arguments, default values (`max_queries=50000`, `max_inactive_connection_lifetime=300.0`), and the `Pool.get_size()` / `Pool.get_idle_size()` monitoring methods are all accurate against current asyncpg.
- The SQLAlchemy async example uses `sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)`, which still works, but SQLAlchemy 2.0 recommends `async_sessionmaker` as the modern idiom. Not an error — just a forward-looking note for a future refresh.
- In the async SQLAlchemy snippet, `NullPool` is imported but unused; harmless and illustrative of available options.
- The pool-sizing formula on line 591 is a rough heuristic rather than a formal model; the worked example arithmetic (`(100 * 0.01) / 0.05 * 1.2 = 24`) is internally consistent and correct.
- The FastAPI lifespan pattern, dependency injection, asyncpg transaction block (`async with conn.transaction()`), and `$1`/`$2` positional placeholders (vs psycopg2's `%s`) are all correct for their respective libraries.
