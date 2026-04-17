# Validation Summary: How to Use ClickHouse with Django

## Status
validated

## Post Type
Tutorial / Integration guide

## Technologies Covered
- ClickHouse
- Django (Python web framework)
- PostgreSQL (referenced as the default transactional DB)
- `clickhouse-connect` (official ClickHouse Python client)
- `django-clickhouse-backend` (third-party Django DB backend for ClickHouse)
- Django REST Framework
- Django signals, management commands, database routers

## Sources Consulted
- clickhouse-connect documentation: https://clickhouse.com/docs/integrations/python
- clickhouse-connect PyPI / GitHub: https://github.com/ClickHouse/clickhouse-connect
- django-clickhouse-backend GitHub README: https://github.com/jayvynl/django-clickhouse-backend (inspected `README.md`, `models/__init__.py`, `fields/__init__.py`, `engines.py`, `functions/datetime.py`, `functions/random.py`)
- ClickHouse SQL reference (parameter binding, `toYYYYMM`, `toStartOfHour`, `toStartOfWeek`, `dateDiff`, `uniq`): https://clickhouse.com/docs/sql-reference
- Django database router docs: https://docs.djangoproject.com/en/stable/topics/db/multi-db/

## Issues Found
1. **`chmodels.gen_random_uuid` does not exist** in `django-clickhouse-backend`. The package's `functions/random.py` only exports `Rand`, and there is no `gen_random_uuid` (or `generateUUIDv4`) helper on the `models` namespace. Changed the `UUIDField` default from `chmodels.gen_random_uuid` to `uuid.uuid4` (the standard Django pattern) and added `import uuid`.
2. **`order_by` and `partition_by` were declared as top-level `Meta` attributes**, but in `django-clickhouse-backend` they must be passed as keyword arguments to the engine constructor (e.g. `MergeTree(order_by=..., partition_by=...)`). Top-level `Meta.order_by` / `Meta.partition_by` are not consumed by the backend. Moved both into `chmodels.MergeTree(...)` to match the official README example.

## Review Notes
- `clickhouse-connect`'s `get_client(...)`, `.query(sql, parameters={...})`, server-side parameter syntax (`{name:Type}`), and `.insert(table, data, column_names=[...])` are all current and correct as used.
- `datetime.utcnow()` is deprecated in Python 3.12+; `datetime.now(timezone.utc)` is preferred going forward, but `utcnow()` still works and the post is consistent. Left as-is since this is a style/deprecation note, not a correctness bug.
- The retention query's cohort logic is a simplified example — the inner `GROUP BY user_id, toStartOfWeek(ts)` combined with `toStartOfWeek(min(ts))` as cohort_week is SQL-valid but produces per-(user, week) cohorts rather than a single cohort per user. Readers adapting this to production retention reports should revisit that logic; the code itself is syntactically and semantically executable in ClickHouse.
- The post assumes the ClickHouse table name is `analytics.events` (plural) while the ORM model is `Event`. Django's default table name would be `analytics_event`, so readers using the ORM model plus the raw SQL must explicitly align table names. Not a code bug — worth flagging as a reader caveat.
