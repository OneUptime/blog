# Validation Summary: How to Scale OpenTelemetry Collector for High-Throughput Environments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib distribution
- OTLP receiver and exporters
- Load balancing exporter
- Memory limiter, batch, filter, tail sampling, transform, attributes, and resource processors
- Prometheus remote write exporter
- OpenTelemetry Collector file storage extension
- Grafana Loki OTLP ingestion
- Kubernetes Deployments, StatefulSets, Services, HPAs, and PodDisruptionBudgets
- Prometheus alerting rules and PromQL

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector gateway deployment pattern documentation: https://opentelemetry.io/docs/collector/deploy/gateway/
- OpenTelemetry Collector memory limiter processor documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/memorylimiterprocessor/README.md
- OpenTelemetry Collector batch processor documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/batchprocessor/README.md
- OpenTelemetry Collector exporter helper queue and retry documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/exporterhelper/README.md
- OpenTelemetry Collector Contrib load balancing exporter documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/loadbalancingexporter/README.md
- OpenTelemetry Collector Contrib Prometheus remote write exporter documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/prometheusremotewriteexporter/README.md
- OpenTelemetry Collector Contrib tail sampling processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- OpenTelemetry Collector Contrib transform processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry Collector Contrib health check extension documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/extension/healthcheckextension/README.md
- Grafana Loki OpenTelemetry ingestion documentation: https://grafana.com/docs/loki/latest/send-data/otel/
- Kubernetes HPA documentation: https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/
- Kubernetes PodDisruptionBudget documentation: https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Local validation with `otel/opentelemetry-collector-contrib:0.154.0 validate`

## Issues Found
- The Collector examples used the deprecated `loadbalancing` exporter name and unquoted DNS resolver ports. Updated them to `load_balancing` and quoted the DNS resolver `port` values so the config validates with current Collector Contrib.
- The gateway config routed traces, metrics, and logs through one traceID-based load balancing exporter. Current load balancing exporter docs mark `traceID` as invalid for metrics, so the config now uses separate trace, metrics, and logs exporters.
- The Collector internal telemetry examples used `service.telemetry.metrics.address`, which is ignored in current Collector versions. Replaced it with the documented `service.telemetry.metrics.readers` Prometheus pull exporter syntax.
- The processing config used the deprecated `prometheusremotewrite` alias and invalid `sending_queue` settings for Prometheus remote write. Updated it to `prometheus_remote_write` and `remote_write_queue`.
- The logs exporter sent data to Loki with a generic OTLP gRPC exporter. Grafana Loki documents OTLP log ingestion through the OTLP HTTP exporter, so the config now uses `otlphttp/loki` with a Loki `/otlp` endpoint.
- The `file_storage` extension assumed the storage directory already existed. Added `create_directory: true` so the current Collector accepts the configuration.
- The memory limiter comments and values treated `spike_limit_percentage` as an acceptance threshold. Updated them to reflect that the soft limit is the hard limit minus the spike limit, and corrected the example fixed `spike_limit_mib`.
- The Kubernetes examples pinned the Collector Contrib image to `0.92.0` and set `GOMEMLIMIT` near 90% of the memory limit. Updated the image to `0.154.0` and set `GOMEMLIMIT` to 80% of the container memory limit, matching current memory limiter guidance.
- The Grafana queries referenced undocumented `otelcol_exporter_send_latency_bucket` and `otelcol_processor_latency_bucket` metrics. Replaced them with documented batch processor and exporter in-flight request metrics.
- A transform comment said the example hashed sensitive data, but the OTTL statement redacts it. Updated the comment.

## Review Notes
- The two complete Collector configurations in the post were validated successfully with `otel/opentelemetry-collector-contrib:0.154.0 validate` after the fixes.
- The Prometheus remote write example keeps multiple consumers for throughput, but the post now notes that multiple consumers should only be used when the backend accepts out-of-order samples.
- The Kubernetes YAML examples are structurally consistent with the documented Kubernetes APIs, but runtime behavior still depends on cluster setup, storage class availability, Prometheus Adapter or KEDA for custom HPA metrics, backend endpoints, and RBAC.
