# Validation Summary: How to Implement Persistent Storage for OpenTelemetry Collector Queues

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector `file_storage` extension
- OpenTelemetry Collector exporter sending queues and retry settings
- OpenTelemetry Collector internal telemetry metrics
- Kubernetes StatefulSets, PersistentVolumeClaims, and StorageClasses
- AWS EBS CSI driver
- Bash
- Prometheus alerting rules

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector resiliency documentation: https://opentelemetry.io/docs/collector/resiliency/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector `file_storage` extension package documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/extension/storage/filestorage
- OpenTelemetry Collector `health_check` extension package documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/extension/healthcheckextension
- OpenTelemetry Collector exporter helper package documentation: https://pkg.go.dev/go.opentelemetry.io/collector/exporter/exporterhelper
- Kubernetes StorageClass documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Amazon EKS StorageClass parameter reference: https://docs.aws.amazon.com/eks/latest/userguide/create-storage-class.html
- OpenTelemetry Collector quick start / telemetrygen usage: https://opentelemetry.io/docs/collector/quick-start/

## Issues Found
- The `health_check` extension default path is `/`, but the Kubernetes probes used `/health`. Added `path: /health` to the collector configuration so the probes match the configured endpoint.
- The main exporter configuration used `retry_on_failure.max_elapsed_time: 300s`, which can drop queued data after the retry window expires. Changed it to `0` for the durable queue examples so queued data is retried until delivered.
- The multiple-storage example enabled retry without overriding the default elapsed retry window. Added `max_elapsed_time: 0` to the trace, metric, and log exporters.
- The Kubernetes StorageClass used the removed in-tree AWS EBS provisioner `kubernetes.io/aws-ebs`. Updated it to the AWS EBS CSI provisioner `ebs.csi.aws.com` and added an explicit filesystem type.
- The sizing flowchart mixed item rate with batch size in a way that made the formula incorrect. Reworded it to calculate storage from telemetry rate and average serialized item size.
- The sizing script described item sizes as "compressed on disk", but the file storage extension does not document compression. Changed the wording to "after serialization on disk".
- The internal telemetry snippet used `service.telemetry.metrics.address`, which current Collector documentation says is ignored as of v0.123.0. Removed the `address` field and kept the supported `level: detailed` setting.
- The test script counted `ls -la` output lines, which can report success for an empty directory. Changed it to count actual files with `find`.
- The performance table gave precise throughput numbers without a version, hardware, or benchmark source. Replaced them with qualitative throughput guidance.

## Review Notes
The examples assume a Collector distribution that includes the `file_storage` and `health_check` extensions, such as the contrib or Kubernetes distributions. Persistent queues improve restart resilience, but data can still be lost if the disk fails, the queue fills, or storage files are corrupted.
