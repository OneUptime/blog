# Validation Summary: How to Use OpenTelemetry Queue Depth Metrics to Auto-Scale Message Consumers

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry Python metrics API and SDK
- OpenTelemetry OTLP gRPC metric exporter
- AWS SQS queue attributes
- OpenTelemetry Collector Prometheus exporter
- Prometheus and PromQL
- Prometheus Adapter for Kubernetes Metrics APIs
- Kubernetes HorizontalPodAutoscaler autoscaling/v2

## Sources Consulted
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/latest/api/metrics.html
- OpenTelemetry metric semantic convention guidance for units: https://opentelemetry.io/docs/specs/semconv/general/metrics/
- OpenTelemetry Collector Prometheus exporter documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/prometheusexporter
- OpenTelemetry Prometheus/OpenMetrics compatibility specification: https://opentelemetry.io/docs/specs/otel/compatibility/prometheus_and_openmetrics/
- AWS SQS GetQueueAttributes API reference: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/API_GetQueueAttributes.html
- Prometheus Adapter documentation: https://github.com/kubernetes-sigs/prometheus-adapter/blob/master/docs/config.md
- Kubernetes HorizontalPodAutoscaler autoscaling/v2 API reference: https://kubernetes.io/docs/reference/kubernetes-api/autoscaling/horizontal-pod-autoscaler-v2/
- Kubernetes Horizontal Pod Autoscaling concepts documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/

## Issues Found
- The Prometheus Adapter snippet used `rules`, which exposes custom metrics, while the HPA used `type: External`. Changed the adapter configuration to `externalRules` so the metric is exposed through the External Metrics API.
- The adapter query hard-coded `queue="order-processing"` and did not use the Prometheus Adapter query template placeholders. Changed it to use `<<.Series>>` and `<<.LabelMatchers>>`, with `by (queue)`, so the HPA metric selector can be applied correctly.
- The adapter discovery query did not require the `queue` label even though the HPA selects on it. Updated `seriesQuery` to require `queue!=""`.
- The OpenTelemetry Python observable gauge example used `metrics.Observation` without importing the current documented callback types. Updated the snippet to import `CallbackOptions` and `Observation` and annotate the callback return type.
- The counter used `unit="messages"`, which does not follow OpenTelemetry's UCUM annotation guidance for counted items. Changed it to `unit="{message}"`, which keeps the Prometheus counter query aligned with the metric name used later in the post.
- The stabilization-window explanation said the scaler waits before acting on a new metric reading. Updated it to match Kubernetes behavior: HPA considers past scaling recommendations during the stabilization window.

## Review Notes
The SQS queue-depth values are approximate and eventually consistent, which is correctly implied by using the SQS approximate attributes but may be worth calling out more explicitly in a future revision. The Collector Prometheus exporter's metric-name translation can vary if `translation_strategy` is changed; the examples assume the default Prometheus-compatible underscore escaping and suffix behavior.
