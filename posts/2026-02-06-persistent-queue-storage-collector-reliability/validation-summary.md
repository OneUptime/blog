# Validation Summary: How to Use Persistent Queue Storage in the Collector for Reliability

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib
- Collector `file_storage` extension
- Exporter `sending_queue` persistent queues
- Collector internal telemetry metrics
- Kubernetes StatefulSets and persistent volumes
- Docker
- telemetrygen
- Prometheus alerting and PromQL

## Sources Consulted
- OpenTelemetry Collector resiliency documentation: https://opentelemetry.io/docs/collector/resiliency/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector exporterhelper package documentation: https://go.opentelemetry.io/collector/exporter/exporterhelper
- OpenTelemetry Collector Contrib file storage extension documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/extension/storage/filestorage
- OpenTelemetry Collector Contrib telemetrygen documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/cmd/telemetrygen
- OpenTelemetry Collector Contrib releases: https://github.com/open-telemetry/opentelemetry-collector-contrib/releases

## Issues Found
- The post described persistent queues as configured with "`exporterhelper` extensions." Updated this to say persistent queues are configured through exporter `sending_queue` settings and a storage extension.
- The `file_storage.timeout` comments incorrectly described it as controlling sync/write frequency. Updated the comments to match the official meaning: maximum time to wait for file locks.
- The examples used `compaction.directory` as if it were a size limit and used unsupported `max_transaction_age` settings. Replaced those with valid compaction fields: a temporary compaction directory plus `rebound_needed_threshold_mib` and `rebound_trigger_threshold_mib`.
- The post claimed compaction compressed data or removed old data. Updated this to describe compaction as reclaiming unused disk space after storage grows and drains.
- Added `create_directory: true` where examples depend on the file storage extension creating queue directories.
- Updated the internal telemetry Prometheus endpoint configuration from ignored `service.telemetry.metrics.address` to the current `readers.pull.exporter.prometheus` configuration.
- Updated stale `otel/opentelemetry-collector-contrib:0.93.0` examples to `0.153.0`, the current release at review time.
- Removed an unused standalone PVC from the StatefulSet example because the StatefulSet already creates per-replica PVCs via `volumeClaimTemplates`.
- Fixed the Docker test command so the collector runs detached with a name and published OTLP/metrics ports.
- Corrected the `tmpfs` guidance to make clear that tmpfs is not persistent storage.
- Replaced an invalid PromQL histogram query using `otelcol_exporter_send_failed_spans_bucket`, which is not a histogram metric.
- Fixed the high disk I/O troubleshooting note so it no longer recommends changing `timeout` to reduce write frequency.
- Replaced an HTTP `wget` check against a gRPC backend port with a TCP connectivity check using `nc`.

## Review Notes
- The basic and production Collector configuration snippets were validated with `otel/opentelemetry-collector-contrib:0.153.0 validate`.
- Persistent queues reduce restart-related loss but do not eliminate all loss scenarios; disk exhaustion, disk failure, queue overflow, and retry limits can still cause data loss.
