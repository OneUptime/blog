# Validation Summary: How to Enable SQLCommenter in OpenTelemetry SQLAlchemy for Query-Level Trace

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Python
- OpenTelemetry SQLAlchemy instrumentation
- SQLCommenter
- SQLAlchemy
- Flask instrumentation
- PostgreSQL
- MySQL
- SQLite
- W3C Trace Context

## Sources Consulted
- OpenTelemetry Python Contrib SQLAlchemy instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/sqlalchemy/sqlalchemy.html
- OpenTelemetry Python Contrib SQLAlchemy instrumentation source: https://opentelemetry-python-contrib.readthedocs.io/en/latest/_modules/opentelemetry/instrumentation/sqlalchemy.html
- OpenTelemetry Python Contrib SQLAlchemy engine source: https://raw.githubusercontent.com/open-telemetry/opentelemetry-python-contrib/main/instrumentation/opentelemetry-instrumentation-sqlalchemy/src/opentelemetry/instrumentation/sqlalchemy/engine.py
- OpenTelemetry SQL commenter utility source: https://raw.githubusercontent.com/open-telemetry/opentelemetry-python-contrib/main/opentelemetry-instrumentation/src/opentelemetry/instrumentation/sqlcommenter_utils.py
- OpenTelemetry Python Contrib Flask instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/flask/flask.html
- PostgreSQL logging documentation: https://www.postgresql.org/docs/current/runtime-config-logging.html
- PostgreSQL pg_stat_statements documentation: https://www.postgresql.org/docs/current/pgstatstatements.html
- MySQL slow query log documentation: https://dev.mysql.com/doc/refman/8.4/en/slow-query-log.html
- SQLAlchemy engine configuration documentation: https://docs.sqlalchemy.org/en/20/core/engines.html

## Issues Found
- The post claimed OpenTelemetry SQLAlchemy SQL comments include service name, service version, route, controller/action, and custom span tags. The current documented SQLAlchemy commenter keys are `db_driver`, `db_framework`, and `opentelemetry_values`; application metadata remains on correlated spans. Updated the metadata list, SQL examples, commenter options, Flask section, and custom-tags section.
- The instrumentation examples passed `service="order-service"` to `SQLAlchemyInstrumentor().instrument()`, which is not a documented SQLAlchemy instrumentation option. Removed it and kept service metadata on the OpenTelemetry `Resource`.
- The installation command included `opentelemetry-util-http` but omitted packages needed by the Flask example. Removed the unnecessary direct dependency from the main install command and added `flask opentelemetry-instrumentation-flask` for the Flask section.
- The monitoring section claimed it measured SQLCommenter overhead and suggested a typical `< 1ms` overhead without verification. Reworded it to monitor query duration and log volume while comments are enabled.
- The PostgreSQL and MySQL database-specific notes overstated logging behavior. Updated PostgreSQL guidance to use `log_min_duration_statement` or intentional `log_statement` logging, and clarified that MySQL `log_slow_extra` adds extra fields rather than being required for SQL comments in query text.

## Review Notes
All Python code blocks were checked with `ast.parse` for syntax. Runtime execution was not performed because the local environment does not have the OpenTelemetry and SQLAlchemy packages installed or a PostgreSQL database configured.
