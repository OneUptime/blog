# Validation Summary: How to Trace Apache Airflow DAGs with OpenTelemetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache Airflow
- OpenTelemetry tracing
- OpenTelemetry metrics
- Python
- Airflow DAGs, PythonOperator, XComs, and custom operators
- PostgreSQL Airflow provider hook

## Sources Consulted
- Apache Airflow 2.10.3 Traces Configuration: https://airflow.apache.org/docs/apache-airflow/2.10.3/administration-and-deployment/logging-monitoring/traces.html
- Apache Airflow 2.10.3 Configuration Reference: https://airflow.apache.org/docs/apache-airflow/2.10.3/configurations-ref.html
- Apache Airflow stable Traces Configuration: https://airflow.apache.org/docs/apache-airflow/stable/administration-and-deployment/logging-monitoring/traces.html
- Apache Airflow stable Metrics Configuration: https://airflow.apache.org/docs/apache-airflow/stable/administration-and-deployment/logging-monitoring/metrics.html
- OpenTelemetry Python Instrumentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python Context API: https://opentelemetry-python.readthedocs.io/en/stable/_modules/opentelemetry/context.html
- OpenTelemetry OTLP Exporter Configuration: https://opentelemetry.io/docs/concepts/sdk-configuration/otlp-exporter-configuration/
- Apache Airflow Postgres provider hook documentation: https://airflow.apache.org/docs/apache-airflow-providers-postgres/stable/_api/airflow/providers/postgres/hooks/postgres/index.html

## Issues Found
- The post said Airflow tracing support started in Airflow 2.7. Airflow's configuration reference documents the `[traces]` OpenTelemetry options as new in Airflow 2.10. Updated the claim to Airflow 2.10.
- The tracing configuration snippet used port `4318` and described `otel_task_log_event` as an exporter protocol setting. Airflow's documented examples use `otel_port = 8889`, `otel_application = airflow`, and `otel_task_log_event` for adding task logs as span events. Updated the snippet and removed the incorrect protocol comment.
- The environment variable example only used Airflow-specific trace settings and did not show the current standard OpenTelemetry exporter configuration recommended by Airflow stable docs. Added `OTEL_EXPORTER_OTLP_ENDPOINT` and `OTEL_EXPORTER_OTLP_PROTOCOL`, and kept `OTEL_SERVICE_NAME`.
- The custom task instrumentation example configured a new global `TracerProvider` inside the DAG file, which can conflict with Airflow's own OpenTelemetry setup. Updated the example to reuse Airflow's configured tracer provider via `trace.get_tracer(...)`.
- The context propagation examples used `context.active()` / `otel_context.active()`, which are not OpenTelemetry Python APIs. Replaced them with `context.get_current()` / `otel_context.get_current()`.
- The exception handling example used a non-recommended status API shape. Updated it to import `Status` and `StatusCode` and call `span.set_status(Status(StatusCode.ERROR, str(e)))`, matching OpenTelemetry Python documentation.
- The custom PostgreSQL operator example used `PostgresHook` without importing it. Added the current provider import from `airflow.providers.postgres.hooks.postgres`.
- The metrics section said Airflow 2.7+ supports OpenTelemetry metrics. Airflow's configuration reference documents metrics OpenTelemetry support as added in Airflow 2.6. Updated the version claim and metrics config port.

## Review Notes
- Airflow 3.2 deprecates several Airflow-specific OpenTelemetry endpoint keys in favor of standard OpenTelemetry environment variables. The post now includes those standard variables, but still shows Airflow-specific keys because they remain relevant to Airflow 2.10-era deployments.
- The snippets use placeholder functions such as `fetch_orders_from_api()` and `bulk_insert()`. These are acceptable for a tutorial, but a production DAG should avoid passing large datasets through XCom and should prefer durable storage or object references for large payloads.
