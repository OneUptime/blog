# Validation Summary: How to Write Integration Tests for Python APIs with Testcontainers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Python
- Testcontainers (testcontainers-python)
- Docker
- pytest / pytest-asyncio / pytest-xdist
- PostgreSQL
- Redis
- Kafka
- SQLAlchemy
- asyncpg
- FastAPI (TestClient)
- factory_boy

## Sources Consulted
- testcontainers-python PyPI page — https://pypi.org/project/testcontainers/
- testcontainers-python docs (PostgresContainer module) — https://testcontainers-python.readthedocs.io/en/latest/modules/postgres/README.html
- Testcontainers PostgreSQL module — https://testcontainers.com/modules/postgresql/
- SQLAlchemy 2.0 Core Exceptions (ObjectNotExecutableError) — https://docs.sqlalchemy.org/en/20/core/exceptions.html
- SQLAlchemy 2.0 migration: raw strings must be wrapped in `text()` — https://github.com/sqlalchemy/sqlalchemy/issues/9155
- pytest-asyncio changelog / 1.0 release notes (event_loop fixture removal) — https://pytest-asyncio.readthedocs.io/en/stable/reference/changelog.html
- pytest-asyncio fixtures + loop_scope docs — https://pytest-asyncio.readthedocs.io/en/stable/reference/fixtures/
- pytest-asyncio "change fixture loop" how-to — https://pytest-asyncio.readthedocs.io/en/stable/how-to-guides/change_fixture_loop.html

## Issues Found

1. **SQLAlchemy 2.0 raw SQL execution would raise `ObjectNotExecutableError`** (Performance Considerations → Container Reuse).
   The `clean_db` fixture called `conn.execute(f'TRUNCATE TABLE {table.name} CASCADE')` with a bare string. In SQLAlchemy 2.0 (the current major version, matching the post's modern `postgres:15` / SQLAlchemy ORM usage) raw SQL strings must be wrapped in `sqlalchemy.text()` or execution fails. **Fix:** added `from sqlalchemy import text` to the snippet and wrapped the statement as `conn.execute(text(f'TRUNCATE TABLE {table.name} CASCADE'))`, with a clarifying comment.

2. **pytest-asyncio custom `event_loop` fixture override is removed in pytest-asyncio 1.0** (Async Database Testing → AsyncPG with Testcontainers).
   The post defined a session-scoped `event_loop` fixture. pytest-asyncio 1.0 (released May 2025) removed support for overriding `event_loop`; this code would emit errors/warnings and no longer provides a session-scoped loop. Additionally, the async fixtures used `@pytest.fixture` on `async def` functions, which is not awaited correctly in strict mode (the default) — async fixtures must use `@pytest_asyncio.fixture`. **Fix:** removed the obsolete `event_loop` fixture and the now-unused `import asyncio`, added `import pytest_asyncio`, and converted the async fixtures to `@pytest_asyncio.fixture(scope=..., loop_scope="session")`, which is the supported modern way to get a session-scoped loop.

3. **Async test class needed a matching loop scope** (Async Repository Tests).
   Because the async fixtures now run on a session-scoped loop, the test class must request the same loop scope or the fixtures and tests would run on mismatched loops. **Fix:** changed `@pytest.mark.asyncio` to `@pytest.mark.asyncio(loop_scope="session")`.

4. **`pytest.ini` inline comment would be passed to pytest as arguments** (Parallel Test Execution).
   The line `addopts = -n auto  # pytest-xdist for parallel tests` is invalid: pytest's INI parser does not strip inline comments, so the `#` and following words would be treated as positional arguments. **Fix:** moved the explanation to its own full-line comment above `addopts = -n auto`.

## Review Notes
- The `pip install testcontainers[postgresql] testcontainers[redis] ...` command is valid — `postgresql` is an accepted alias for the `postgres` extra in testcontainers-python.
- `PostgresContainer` attributes (`username`, `password`, `dbname`) and `get_connection_url()` are correct; `get_connection_url()` returns a SQLAlchemy-compatible URL using the psycopg2 driver by default, which works with `create_engine`.
- Passing the string result of `get_exposed_port()` directly to `redis.Redis(port=...)` matches the official Testcontainers usage pattern (redis-py accepts it); the asyncpg example correctly casts the port to `int`, which asyncpg requires.
- `KafkaContainer.get_bootstrap_server()`, `DockerContainer.with_env/with_exposed_ports/with_volume_mapping`, and `wait_for_logs` are all valid current APIs.
- The factory_boy example sets `sqlalchemy_session` via `_meta` per test; this works but is global mutable state — `factory.create_batch(..., total=100)` intentionally overrides the Faker default, which is fine for the illustrative assertion.
- The post pins `postgres:15`, `redis:7`, and `confluentinc/cp-kafka:7.4.0`; these are valid image tags. Readers on newer stacks may bump versions, but nothing here is broken.
- All example code references hypothetical `app.*` modules (models, repositories, cache, main, database) which are illustrative scaffolding, as expected for a tutorial.
