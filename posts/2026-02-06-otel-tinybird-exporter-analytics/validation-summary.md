# Validation Summary: How to Send OpenTelemetry Data to Tinybird via the Tinybird Exporter for

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Tinybird exporter
- OpenTelemetry Collector batch, resource, transform, and attributes processors
- Tinybird Events API
- Tinybird data sources and pipe endpoints
- Tinybird SQL / ClickHouse SQL

## Sources Consulted
- OpenTelemetry Collector Contrib Tinybird exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/tinybirdexporter
- OpenTelemetry Collector Contrib Tinybird exporter configuration schema: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/tinybirdexporter/config.schema.yaml
- OpenTelemetry Collector Contrib Tinybird exporter trace conversion implementation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/tinybirdexporter/internal/traces.go
- Tinybird OpenTelemetry template: https://www.tinybird.co/templates/tinybird-otel-template
- Tinybird OpenTelemetry template trace data source: https://github.com/tinybirdco/tinybird-otel-template/blob/main/datasources/otel_traces.datasource
- Tinybird Events API documentation: https://www.tinybird.co/docs/api-reference/events-api
- Tinybird data sources documentation: https://www.tinybird.co/docs/forward/core-concepts/data-sources
- Tinybird pipe files documentation: https://www.tinybird.co/docs/forward/dev-reference/datafiles/pipe-files
- Tinybird endpoint query parameter documentation: https://www.tinybird.co/docs/forward/work-with-data/publish-data/endpoints
- OpenTelemetry Collector transform processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/transformprocessor
- OpenTelemetry Collector batch processor README: https://github.com/open-telemetry/opentelemetry-collector/tree/main/processor/batchprocessor

## Issues Found
- The Collector configuration used `otlphttp` against `https://api.tinybird.co/v0/events`, but Tinybird's Events API expects JSON/NDJSON events with a target data source, not raw OTLP HTTP export payloads. Replaced it with the official `tinybird` exporter using `endpoint`, `token`, `traces.datasource`, `sending_queue`, and `retry_on_failure`.
- The trace data source schema used guessed lower-case columns without Tinybird JSON path mappings. Updated it to a Tinybird `.datasource`-style schema aligned with the Tinybird exporter payload and OpenTelemetry template fields.
- The SQL examples queried `spans` and lower-case column names that did not match the corrected Tinybird data source. Updated the queries to use `otel_traces` and the exported column names such as `Timestamp`, `SpanName`, `SpanKind`, `StatusCode`, and `Duration`.
- The span kind and status filters used `SERVER` and `ERROR`, but the Tinybird exporter serializes OpenTelemetry enum string values such as `Server` and `Error`. Updated the filters accordingly.
- The pipe endpoint example omitted required Tinybird `.pipe` directives. Added `NODE`, `SQL >`, and `TYPE ENDPOINT` while preserving the original query intent.
- The high-volume batching example implied `send_batch_max_size: 10000` was a byte-size control for Tinybird ingest. Reworked the guidance to use the batch processor for Collector batching and the Tinybird exporter's `sending_queue.batch` settings for Events API payload sizing.
- The retention example showed `ALTER TABLE spans MODIFY TTL ...` as the Tinybird management approach. Replaced it with the `ENGINE_TTL` directive used in Tinybird data source definitions.
- The transform processor description said Tinybird required a custom format transformation before export. Clarified that the exporter handles payload formatting and that transforms are optional normalization.

## Review Notes
The post is now technically aligned with the official Tinybird exporter path. It still focuses on traces in the working examples even though the intro mentions traces, metrics, and logs; expanding the guide with separate metric and log schemas could be useful in a future revision.
