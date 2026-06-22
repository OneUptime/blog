# Validation Summary: How to Integrate ClickHouse with Apache Superset

## Status
validated

## Post Type
Tutorial / Integration guide

## Technologies Covered
- Apache Superset
- ClickHouse
- ClickHouse Connect
- SQLAlchemy
- Docker Compose
- Redis
- PostgreSQL
- Celery
- Jinja SQL templating
- ClickHouse SQL

## Sources Consulted
- Apache Superset ClickHouse database support: https://superset.apache.org/user-docs/databases/supported/clickhouse/
- Apache Superset database connection guide: https://superset.apache.org/user-docs/6.0.0/configuration/databases/
- Apache Superset SQL templating documentation: https://superset.apache.org/admin-docs/configuration/sql-templating/
- Apache Superset user SQL templating guide: https://superset.apache.org/user-docs/using-superset/sql-templating/
- Apache Superset caching documentation: https://superset.apache.org/admin-docs/configuration/cache/
- Apache Superset async queries via Celery documentation: https://superset.apache.org/admin-docs/configuration/async-queries-celery/
- Apache Superset feature flags documentation: https://superset.apache.org/admin-docs/configuration/feature-flags/
- Apache Superset ClickHouse engine spec source: https://github.com/apache/superset/blob/master/superset/db_engine_specs/clickhouse.py
- ClickHouse Superset integration guide: https://clickhouse.com/docs/integrations/superset
- ClickHouse Python integration guide: https://clickhouse.com/docs/integrations/python
- ClickHouse Connect SQLAlchemy support: https://clickhouse.com/docs/integrations/language-clients/python/sqlalchemy
- ClickHouse Connect driver API: https://clickhouse.com/docs/integrations/language-clients/python/driver-api
- ClickHouse date and time functions: https://clickhouse.com/docs/sql-reference/functions/date-time-functions
- ClickHouse AggregateFunction data type: https://clickhouse.com/docs/sql-reference/data-types/aggregatefunction
- ClickHouse AggregatingMergeTree documentation: https://clickhouse.com/docs/engines/table-engines/mergetree-family/aggregatingmergetree
- ClickHouse windowFunnel documentation: https://clickhouse.com/docs/sql-reference/aggregate-functions/parametric-functions
- ClickHouse query cache documentation: https://clickhouse.com/docs/operations/query-cache
- ClickHouse CREATE USER documentation: https://clickhouse.com/docs/sql-reference/statements/create/user
- ClickHouse GRANT documentation: https://clickhouse.com/docs/sql-reference/statements/grant

## Issues Found
- The Superset configuration used `RedisCache` without importing it. Added the documented `from flask_caching.backends.rediscache import RedisCache` import.
- The ClickHouse connection examples mixed ClickHouse Connect with a native-protocol URL. Updated the recommended URI to `clickhousedb://...` and kept `clickhousedb+connect://...` as the explicit ClickHouse Connect dialect.
- The advanced connection settings included native-driver options that do not apply to ClickHouse Connect. Replaced them with ClickHouse Connect-compatible options.
- The virtual dataset and exploration examples used Grafana-style macros such as `$__timeGroup` and `$__timeFilter`, which Superset does not provide. Replaced them with Superset Jinja time filtering via `get_time_filter` and `from_dttm`/`to_dttm` defaults.
- The custom time grain snippet used the wrong Superset engine spec attribute. Updated it to patch `ClickHouseBaseEngineSpec._time_grain_expressions`, matching the current Superset ClickHouse engine spec.
- The pre-aggregation materialized view used `SummingMergeTree` with aggregate function state columns. Changed it to `AggregatingMergeTree` and updated the aggregate state functions to use `countState`, `sumState`, `uniqState` with corresponding `Merge` functions in the query view.
- The dependent filter example assumed a selected category was always present. Added a guard around `filter_values("category")`.
- The SQL Lab event-type filter used an invalid Jinja `join(..., attribute='quoted')` pattern. Replaced it with Superset's documented `where_in` filter.
- The Celery configuration used older uppercase Celery setting names. Updated it to the lowercase settings used in Superset's current Celery examples and added the documented imports.
- The row-level security snippet defined `GUEST_TOKEN_JWT_ALGO` as a function and used a non-current feature flag. Changed it to a config value and used `RLS_IN_SQLLAB` for SQL Lab RLS behavior.

## Review Notes
- The Docker Compose example is still a simplified deployment sketch. For production or repeatable local builds, the ClickHouse driver should be baked into the Superset image or installed through the official Docker requirements workflow rather than installed manually in a running container.
- `ENABLE_TEMPLATE_PROCESSING` is powerful and should be enabled only for trusted authors, as noted in Superset's SQL templating documentation.
- `from_dttm` and `to_dttm` remain usable in Superset examples but are deprecated in newer Superset documentation in favor of `get_time_filter` where practical.
