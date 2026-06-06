# Validation Summary: How to Handle Collector Failover and Recovery in Production

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib
- OpenTelemetry Collector file_storage extension
- OpenTelemetry Collector health_check extension
- OpenTelemetry Collector failover connector
- Kubernetes StatefulSet, DaemonSet, PersistentVolumeClaim, probes, and downward API
- Prometheus alerting
- kubectl

## Sources Consulted
- OpenTelemetry Collector file_storage extension README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/extension/storage/filestorage/README.md
- OpenTelemetry Collector health_check extension README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/extension/healthcheckextension/README.md
- OpenTelemetry Collector failover connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/failoverconnector/README.md
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector Contrib 0.96.0 and 0.153.0 container images, using `otelcol-contrib --help`, `components`, `--version`, and `validate`
- Kubernetes documentation for exposing Pod information with environment variables: https://kubernetes.io/docs/tasks/inject-data-application/environment-variable-expose-pod-information/
- Kubernetes documentation for DaemonSets: https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/

## Issues Found
1. The `file_storage` example used `max_file_size_mib`, which is not a valid file_storage extension option. Removed it and replaced the disk-space discussion with supported compaction settings.

2. The StatefulSet probes referenced the health check endpoint, but the first Collector config did not enable the `health_check` extension. Added `health_check` to the config and service extensions.

3. The `file_storage` directories must exist in Collector 0.96.0. Added an init container that creates the persistent queue and compaction directories on the PVC before the collector starts.

4. The DaemonSet section said applications could connect to `localhost:4317` through `hostPort`. In Kubernetes, `localhost` inside an application pod is the application container's network namespace, not the DaemonSet pod. Updated the text and example to use `status.hostIP` via the downward API.

5. The failover connector example used exporter names in `priority_levels`, but the connector expects pipeline names. Updated the example to use `traces/primary`, `traces/secondary`, and `traces/emergency`.

6. The failover connector example used deprecated `retry_gap` and `max_retries` fields. Removed those fields and clarified that the connector is alpha and available in current Collector Contrib releases, not the pinned 0.96.0 image.

7. The health monitoring snippet used `service.telemetry.metrics.address`, which is ignored in Collector v0.123.0 and later, and used `check_collector_pipeline`, which upstream warns is not working as expected. Replaced it with the current `readers.pull.exporter.prometheus` configuration and kept the metric names stable with `without_type_suffix` and `without_units`.

8. The failover test commands assumed `iptables`, `curl`, and `ls` were available inside the Collector container. The official Collector image does not include a shell. Replaced those commands with Kubernetes-side scaling, `kubectl port-forward`, local `curl`, and log checks.

## Review Notes
- The persistent queue and multi-exporter configurations were validated with `otel/opentelemetry-collector-contrib:0.96.0`.
- The failover connector and current internal telemetry snippets were validated with `otel/opentelemetry-collector-contrib:0.153.0`.
- The alert metric names are valid OTLP/internal metric names. The post's Prometheus reader configuration disables Prometheus type and unit suffixes so the alert expressions match the exposed names.
