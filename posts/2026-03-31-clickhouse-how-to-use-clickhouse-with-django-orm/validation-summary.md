# Validation Summary: How to Use ClickHouse with Django ORM

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse
- Django (Python web framework)
- django-clickhouse-backend package
- Django ORM / QuerySet API
- Python

## Sources Consulted
- django-clickhouse-backend on PyPI: https://pypi.org/project/django-clickhouse-backend/
- django-clickhouse-backend GitHub README: https://github.com/jayvynl/django-clickhouse-backend
- django-clickhouse-backend Configurations docs: https://github.com/jayvynl/django-clickhouse-backend/blob/main/docs/Configurations.md
- Django database routing documentation (used as reference for router pattern)

## Issues Found

1. **Wrong default port.** The post used `PORT: 8123`, which is ClickHouse's HTTP interface port. `django-clickhouse-backend` uses ClickHouse's native protocol, whose default port is `9000`. Changed to `9000`.

2. **Wrong field imports.** The model mixed `django.db.models` fields (`CharField`, `DateTimeField`, `IntegerField`) with `clickhouse_backend`. The backend's README explicitly instructs "import models from clickhouse_backend, not from django.db" because ClickHouse-native types (`StringField`, `DateTime64Field`, `UInt32Field`, etc.) are required. Rewrote the model to use only `clickhouse_backend.models` fields and removed the aliased `ch_models` import.

3. **`order_by` misplaced in Meta.** The post set `order_by = ('created_at', 'page')` as a separate Meta attribute. In this backend `order_by` is a constructor parameter of the engine class (e.g., `MergeTree(order_by=...)`). Moved it inside `MergeTree(...)`.

4. **Invalid `using = 'clickhouse'` in Meta.** `using` is not a valid Meta option; Django's per-model default database selection is done through `DATABASE_ROUTERS` or explicit `.using()` calls at query time (both of which the post already covers). Removed the line.

5. **Incorrect raw-SQL table name.** The raw SQL query selected `FROM default_pageview`, but the example model lives in `myapp` (per the `from myapp.models import PageView` imports). Django's default table name would be `myapp_pageview`. Updated accordingly.

## Review Notes
- The `django-clickhouse-backend` package is actively maintained but still evolving; field names and available engines can change between releases, so pinning a version in production code is recommended.
- `bulk_create` is the idiomatic way to insert into ClickHouse-backed models with this backend; per-row `.save()` works but is inefficient.
- The sample router only routes the `analytics` app to ClickHouse, while the example imports the model from `myapp`. Readers adapting the example should align the app label with their router logic.
