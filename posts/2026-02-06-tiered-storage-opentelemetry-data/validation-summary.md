# Validation Summary: How to Use Tiered Storage for OpenTelemetry Data to Cut Storage Costs

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTelemetry Collector
- OTLP HTTP exporter
- ClickHouse MergeTree
- ClickHouse storage policies
- ClickHouse TTL rules
- S3-compatible object storage

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry OTLP exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry Collector OTLP HTTP exporter README: https://github.com/open-telemetry/opentelemetry-collector/tree/main/exporter/otlphttpexporter
- OpenTelemetry Collector exporter helper README: https://github.com/open-telemetry/opentelemetry-collector/tree/main/exporter/exporterhelper
- ClickHouse MergeTree table engine documentation: https://clickhouse.com/docs/engines/table-engines/mergetree-family/mergetree
- ClickHouse external disks and S3 storage documentation: https://clickhouse.com/docs/operations/storing-data
- ClickHouse system.storage_policies documentation: https://clickhouse.com/docs/operations/system-tables/storage_policies
- ClickHouse CREATE VIEW documentation: https://clickhouse.com/docs/sql-reference/statements/create/view

## Issues Found
- The Collector section said the Collector routed data based on tiering rules. Updated it to say the Collector fans out fresh telemetry while age-based migration is handled by the storage backend.
- The Collector snippet used the deprecated `otlphttp` exporter alias. Updated it to the current `otlp_http` component name.
- The Collector snippet implied direct OTLP writes to ClickHouse and S3 endpoints. Updated the endpoints and text to describe OTLP-compatible ingestion/archive gateways, since raw S3 is not an OTLP receiver and ClickHouse does not generally accept OTLP on the shown endpoint.
- The ClickHouse storage policy comment implied `move_factor` is age-based. Updated it to describe space-pressure movement to the next volume.
- The ClickHouse TTL rules moved data to the warm tier after 30 days instead of 2 days, and included a redundant move to the hot tier after 2 days. Updated the TTL rules to move to warm after 2 days, cold after 30 days, and delete after 365 days.
- The trace schema used `Map(LowCardinality(String), String)` and the downsampling query inferred server spans from `SpanName`. Updated the map key type to `String`, added `SpanKind`, and filtered service-entry spans with `SpanKind = 'SPAN_KIND_SERVER'`.

## Review Notes
The cost figures are illustrative and provider-dependent, but the post already qualifies them as approximate. The materialized view example applies to newly inserted data after the view is created; production backfill would require a separate insert or target-table workflow.
