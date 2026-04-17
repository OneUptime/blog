# Validation Summary: How to Use ClickHouse with Apache Superset

## Status
validated

## Post Type
Tutorial / Integration Guide

## Technologies Covered
- Apache Superset
- ClickHouse
- clickhouse-connect (Python driver and SQLAlchemy dialect)
- SQLAlchemy
- Docker Compose
- Redis (caching)
- Celery (async / scheduled reports)
- Jinja templating (Superset macros)
- ClickHouse `SummingMergeTree` engine

## Sources Consulted
- [Connect Superset to ClickHouse | ClickHouse Docs](https://clickhouse.com/docs/integrations/superset)
- [clickhouse-connect on PyPI](https://pypi.org/project/clickhouse-connect/)
- [ClickHouse date-time functions (date_add)](https://clickhouse.com/docs/sql-reference/functions/date-time-functions)
- [Apache Superset `pyproject.toml` (extras_require)](https://github.com/apache/superset/blob/master/pyproject.toml)
- [Apache Superset — Configuring Superset](https://superset.apache.org/docs/configuration/configuring-superset/)
- [Apache Superset Alerts & Reports docs](https://superset.apache.org/docs/configuration/alerts-reports/)
- [ClickHouse SummingMergeTree docs](https://clickhouse.com/docs/engines/table-engines/mergetree-family/summingmergetree)

## Issues Found
1. **ClickHouse `dateAdd` unit argument was unquoted.** The post used `dateAdd(month, -12, today())`. The documented and unambiguous form of `dateAdd(unit, value, date)` uses a string literal for the unit. Changed to `dateAdd('month', -12, today())` so the query is portable across ClickHouse versions and unambiguous to the parser.
2. **Invalid `apache-superset[async]` extra.** Apache Superset's `pyproject.toml` does not define an `async` extra (valid extras include `clickhouse`, `gevent`, `playwright`, `postgres`, etc.). Running `pip install apache-superset[async]` would not install the packages needed for scheduled/emailed reports. Replaced with `pip install celery[redis] apache-superset[playwright]`, which installs the actual dependencies used for Celery-backed scheduling and Playwright-based screenshot/PDF rendering.

## Review Notes
- The SQLAlchemy URI `clickhousedb://default:password@localhost:8123/default` is the correct scheme registered by `clickhouse-connect` and is the form shown in the ClickHouse integration docs for Superset.
- The Superset REST API endpoints `/api/v1/security/login` and `/api/v1/database/` with the fields used (`database_name`, `sqlalchemy_uri`, `expose_in_sqllab`, `allow_run_async`, `allow_dml`) are correct for current Superset versions.
- `SQL_MAX_ROW` and `ROW_LIMIT` are valid `superset_config.py` settings. The defaults shown are smaller than upstream defaults (upstream `SQL_MAX_ROW` default is 1,000,000 and `ROW_LIMIT` default is 50,000) but explicitly lowering them is a legitimate configuration choice.
- `FEATURE_FLAGS` used (`GLOBAL_ASYNC_QUERIES`, `DASHBOARD_NATIVE_FILTERS`, `DASHBOARD_CROSS_FILTERS`) are all real Superset feature flags. Note that `DASHBOARD_NATIVE_FILTERS` is enabled by default in recent Superset versions and the flag is being phased out — future readers may not need to set it explicitly.
- Jinja macros `{{ from_dttm }}`, `{{ to_dttm }}`, and `filter_values('column')` are valid Superset templating macros.
- `SummingMergeTree((revenue, orders, customers))` is valid syntax for specifying the columns to sum.
- The `clickhouse/clickhouse-server:latest` Docker image and port `8123` (HTTP) / `9000` (native) are correct.
