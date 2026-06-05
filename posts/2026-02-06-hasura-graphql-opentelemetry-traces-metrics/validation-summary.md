# Validation Summary: How to Monitor Hasura GraphQL Engine Performance

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Hasura GraphQL Engine
- OpenTelemetry
- OpenTelemetry Collector
- GraphQL
- PostgreSQL
- Prometheus metrics and alerting
- Python Flask action handlers

## Sources Consulted
- Hasura GraphQL Engine OpenTelemetry documentation: https://hasura.io/docs/latest/observability/opentelemetry/graphql-engine/
- Hasura Metadata API observability reference: https://hasura.io/docs/latest/api-reference/metadata-api/observability/
- Hasura metadata format reference for opentelemetry.yaml: https://hasura.io/docs/latest/migrations-metadata-seeds/metadata-format/
- Hasura Prometheus metrics reference: https://hasura.io/docs/latest/observability/enterprise-edition/prometheus/metrics/
- Hasura trace troubleshooting guide: https://hasura.io/docs/latest/observability/troubleshoot/traces/
- OpenTelemetry Collector processors reference: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry tail sampling example: https://opentelemetry.io/docs/demo/sample-configurations/tail-sampling-service-criticality/
- OpenTelemetry Collector transforming telemetry guide: https://opentelemetry.io/docs/collector/transforming-telemetry/

## Issues Found
- The post claimed Hasura GraphQL Engine OpenTelemetry could be configured with `HASURA_GRAPHQL_OTEL_*` environment variables. Official Hasura GraphQL Engine docs describe Console, CLI metadata (`metadata/opentelemetry.yaml`), and Metadata API configuration instead. Replaced the environment-variable example with a documented `opentelemetry.yaml` example.
- The post did not mention supported product/version constraints. Added that OpenTelemetry export is available for Hasura Cloud and self-hosted Enterprise, with traces from v2.18.0, metrics from v2.31.0, and logs from v2.35.0.
- The Metadata API example included `schedule_delay_millis`, which is not part of Hasura's documented `OpenTelemetryBatchSpanProcessor` schema. Removed it and kept `max_export_batch_size`.
- The trace attribute example used `db.statement`. Hasura's trace docs and source use `db.query` for SQL query text. Updated the attribute example and subscription filtering notes.
- The span list described a distinct SQL generation span. Hasura docs describe `/v1/graphql`, resolve execution plan, and database query spans more generally. Updated the wording to avoid claiming a specific undocumented span.
- The OpenTelemetry Collector slow-query example used an invalid/simplified filter configuration and did not actually filter by duration. Replaced it with a documented tail-sampling latency policy that keeps complete slow traces.
- Several metric names were incorrect: `hasura_graphql_request_duration_seconds`, `hasura_event_trigger_processed_total`, `hasura_event_trigger_processing_time`, and `hasura_subscription_poll_duration_seconds`. Replaced them with documented Hasura metrics: `hasura_graphql_execution_time_seconds`, `hasura_event_processed_total`, `hasura_event_processing_time_seconds`, and `hasura_subscription_total_time_seconds`.
- The PostgreSQL connection alert used a non-existent `status="waiting"` label on `hasura_postgres_connections`. Hasura documents `source_name`, `conn_info`, and `role` labels for that metric, plus `hasura_postgres_pool_wait_time` for pool waits. Updated the alert to use pool wait time.

## Review Notes
Hasura Cloud samples traces automatically, so users may not see every request trace in Cloud projects. The Python Flask action-handler snippet is structurally valid for demonstrating trace-context extraction, but it remains pseudocode because `run_validation` is application-specific.
