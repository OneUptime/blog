# Validation Summary: How to Configure Sending Queues and Retry Logic in the Collector

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector exporter sending queues
- OpenTelemetry Collector retry_on_failure configuration
- OpenTelemetry Collector file_storage extension
- OpenTelemetry Collector internal telemetry metrics
- Prometheus and Prometheus Remote Write
- Kubernetes Deployments, StatefulSets, and PersistentVolumeClaims

## Sources Consulted
- OpenTelemetry Collector exporterhelper README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/exporterhelper/README.md
- OpenTelemetry Collector OTLP exporter README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlpexporter/README.md
- OpenTelemetry Collector OTLP receiver README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/receiver/otlpreceiver/README.md
- OpenTelemetry Collector gRPC configuration README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/config/configgrpc/README.md
- OpenTelemetry Collector file_storage extension README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/extension/storage/filestorage/README.md
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector Prometheus Remote Write exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/prometheusremotewriteexporter/README.md
- OpenTelemetry Collector health_check extension README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/extension/healthcheckextension/README.md
- Kubernetes PersistentVolumeClaim documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/

## Issues Found
- The first sending queue YAML block defined `exporters` twice, which would cause the first exporter configuration containing `sending_queue` to be overwritten by the later duplicate key. I consolidated it into one valid Collector configuration and added the missing OTLP receiver.
- Several full Collector configuration snippets referenced `receivers: [otlp]` or `processors: [batch]` without defining those components. I added minimal `receivers` and `processors` definitions where the snippets were intended to be runnable.
- The storage size example described average batch size as "after compression." OTLP exporter compression applies to outgoing export requests, not as a reliable multiplier for persistent queue storage capacity. I changed this to "average serialized batch size."
- The monitoring examples used `service.telemetry.metrics.address`, which is ignored as of Collector v0.123.0. I replaced it with the current `service.telemetry.metrics.readers` Prometheus pull exporter configuration.
- The monitoring exporter used the deprecated `prometheusremotewrite` component alias. I changed it to `prometheus_remote_write`.
- The Kubernetes Deployment example used three replicas sharing one ReadWriteOnce PVC. That is not a safe or generally valid persistent queue pattern for multiple Collector pods. I changed the Deployment example to a single replica and left the StatefulSet section as the multi-replica per-pod volume pattern.
- The compression section claimed compression lets queues fit more data and increases queue capacity. I corrected the section to describe compression as reducing outgoing network payload size instead.
- The production health_check example used `check_collector_pipeline`, which the official health_check extension README says is not working as expected and recommends not using. I removed that subsection.

## Review Notes
The remaining queue and retry field names are current for Collector exporterhelper configuration. The post should continue to avoid pinning examples to `latest` container images in production guidance in the future, but that was not changed because the article does not claim a specific production image version.
