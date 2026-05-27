# Validation Summary: How to Trace Database Query Performance with Cloud SQL and Cloud Trace on GCP

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Cloud SQL for PostgreSQL
- Cloud SQL Query Insights
- Cloud Trace
- Cloud Monitoring
- OpenTelemetry Python
- OpenTelemetry SQLAlchemy instrumentation
- SQLAlchemy
- Flask
- pg8000
- PromQL
- gcloud CLI

## Sources Consulted
- Google Cloud Trace OpenTelemetry setup for Python: https://docs.cloud.google.com/trace/docs/setup/python-ot
- Google Cloud Trace migration guidance for OTLP endpoints: https://docs.cloud.google.com/trace/docs/migrate-to-otlp-endpoints
- Cloud SQL for PostgreSQL Query Insights documentation: https://cloud.google.com/sql/docs/postgres/using-query-insights
- Cloud SQL metrics reference in Cloud Monitoring: https://docs.cloud.google.com/monitoring/api/metrics_gcp_c
- Cloud Monitoring MQL deprecation notice: https://docs.cloud.google.com/stackdriver/docs/deprecations/mql
- PromQL for Cloud Monitoring metric mapping: https://cloud.google.com/monitoring/promql/promql-mapping
- OpenTelemetry Python SQLAlchemy instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/sqlalchemy/sqlalchemy.html

## Issues Found
- The package installation commands used Flask in the sample app but did not install `flask`. Added `flask` to the pip install command.
- The sqlcommenter example used `route` as a SQLAlchemy `commenter_options` key. OpenTelemetry SQLAlchemy instrumentation documents `db_driver`, `db_framework`, and `opentelemetry_values` as the available SQLAlchemy commenter options, so the unsupported `route` option was removed.
- The generated SQL comment example used an invalid abbreviated traceparent and a `route` tag. Replaced it with a valid W3C-style `traceparent` example and a SQLAlchemy framework tag.
- The text said Cloud SQL Insights could group the SQLAlchemy-instrumented example by route. Revised it to say Cloud SQL Insights can group by supported application tags and use trace context to connect database activity with traces.
- The dashboard examples used MQL. MQL is no longer recommended for new Cloud Monitoring dashboards and alerts, so the examples were changed to PromQL.
- The latency dashboard example used the aggregate execution-time metric and grouped by `metric.querystring`, but the aggregate metric does not have a `querystring` label and is not a latency distribution. Replaced it with the per-query latency distribution metric.
- The active connections dashboard example was converted from MQL to a current PromQL query.
- The alert policy used `aggregate/execution_time` on `cloudsql_database` with a seconds-based threshold. Replaced it with the per-query latency distribution metric on `cloudsql_instance_database` and a 500,000 microsecond threshold for 500 ms.

## Review Notes
Google currently recommends OTLP-based export for new Cloud Trace instrumentation where practical, although the Cloud Trace exporter is still documented as an available option. The local environment did not have `gcloud` installed, so CLI flags were verified against Google Cloud documentation rather than local `gcloud --help` output.
