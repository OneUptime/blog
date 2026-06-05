# Validation Summary: Configure Log Rotation Handling in the OpenTelemetry Collector Filelog Receiver

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib Filelog receiver
- OpenTelemetry File Storage extension
- logrotate
- YAML Collector configuration

## Sources Consulted
- OpenTelemetry Collector Contrib Filelog receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/filelogreceiver/README.md
- OpenTelemetry Collector File Storage extension documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/extension/storage/filestorage/README.md
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- logrotate manual page: https://man7.org/linux/man-pages/man5/logrotate.conf.5.html

## Issues Found
- The rename/create explanation implied the Filelog receiver only tails by inode. Updated the wording to describe the general path-following problem and then state that Filelog uses internal identity plus content fingerprinting.
- The copytruncate YAML snippet had duplicate `include` keys and did not configure `on_truncate`. Merged the include list and added `on_truncate: read_whole_file`, matching the current Filelog receiver truncation behavior options.
- The copytruncate explanation said truncation automatically resets the read position. Updated it to explain that `on_truncate` controls whether the receiver ignores, re-reads, or skips to new content after truncation.
- The compressed file section claimed the Filelog receiver cannot read compressed files natively. Updated it to explain that gzip files can be read when `compression` is set to `gzip` or `auto`, while preserving the delay-compression and exclude-pattern guidance.
- The internal telemetry example used the old `service.telemetry.metrics.address` setting, which current Collector docs say is ignored as of v0.123.0. Replaced it with the current `metrics.readers.pull.exporter.prometheus.host` and `port` configuration.
- The metric name `otelcol_filelog_open_files` was incorrect. Replaced it with the documented `otelcol_fileconsumer_open_files` and added `otelcol_fileconsumer_reading_files`.

## Review Notes
The Filelog receiver and File Storage extension are documented as beta components in the Collector Contrib distribution. Internal telemetry configuration is still based on the OpenTelemetry SDK declarative configuration schema, which the official docs note may continue to change before a 1.0 schema release.
