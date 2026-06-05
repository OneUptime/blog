# Validation Summary: How to Use Load-Based Auto-Scaling for Databases

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Python metrics
- SQLAlchemy connection pooling
- Prometheus and PromQL
- AWS RDS with boto3
- YAML alerting rules

## Sources Consulted
- OpenTelemetry Python instrumentation docs: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python metrics API docs: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- OpenTelemetry Prometheus exporter specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk_exporters/prometheus/
- OpenTelemetry Prometheus compatibility docs: https://opentelemetry.io/docs/compatibility/prometheus/client-libraries/
- SQLAlchemy 2.0 connection pooling docs: https://docs.sqlalchemy.org/en/20/core/pooling.html
- SQLAlchemy 2.0 Core events docs: https://docs.sqlalchemy.org/20/core/events.html
- SQLAlchemy 2.0 connections docs: https://docs.sqlalchemy.org/20/core/connections.html
- Prometheus histogram best practices: https://prometheus.io/docs/practices/histograms/
- Prometheus query functions docs: https://prometheus.io/docs/prometheus/latest/querying/functions/
- boto3 RDS describe_db_instances docs: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/rds/client/describe_db_instances.html

## Issues Found
- The original SQLAlchemy pool event example recorded the time a connection was checked out, not the time spent waiting to acquire a connection. Replaced the event hooks with a wrapper around `engine.connect()` that records acquisition latency.
- The OpenTelemetry observable gauge example used `metrics.Observation`; the current Python docs show importing `Observation` from `opentelemetry.metrics`. Updated the import and callback records.
- The query wrapper passed a raw string directly to `conn.execute()`. SQLAlchemy 2.0 expects executable constructs such as `text(sql)`, so the example now imports and uses `sqlalchemy.text`.
- The second Python snippet used `time.time()` without importing `time`. Added the import and switched timing examples to `time.perf_counter()`.
- The pool utilization PromQL divided by active plus idle plus overflow, which can be misleading because SQLAlchemy `checkedout()` already includes checked-out overflow connections. Updated the examples to divide active checked-out connections by the configured capacity of `pool_size + max_overflow`.
- The PromQL histogram examples did not aggregate bucket series by `le`, which is the documented pattern for `histogram_quantile()` over classic histogram buckets. Updated the examples to use `sum by (le)` or `sum by (pool, le)`.
- The PromQL examples used the unsuffixed histogram bucket metric name even though the OpenTelemetry Prometheus exporter appends unit suffixes by default. Updated wait-duration queries to use `db_pool_wait_duration_milliseconds_bucket` and added a note about Prometheus-compatible name translation.
- The alert expression added the separate `overflow` gauge to `active`, which double-counted overflow connections because `checkedout()` includes all checked-out connections. Removed the extra overflow term.
- The AWS RDS script called an undefined `adjust_replicas()` function. Added an explicit placeholder function so the provider-specific implementation boundary is clear.

## Review Notes
The query classification example intentionally remains simple and only treats statements beginning with `SELECT` as reads. Production code would need SQL parsing or framework-level instrumentation to classify CTEs, comments, stored procedures, and transaction behavior accurately.
