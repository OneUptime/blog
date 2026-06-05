# Validation Summary: How to Configure Persistent Disk-Backed Queues in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector `file_storage` extension
- OpenTelemetry Collector exporter sending queues and retry settings
- OTLP gRPC and OTLP HTTP exporters
- Grafana Tempo, Grafana Loki, and Prometheus remote write
- Kubernetes StatefulSet and PersistentVolumeClaim storage
- Prometheus alerting rules
- Bash and Python examples

## Sources Consulted
- OpenTelemetry Collector resiliency documentation: https://opentelemetry.io/docs/collector/resiliency/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector exporterhelper persistent queue documentation: https://pkg.go.dev/go.opentelemetry.io/collector/exporter/exporterhelper
- OpenTelemetry Collector Contrib file storage extension documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/extension/storage/filestorage
- OpenTelemetry Protocol exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry Collector Contrib releases: https://github.com/open-telemetry/opentelemetry-collector-contrib/releases
- Grafana Loki OpenTelemetry ingestion documentation: https://grafana.com/docs/loki/latest/send-data/otel/
- Grafana Loki HTTP API documentation: https://grafana.com/docs/loki/latest/api/
- Kubernetes StatefulSet storage documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes kubectl wait documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/

## Issues Found
- The OTLP gRPC exporter examples pointed at in-cluster Tempo endpoints without explicitly disabling TLS. Added `tls.insecure: true` so the plaintext `tempo.monitoring.svc:4317` examples match the OpenTelemetry OTLP exporter configuration rules.
- The logs exporter used the OTLP gRPC exporter against `loki.monitoring.svc:3100`, which is not Loki's recommended OTLP ingestion configuration. Changed it to `otlphttp/logs` with `endpoint: http://loki.monitoring.svc:3100/otlp`, and updated the logs pipeline to use that exporter.
- The Kubernetes example included a standalone PVC that was not mounted by the StatefulSet. Removed the unused PVC manifest and kept the `volumeClaimTemplates` configuration, which creates one PVC per Collector pod.
- The Collector image tag was pinned to `otel/opentelemetry-collector-contrib:0.96.0`, which is outdated compared with the current v0.153.0 release. Updated the example image tag to `0.153.0`.
- The crash recovery script used `kubectl exec` with `ls` and counted files under the `file_storage` directory. The file storage extension stores component data in storage files and the contrib image may not include shell utilities, so file counts are not a reliable queue-depth check. Replaced it with a `kubectl port-forward` plus `otelcol_exporter_queue_size` metric check.
- The rebound compaction comment described the threshold as reclaiming more than 10MB. Updated it to reflect the documented two-threshold behavior: mark compaction as needed after the storage grows past the needed threshold, then compact after it drains below the trigger threshold.

## Review Notes
- The sizing calculation is a reasonable estimate, but real disk use depends on serialized telemetry size, queue metadata, compression behavior, and bbolt/file storage overhead.
- Rebound compaction settings are valid, but the exact thresholds should be tuned with production queue growth and drain patterns.
- The crash recovery script verifies that queued data remains visible through Collector metrics after a forced restart when the queue is non-empty. For a stronger end-to-end test, run it during a controlled exporter outage and verify delivery in the backend after recovery.
