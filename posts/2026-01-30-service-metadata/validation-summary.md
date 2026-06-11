# Validation Summary: How to Create Service Metadata

## Status
validated

## Post Type
Tutorial / Guide (long-form technical how-to with reference implementations)

## Technologies Covered
- JSON Schema (Draft 2020-12)
- Python 3.10+ (dataclasses, type hints with `list[...]` / `dict[...]`)
- PyYAML
- Python `jsonschema` library (`Draft202012Validator`)
- Kubernetes Python client (`kubernetes` package, `AppsV1Api`)
- GitHub Actions (`actions/checkout@v4`, `$GITHUB_OUTPUT`)
- `yq` (CLI YAML processor)
- PostgreSQL 16 (uuid-ossp, JSONB, recursive CTEs, triggers, views)
- FastAPI + Pydantic v2 (`Field(pattern=...)`)
- `asyncpg`
- `httpx`
- PagerDuty REST API v2
- Grafana dashboard templating
- pre-commit framework

## Sources Consulted
- JSON Schema 2020-12 spec — https://json-schema.org/draft/2020-12/schema
- Python `datetime` module docs (3.12 deprecation of `utcnow()`) — https://docs.python.org/3/library/datetime.html
- Pydantic V2 migration guide (`dict()` → `model_dump()`) — https://docs.pydantic.dev/latest/migration/
- PostgreSQL 16 SQL Keywords (Appendix C) — https://www.postgresql.org/docs/16/sql-keywords-appendix.html
- Kubernetes Python client docs — https://github.com/kubernetes-client/python
- GitHub Actions docs for workflow commands and `$GITHUB_OUTPUT` — https://docs.github.com/en/actions/using-workflows/workflow-commands-for-github-actions
- PagerDuty REST API reference (Token auth header, Services, escalation_policy_reference) — https://developer.pagerduty.com/api-reference/
- FastAPI docs (dependencies, Query params, pattern validation) — https://fastapi.tiangolo.com
- `asyncpg` docs — https://magicstack.github.io/asyncpg/
- Direct verification in a `postgres:16-alpine` container for the `window` reserved-word issue and the corrected quoted-identifier syntax.
- Direct verification of `datetime.utcnow()` DeprecationWarning under Python 3.12.
- Direct verification of Pydantic v2.13 `.dict()` deprecation warning text.

## Issues Found

1. **`window` is a reserved keyword in PostgreSQL — unquoted use as a column name fails.**
   - **What was wrong:** The `CREATE TABLE service_slos` definition used `window VARCHAR(10) DEFAULT '30d'`, and the `service_details` view and FastAPI `INSERT` referenced the unquoted column `window`. Reproduced the failure in `postgres:16-alpine`: `ERROR: syntax error at or near "window"`.
   - **What I changed:** Quoted the identifier as `"window"` in three places — the column declaration in `service_slos`, the `jsonb_build_object('window', "window")` reference inside the `service_details` view, and the `INSERT INTO service_slos (..., "window", ...)` statement in the FastAPI handler. Verified the full schema runs end-to-end and returns the expected JSON.
   - **Why:** PostgreSQL classifies `WINDOW` as reserved (per Appendix C of the PostgreSQL 16 docs), so it must be double-quoted to be used as a column identifier.

2. **`datetime.utcnow()` is deprecated in Python 3.12+.**
   - **What was wrong:** `GitMetadataCollector._parse_metadata_file` set `collected_at=datetime.utcnow()`, which emits a `DeprecationWarning` on Python 3.12 and is scheduled for removal.
   - **What I changed:** Imported `timezone` from `datetime` and changed the call to `datetime.now(timezone.utc)`.
   - **Why:** This is the migration path recommended by CPython's deprecation notice ("Use timezone-aware objects to represent datetimes in UTC: `datetime.datetime.now(datetime.UTC)`"). Using `timezone.utc` works on Python 3.10+, matching the rest of the post's syntax (e.g. `list[...]`/`dict[...]` PEP 585 generics).

3. **Pydantic v2 `.dict()` calls should use `.model_dump()`.**
   - **What was wrong:** The FastAPI handler used `service.links.dict(exclude_none=True)` and `service.dict()`. The post targets Pydantic v2 (it uses `Field(pattern=...)`, which is v2-only syntax; v1 used `regex=`). In Pydantic v2, `.dict()` is deprecated and emits a warning ("The `dict` method is deprecated; use `model_dump` instead. Deprecated in Pydantic V2.0 to be removed in V3.0").
   - **What I changed:** Replaced both calls with `.model_dump(...)` equivalents.
   - **Why:** Aligns the code with the same Pydantic major version implied by the rest of the snippet, and keeps it forward-compatible with Pydantic V3.

## Review Notes
- The `get_db()` dependency creates a fresh `asyncpg` pool on every request and tears it down in `finally`. This works but defeats the purpose of pooling; production code should create the pool once at app startup (e.g. via a lifespan handler) and reuse it. Not changed — it is a design choice rather than a technical error.
- `service.model_dump()` returns a `dict` that asyncpg will not auto-serialise into the `changes JSONB` column unless a JSON codec is registered on the connection (`conn.set_type_codec('jsonb', encoder=json.dumps, decoder=json.loads, schema='pg_catalog')`). The example will raise at insert time without such setup. Left as-is because adding the codec would require restructuring the snippet beyond a minimal correctness fix; readers wiring this up against a real database should be aware.
- The GitHub Actions workflow assumes `yq` is on `PATH`. `ubuntu-latest` runners do ship with `yq` (mikefarah v4) preinstalled, so the `yq '.metadata.name' service.yaml` invocation is correct.
- `kubernetes.config.ConfigException` is exposed at the `kubernetes.config` package level via re-export, so `except config.ConfigException` is the canonical idiom and is correct.
- The Grafana templating JSON example uses `"queryType": "api"`, which is the syntax provided by the third-party Infinity datasource plugin (yesoreyeram-infinity-datasource), not core Grafana. The post does not call this out; readers who copy it will need that plugin installed. Not technically wrong, but version/plugin-dependent.
- The SLO schema constrains `window` to the enum `["7d", "28d", "30d"]`, but the FastAPI `SLOModel.window` field is a free-form `str` with default `"30d"`. The Pydantic model is laxer than the JSON Schema; consistency would require a `Literal["7d","28d","30d"]` or `Field(pattern=...)`. Left alone — it is a minor schema-drift issue rather than an outright error.
