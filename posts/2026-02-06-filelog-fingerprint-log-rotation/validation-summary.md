# Validation Summary: How to Configure the Filelog Receiver with Fingerprint-Based Log Rotation

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib filelog receiver
- OpenTelemetry Collector file_storage extension
- logrotate
- Collector internal telemetry metrics

## Sources Consulted
- OpenTelemetry Collector Contrib `filelog` receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/filelogreceiver/README.md
- OpenTelemetry Collector Contrib `file_storage` extension documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/extension/storage/filestorage
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/

## Issues Found
- Corrected the fingerprint explanation to avoid describing the fingerprint as a hash and to align with the receiver's documented use of file identity and first-byte content fingerprints.
- Added `service.extensions: [file_storage]` to the production configuration so the referenced storage extension is enabled.
- Corrected the `copytruncate` guidance. Increasing `fingerprint_size` is not the control for truncation behavior; the filelog receiver documents `on_truncate` for this case, so the snippet now uses `on_truncate: read_new`.
- Removed a duplicate `include` key from the create/rename rotation YAML snippet.
- Corrected the compressed rotation section. The filelog receiver can read gzip files when `compression` is configured, so the text now scopes the warning to unconfigured compressed input.
- Updated the internal telemetry snippet because `service.telemetry.metrics.address` is ignored in Collector v0.123.0 and later. The example now uses a Prometheus pull reader with `host` and `port`.
- Corrected the file tracking metric names from `otelcol_filelog_*` to the documented `otelcol_fileconsumer_open_files` and `otelcol_fileconsumer_reading_files`, and removed the unsupported `otelcol_filelog_lines_read` metric.

## Review Notes
The receiver's behavior and Collector telemetry configuration are version-sensitive. The validated guidance reflects the current upstream documentation available on 2026-06-05.
