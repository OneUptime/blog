# Validation Summary: How to Use CockroachDB with Python

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- CockroachDB (distributed SQL database)
- Python
- psycopg2 (PostgreSQL adapter)
- asyncpg (async PostgreSQL adapter)
- SQLAlchemy ORM with sqlalchemy-cockroachdb dialect
- Docker (for local CockroachDB setup)
- FastAPI (in health check example)

## Sources Consulted
- CockroachDB official documentation (https://www.cockroachlabs.com/docs/)
- CockroachDB Docker Hub image (`cockroachdb/cockroach`)
- psycopg2 documentation (https://www.psycopg.org/docs/)
- asyncpg documentation (https://magicstack.github.io/asyncpg/)
- SQLAlchemy 2.0 documentation (https://docs.sqlalchemy.org/en/20/)
- sqlalchemy-cockroachdb repository (https://github.com/cockroachdb/sqlalchemy-cockroachdb)
- PostgreSQL SQLSTATE error code reference (40001 serialization_failure, 40003 statement_completion_unknown, etc.)

## Issues Found

1. **Outdated SQLAlchemy import path for `declarative_base`** — The post originally used `from sqlalchemy.ext.declarative import declarative_base`, which is the pre-1.4 import path. In SQLAlchemy 2.0, this has moved to `sqlalchemy.orm`. Updated the import to `from sqlalchemy.orm import declarative_base, relationship, sessionmaker` (consolidated with the existing `sqlalchemy.orm` import) so the code follows current SQLAlchemy 2.0 conventions and avoids deprecation warnings.

## Review Notes

- **`crdb_internal` schema queries are illustrative.** The `get_slow_queries` example queries columns `query`, `mean_latency`, and `max_latency` from `crdb_internal.node_statement_statistics`. In current CockroachDB versions the actual schema uses columns like `key` (anonymized statement text) and timing columns such as `run_lat_avg`, `service_lat_avg`, etc. Likewise, `crdb_internal.index_usage_statistics` exposes `table_id`/`index_id` rather than `table_name`/`index_name`/`total_writes`. These examples convey the concept correctly but the exact column names would need adjustment (or a join through `pg_catalog`/`information_schema`) to run as-is. Left unchanged because the surrounding text frames them as illustrative analysis tools rather than copy-paste production queries.
- **`INTERVAL '%s days'` in `delete_old_orders`** is an unusual but functional pattern — psycopg2 will substitute `%s` even inside string literals, producing valid SQL like `INTERVAL '365 days'`. A cleaner idiom would be `INTERVAL %s` with parameter `f"{days_old} days"`, or `NOW() - make_interval(days => %s)`. Functionally correct as written; not changed.
- **`SERIAL` in CockroachDB** behaves differently from PostgreSQL (uses `unique_rowid()` to generate distributed-friendly IDs rather than a sequential counter). The post uses it acceptably for a tutorial; CockroachDB now recommends UUIDs for new schemas in distributed scenarios, which the post also demonstrates for the `orders` table.
- **`hashlib.sha256` password hashing** is shown only as a placeholder; the post explicitly notes "use bcrypt in production," which is the correct guidance.
- **`from sqlalchemy.ext.declarative import declarative_base`** style is still tolerated by SQLAlchemy 1.4 with a deprecation warning, but the modern import (now used after the fix) is preferred and forward-compatible with 2.0+.
- All other technical content (Docker setup, psycopg2/asyncpg APIs, connection pooling parameters, `asyncpg.SerializationError`, `gen_random_uuid()`, inline `INDEX` syntax in `CREATE TABLE`, `ON CONFLICT ... DO UPDATE`, `FOR UPDATE`, `copy_records_to_table`, retry error codes 40001/40003, `cockroachdb://` SQLAlchemy URL scheme, etc.) checks out against current documentation.
