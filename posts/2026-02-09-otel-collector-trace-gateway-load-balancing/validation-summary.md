# Validation Summary: How to Deploy the OpenTelemetry Collector as a Trace Gateway

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- OpenTelemetry Collector Contrib
- OTLP
- OpenTelemetry Collector load-balancing exporter
- OpenTelemetry Collector processors and health check extension
- Kubernetes Horizontal Pod Autoscaler
- Kubernetes PodDisruptionBudget
- Prometheus Operator ServiceMonitor
- Go OpenTelemetry SDK

## Sources Consulted
- OpenTelemetry Collector gateway deployment pattern: https://opentelemetry.io/docs/collector/deploy/gateway/
- OpenTelemetry Collector load-balancing exporter package documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/exporter/loadbalancingexporter
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector health check extension documentation: https://pkg.go.dev/go.opentelemetry.io/collector/extension/healthcheckextension
- OpenTelemetry Kubernetes Collector components documentation: https://opentelemetry.io/docs/platforms/kubernetes/collector/components/
- Kubernetes Service documentation for headless Services: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes HorizontalPodAutoscaler autoscaling/v2 API reference: https://kubernetes.io/docs/reference/kubernetes-api/autoscaling/horizontal-pod-autoscaler-v2/
- Prometheus Operator ServiceMonitor design documentation: https://prometheus-operator.dev/docs/getting-started/design/
- OpenTelemetry Collector Contrib v0.153.0 Docker image validation using `otel/opentelemetry-collector-contrib:0.153.0 validate`

## Issues Found
- The Collector image version was outdated at `0.92.0`. Updated both Collector manifests to `otel/opentelemetry-collector-contrib:0.153.0`, the latest official release available during review.
- The load-balancing exporter DNS resolver used numeric `port` values. The current config schema expects `port` as a string, so the examples now use `"4317"`.
- The gateway liveness and readiness probes targeted port `13133`, but the `health_check` extension was not configured or enabled. Added the extension, enabled it under `service.extensions`, and exposed the container port.
- The gateway config used `service.telemetry.metrics.address`, which is ignored in current Collector versions. Replaced it with the current `service.telemetry.metrics.readers.pull.exporter.prometheus` configuration.
- Queue and retry settings for the Tempo load-balancing exporter were nested under `protocol.otlp`, but the load-balancing exporter documents these settings at the exporter level. Moved `retry_on_failure` and `sending_queue` to the correct level and explicitly enabled the queue.
- The load-balancing exporter examples included `protocol.otlp.endpoint`, but the load-balancing exporter resolver supplies endpoints and its documentation says OTLP exporter options are supported except `endpoint`. Removed those endpoint fields.
- The gateway Service was a normal ClusterIP Service, which would make the DNS resolver see one virtual service IP instead of the individual gateway pod IPs. Changed it to a headless Service with `clusterIP: None` so DNS returns pod endpoints for load balancing.
- The ServiceMonitor selected Services with `app: otel-gateway`, but the Service had no matching label. Added the label to the Service metadata.
- The HPA used the raw cumulative Collector counter `otelcol_receiver_accepted_spans` as a Pods metric. Removed that metric from the manifest because the post did not define a custom metrics adapter exposing a derived per-pod rate.
- Removed an unused Prometheus exporter and container port from the gateway Collector example. The shown ServiceMonitor scrapes internal Collector telemetry from port `8888`, so the exporter was not used by any pipeline.

## Review Notes
Both embedded Collector configurations were extracted from the post and validated successfully with `otel/opentelemetry-collector-contrib:0.153.0 validate`. The Kubernetes manifests were reviewed against official API documentation, but were not applied to a live cluster.
