# Validation Summary: How to Deploy the OpenTelemetry Collector as a Linux Systemd Service

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- OpenTelemetry Collector Contrib
- OpenTelemetry Collector configuration
- Linux systemd service units
- journald and journalctl
- logrotate
- Prometheus Remote Write
- OTLP and OTLP/HTTP
- Grafana Loki OTLP log ingestion
- Zipkin exporter

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector exporter documentation: https://opentelemetry.io/docs/collector/components/exporter/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector v0.111.0 release notes for logging exporter removal and telemetry address deprecation: https://github.com/open-telemetry/opentelemetry-collector/releases/tag/v0.111.0
- OpenTelemetry Collector Contrib v0.131.0 release notes for Loki exporter removal: https://github.com/open-telemetry/opentelemetry-collector-contrib/releases/tag/v0.131.0
- Memory ballast extension package documentation: https://pkg.go.dev/go.opentelemetry.io/collector/extension/ballastextension
- File storage extension package documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/extension/storage/filestorage
- Grafana Loki OpenTelemetry ingestion documentation: https://grafana.com/docs/loki/latest/send-data/otel/
- systemd.unit, systemd.service, and systemd.exec man pages on the local Ubuntu system

## Issues Found
- The post used OpenTelemetry Collector Contrib `0.93.0` for installation and `0.94.0` for upgrade examples. These are outdated for a current deployment guide, so both examples now use `0.153.0`, the current release available during review.
- The Collector config used legacy environment variable syntax such as `${HOST_NAME}` and `${PROM_BEARER_TOKEN}`. Updated these to the documented `${env:...}` syntax.
- The config included an `attributes` processor that attempted to set values from `${http.request.method}` and `${http.response.status_code}`. That syntax would be interpreted as environment-variable expansion rather than telemetry attribute lookup, so the invalid processor and pipeline references were removed.
- The config used the removed `logging` exporter. Replaced it with the current `debug` exporter and updated all pipelines.
- The config used the removed Loki exporter and Loki push API path. Replaced it with `otlphttp/loki` targeting Loki's OTLP endpoint, as recommended by Grafana Loki documentation.
- The config enabled `file_storage` but did not attach it to exporter sending queues and did not create the storage directory. Added `storage: file_storage` to network exporter queues and added directory creation during installation.
- The config used the deprecated `memory_ballast` extension. Removed it and added `GOMEMLIMIT=1600MiB` to the systemd environment for the 2 GiB memory limit example.
- The internal telemetry metrics config used `service.telemetry.metrics.address`, which is deprecated and ignored in newer Collector versions. Replaced it with the current `readers.pull.exporter.prometheus` configuration.
- `StartLimitBurst` and `StartLimitIntervalSec` were shown under `[Service]`; systemd documents them as unit-level settings. Moved them under `[Unit]`.
- The service management and logrotate examples used `systemctl reload otelcol`, but the unit does not define `ExecReload=`. Replaced the management example with restart and changed logrotate to `copytruncate`.
- The upgrade rollback copied a broad backup glob, which could restore an arbitrary backup. Changed it to restore the exact binary backed up by that script run.
- The Zipkin exporter example omitted `/api/v2/spans` from the endpoint. Updated it to the documented Zipkin API path.

## Review Notes
The examples were reviewed against official documentation and local systemd man pages. A live `otelcol validate` run was not completed because the workspace filesystem had only about 198 MB free and downloading the current Collector Contrib binary failed with "No space left on device."
