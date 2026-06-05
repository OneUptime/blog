# Validation Summary: How to Configure the OpenTelemetry Collector to Export Traces to Lightstep

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OTLP receiver and exporter
- Lightstep / ServiceNow Cloud Observability
- TLS configuration
- Exporter retry and sending queue configuration
- Collector internal telemetry metrics
- Kubernetes Deployment manifests

## Sources Consulted
- Lightstep / ServiceNow Cloud Observability docs, "Quickstart: Collector for application data using Docker": https://docs.lightstep.com/docs/quick-start-collector
- Lightstep / ServiceNow Cloud Observability docs, "Ingest metrics using the Collector": https://docs.lightstep.com/docs/ingest-metrics-otel-collector
- OpenTelemetry Collector exporter helper documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/exporterhelper/README.md
- OpenTelemetry Collector TLS configuration documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/config/configtls/README.md
- OpenTelemetry Collector Contrib file storage extension documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/extension/storage/filestorage/README.md
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector resiliency documentation: https://opentelemetry.io/docs/collector/resiliency/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Local validation with `otel/opentelemetry-collector-contrib:latest validate --config=/config.yaml`

## Issues Found
- Removed `storage: null` from the basic `sending_queue` example. The Collector's exporter helper docs describe `storage` as optional and unset by default; omitting it is clearer and avoids implying that `null` is a meaningful storage setting.
- Corrected the advanced `sending_queue.queue_size` comment from "traces or metric data points" to "batches." The exporter helper documentation states that the default queue sizer is requests and `queue_size` is measured in the configured sizer units; for the shown config, this means batches.
- Added the missing `otlp` receiver and `batch` processor definitions to the advanced retry snippet because its pipeline referenced those components.
- Added `create_directory: true` to the `file_storage` extension example. The file storage extension requires the configured directory to exist unless directory creation is enabled.
- Updated the Collector internal telemetry configuration. `service.telemetry.metrics.address` is ignored in Collector v0.123.0 and rejected by the current contrib image; replaced it with the current `readers.pull.exporter.prometheus.host` and `port` schema.
- Added `without_type_suffix: true` and `without_units: true` to the Prometheus telemetry reader so the PromQL examples use the raw Collector metric names documented by OpenTelemetry.
- Replaced the undocumented `otelcol_exporter_send_retries_total` metric with `otelcol_exporter_in_flight_requests`, which the current docs define as including retry backoff.
- Updated the PromQL examples from `otelcol_exporter_send_failed_spans_total` and `otelcol_exporter_sent_spans_total` to the documented Collector metric names that match the configured Prometheus reader.
- Changed the queue note from saying that approaching `queue_size` means data is being lost to saying it means data is at risk of being dropped. The Collector docs distinguish queue size/capacity from actual enqueue failures and dropped data.
- Added `template.metadata.labels.app: otel-collector` to the Kubernetes Deployment snippet so the pod template labels match the Deployment selector.

## Review Notes
- The Lightstep endpoint `ingest.lightstep.com:443` and `lightstep-access-token` header match Lightstep's official Collector examples for the US data center. Lightstep also documents `ingest.eu.lightstep.com:443` for EU data center deployments.
- TLS settings such as `insecure`, `insecure_skip_verify`, `ca_file`, `cert_file`, `key_file`, and `min_version` match the Collector TLS configuration documentation.
- Retry settings `initial_interval`, `max_interval`, `max_elapsed_time`, `randomization_factor`, and `multiplier` match current exporter helper configuration.
