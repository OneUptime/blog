# Validation Summary: How to Configure the Tinybird Exporter in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib Tinybird exporter
- OpenTelemetry Collector receivers, processors, and exporter helper settings
- Tinybird Events API
- Tinybird Data Sources and Pipes
- ClickHouse SQL

## Sources Consulted
- OpenTelemetry Collector exporters documentation: https://opentelemetry.io/docs/collector/components/exporter/
- OpenTelemetry Collector Contrib Tinybird exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/tinybirdexporter
- OpenTelemetry Collector Contrib Tinybird exporter configuration source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/tinybirdexporter/config.go
- Tinybird OpenTelemetry ingestion guide: https://www.tinybird.co/docs/classic/get-data-in/guides/ingest-from-opentelemetry
- Tinybird API regions and endpoints documentation: https://www.tinybird.co/docs/api-reference
- Tinybird OpenTelemetry template Data Sources: https://github.com/tinybirdco/tinybird-otel-template
- OpenTelemetry Transform Processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/transformprocessor
- Tinybird Pipe files documentation: https://www.tinybird.co/docs/forward/dev-reference/datafiles/pipe-files

## Issues Found
- The exporter examples used a top-level `datasource` field, but the official Tinybird exporter config uses `traces.datasource`, `logs.datasource`, and `metrics.<type>.datasource`. Updated all exporter snippets to use the documented per-signal structure.
- The prerequisites did not state the minimum Collector Contrib release that includes the Tinybird exporter. Updated the prerequisite to v0.131.0 or newer.
- The metrics examples treated all metric types as a single Tinybird Data Source. Updated them to configure separate gauge, sum, histogram, and exponential histogram Data Sources, matching the exporter schema.
- The trace Data Source schema did not match the JSON field names emitted by the Tinybird exporter. Updated the example schema to use the documented Tinybird OpenTelemetry trace field names and JSON paths.
- The advanced queue example used `storage_type: file_storage`, which is not a documented Tinybird exporter queue field. Removed the invalid key.
- The advanced trace transform used unsupported function-style timestamp expressions and an unsupported `ConvertAttributesToString` function. Replaced it with a valid OTTL timestamp-field expression and removed the unsupported conversion.
- The Tinybird regional endpoint comment listed an outdated/non-documented EU endpoint form. Updated it to examples from the current Tinybird regions documentation.
- The Tinybird SQL examples referenced the old lower-case schema columns. Updated the queries to use the corrected trace schema field names.
- The Tinybird Pipe output directives used lower-case values. Updated them to the documented `TYPE MATERIALIZED` and `TYPE ENDPOINT` values.

## Review Notes
The post is technically valid after corrections. The Tinybird exporter is listed as alpha for traces, metrics, and logs in the current OpenTelemetry Collector exporter registry, so production users should continue to check release notes for configuration changes.
