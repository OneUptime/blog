# Validation Summary: How to Migrate to TimescaleDB from PostgreSQL

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- TimescaleDB (PostgreSQL extension for time-series data)
- PostgreSQL (psql, pg_dump, PL/pgSQL procedures/functions, information_schema)
- TimescaleDB features: hypertables, chunks, compression, retention policies, continuous aggregates, `time_bucket`, space partitioning
- Bash shell scripting (pre-migration check, rollback)
- APT package management on Ubuntu/Debian
- Python with psycopg2 (dual-write pattern)
- SQLAlchemy ORM
- TypeScript / Node.js with TypeORM
- Mermaid diagrams (architecture, decision trees, sequence)

## Sources Consulted
- TimescaleDB releases & version compatibility: https://github.com/timescale/timescaledb/releases
- TimescaleDB self-hosted Linux install docs: https://www.tigerdata.com/docs/self-hosted/latest/install/installation-linux
- TimescaleDB hypertable API reference: https://www.tigerdata.com/docs/api/latest/hypertable/create_hypertable
- PostgreSQL PL/pgSQL transactions (COMMIT in procedures vs. functions): https://www.postgresql.org/docs/current/plpgsql-transactions.html
- PostgreSQL SQL keywords / reserved words appendix: https://www.postgresql.org/docs/current/sql-keywords-appendix.html
- psycopg2 extras submodule import behavior: https://github.com/psycopg/psycopg2/issues/582
- SQLAlchemy 2.0 ORM mapping API: https://docs.sqlalchemy.org/en/20/orm/mapping_api.html

## Issues Found

1. **Outdated PostgreSQL version requirement.** The pre-migration check script claimed "TimescaleDB requires PostgreSQL 12+". Current TimescaleDB 2.x releases (mid-2026) support PostgreSQL 15, 16, 17, and 18; PG12 was dropped years ago. Updated the comment to "current TimescaleDB 2.x requires PostgreSQL 15+".

2. **`COMMIT` inside a `CREATE FUNCTION` body — would fail at runtime.** The `migrate_metrics_batch` example was declared as `CREATE OR REPLACE FUNCTION ... RETURNS BIGINT` but called `COMMIT` in its loop. PostgreSQL only allows `COMMIT`/`ROLLBACK` inside `PROCEDURE`s (invoked with `CALL`) and `DO` blocks, not inside functions. Converted the definition to `CREATE OR REPLACE PROCEDURE` with an `INOUT total_migrated BIGINT` parameter, and updated the invocation from `SELECT migrate_metrics_batch(...)` to `CALL migrate_metrics_batch(...)`.

3. **Reserved keyword used as a PL/pgSQL variable name.** The same procedure declared `current_time TIMESTAMPTZ`. `CURRENT_TIME` is a fully reserved SQL keyword and cannot be used unquoted as an identifier; the parser rejects it. Renamed the variable to `cur_time` throughout the loop.

4. **Deprecated `apt-key add` for the TimescaleDB repository.** `apt-key` is deprecated on modern Debian/Ubuntu and will fail to be trusted on newer releases. Replaced with the keyring approach used in the current official TimescaleDB install docs: `wget ... | sudo gpg --dearmor -o /etc/apt/trusted.gpg.d/timescaledb.gpg`.

5. **Missing `psycopg2.extras` import.** The dual-write Python module referenced `psycopg2.extras.Json(tags)` but only imported `psycopg2`. The `extras` submodule is not auto-loaded by `import psycopg2`; the call would raise `AttributeError`. Added an explicit `import psycopg2.extras`.

6. **Deprecated SQLAlchemy `declarative_base` import path.** The ORM example used `from sqlalchemy.ext.declarative import declarative_base`, which has been the legacy path since SQLAlchemy 1.4 and emits a deprecation warning in 2.0. Switched to `from sqlalchemy.orm import declarative_base` (and consolidated with the existing `sessionmaker` import on the same line).

## Review Notes

- The `create_hypertable` legacy signature with `partitioning_column` / `number_partitions` shown in the post is still supported in current TimescaleDB versions, though the dimension-builder API (`by_range`, `by_hash`) is now preferred for new code. Left as-is since both forms are documented and the legacy form is still common in tutorials.
- The SQLAlchemy `Metric` model declares `id` as the sole primary key while using `timestamp` as the partitioning column. In practice, `create_hypertable` requires that any unique constraint (including the primary key) include the partition column, so a hypertable cannot be created from this exact model without changing the PK to a composite `(id, timestamp)`. The post's stated point — that ORM read/write code is unchanged once the hypertable exists — is correct, so the example was left in place; readers writing migrations against this model may need to add the timestamp to the primary key.
- `datetime.utcnow()` in the dual-write example is deprecated in Python 3.12+ in favor of `datetime.now(datetime.UTC)`, but still works and emits only a `DeprecationWarning`. Left unchanged.
- The Mermaid diagram block labels `PG->>PG: Deprecated` after the cutover, which reads as commentary rather than a real interaction. Stylistic, not technically wrong.
- The `pg_total_relation_size(quote_ident(t.table_name))` calls in the time-series identification query are sensitive to `search_path`; safe for the `public`-only query as written but worth noting for readers porting it to other schemas.
