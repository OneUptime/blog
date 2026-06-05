# Validation Summary: How to Troubleshoot the Collector Slowly Accumulating Memory Until It Stops

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector internal telemetry
- OpenTelemetry Collector pprof extension
- OpenTelemetry Collector persistent sending queues and file storage
- OpenTelemetry Collector resource detection processor
- OpenTelemetry spanmetrics connector
- Prometheus scrape configuration and alerting rules
- Kubernetes CronJob

## Sources Consulted
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector troubleshooting documentation: https://opentelemetry.io/docs/collector/troubleshooting/
- OpenTelemetry Collector resiliency documentation: https://opentelemetry.io/docs/collector/resiliency/
- OpenTelemetry Collector Contrib spanmetrics connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/spanmetricsconnector/README.md
- OpenTelemetry Collector Contrib resource detection processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/resourcedetectionprocessor/README.md
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus querying basics documentation: https://prometheus.io/docs/prometheus/latest/querying/basics/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/

## Issues Found
- The post used older Go/Prometheus runtime metric names (`process_resident_memory_bytes`, `go_memstats_heap_inuse_bytes`, and `go_memstats_heap_objects`) for Collector internal telemetry. Updated the examples to current `otelcol_*` Collector process memory metrics and adjusted the alert expression accordingly.
- The persistent queue section claimed metadata stays in memory after export. Updated it to describe the documented persistent sending queue behavior: data is written to a file storage WAL, and queue/storage growth indicates export backlog.
- The persistent queue snippet referenced `file_storage` without defining and enabling the extension. Added a minimal `file_storage` extension and `service.extensions` entry.
- The resource detection section described cache growth and used the deprecated `resourcedetection` component name. Updated it to the current `resource_detection` name, used valid detector names, and changed the explanation to focus on timeout and avoiding inappropriate resource overwrite.
- The spanmetrics section treated `metrics_expiration` as the per-series cleanup setting. Updated it to include `series_expiration`, which is the current setting for expiring stale dimension combinations, while retaining `metrics_expiration` for whole-metric expiration.
- The summary still referred to persistent queue metadata. Updated it to persistent queue backlog.

## Review Notes
Local `go` and `kubectl` binaries were not installed in the workspace, so their command details were checked against official documentation rather than local `--help` output. The Kubernetes CronJob example is syntactically consistent with the Kubernetes CronJob structure, but a real deployment also needs a service account with RBAC permission to restart the target deployment.
