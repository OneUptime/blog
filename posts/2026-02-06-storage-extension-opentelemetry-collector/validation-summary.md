# Validation Summary: How to Configure the Storage Extension in the OpenTelemetry Collector

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib file_storage extension
- Exporter sending queues and retry_on_failure
- Routing connector
- Collector internal telemetry metrics
- Kubernetes StatefulSet and persistent storage
- kubectl

## Sources Consulted
- OpenTelemetry Collector Contrib File Storage Extension README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/extension/storage/filestorage
- OpenTelemetry Collector exporterhelper README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/exporterhelper/README.md
- OpenTelemetry Collector Contrib Routing Connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/connector/routingconnector
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector Contrib v0.153.0 release page: https://github.com/open-telemetry/opentelemetry-collector-contrib/releases/tag/v0.153.0
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/

## Issues Found
- Corrected file_storage compaction configuration. The post used a non-existent `compaction.enabled` field and described `rebound_needed_threshold_mib` / `rebound_trigger_threshold_mib` incorrectly. Updated examples to use `compaction.on_rebound`, valid threshold ordering, and accurate `max_transaction_size` wording.
- Corrected persistent queue explanations. The storage extension is a storage backend used by exporter persistent queues; it is not itself the exporter queue implementation. Updated the text and diagrams to reflect that queued batches are backed by storage once configured.
- Removed invalid `max_size_mib` examples and claims. Current file_storage does not expose a byte-size quota field. Updated disk-space guidance to use `sending_queue.queue_size` plus dedicated volumes or filesystem/container quotas.
- Fixed retry_on_failure placement in one YAML snippet. It must be an exporter-level setting, not nested under `sending_queue`.
- Replaced the older routing processor example with the current routing connector configuration, using `connectors`, `default_pipelines`, OTTL conditions, and downstream pipelines.
- Updated internal telemetry configuration. The `service.telemetry.metrics.address` setting is ignored in current Collector versions, so the example now uses a Prometheus pull reader with host and port.
- Fixed Kubernetes storage usage. A single `ReadWriteOnce` PVC cannot be shared safely by three StatefulSet replicas, so the example now uses `volumeClaimTemplates` and pins the Collector image to `0.153.0` instead of `latest`.
- Fixed the migration script order. The original script scaled the old StatefulSet to zero before trying to `kubectl exec` into its pod. The updated version keeps one old pod available for copying, then scales it down.

## Review Notes
The post is now technically valid for current OpenTelemetry Collector Contrib behavior as of 2026-06-05. Future improvements could include testing full collector configs with the exact collector binary used in production and adding operational caveats for copying live file_storage data during migrations.
