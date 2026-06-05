# Validation Summary: How to Debug Kubernetes Pod Restarts by Correlating OOM Kill Events

## Status
validated

## Post Type
Tutorial / debugging guide

## Technologies Covered
- OpenTelemetry Python metrics and tracing APIs
- Kubernetes pod/container status
- Kubernetes Python client
- Prometheus alerting / PromQL
- kube-state-metrics
- Python psutil process memory APIs

## Sources Consulted
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/latest/_modules/opentelemetry/metrics/_internal.html
- OpenTelemetry Metrics API specification: https://opentelemetry.io/docs/specs/otel/metrics/api/
- OpenTelemetry semantic conventions for process metrics: https://opentelemetry.io/docs/specs/semconv/system/process-metrics/
- OpenTelemetry Trace API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry Prometheus exporter specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk_exporters/prometheus/
- Kubernetes Pod lifecycle documentation: https://v1-35.docs.kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/
- Kubernetes Events API documentation: https://kubernetes.io/docs/reference/kubernetes-api/events/event-v1/
- Kubernetes kube-state-metrics overview: https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics/
- kube-state-metrics pod metrics reference: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md

## Issues Found
- The memory metric example used `metrics.Observation` indirectly and a non-UCUM unit string (`bytes`). Updated the snippet to import `CallbackOptions` and `Observation` directly and use `By`, which is the OpenTelemetry-recommended UCUM byte unit.
- The example reported RSS and VMS under one `process.memory.usage` metric using a custom `memory.type` attribute. Updated it to publish RSS as `process.memory.usage` and VMS as `process.memory.virtual`, matching the current OpenTelemetry process metric semantic conventions more closely.
- The per-request memory delta instrument was a histogram, but OpenTelemetry histogram values are expected to be non-negative while memory deltas can be negative. Changed it to an UpDownCounter and replaced `record()` with `add()`.
- The trend-analysis docstring referred to histogram data even though the corrected metric is no longer a histogram. Updated the wording to describe backend metric points.
- The Kubernetes example claimed to use the Events API but actually read container `last_state.terminated` from pod status. Updated the section text and function docstring to describe pod status accurately, and used the previously unused `hours` parameter to filter recent OOM records.
- The Prometheus alert used the untranslated OpenTelemetry metric name and did not join application memory metrics to Kubernetes resource limits by shared labels. Updated it to use the Prometheus-translated `process_memory_usage_bytes` name, match by `namespace`, `pod`, and `container`, and include the kube-state-metrics `unit="byte"` selector.

## Review Notes
The examples remain illustrative. In a real deployment, the Prometheus alert depends on the exporter preserving or copying Kubernetes resource attributes such as namespace, pod, and container into metric labels.
