# Validation Summary: How to Set Up Adaptive Sampling That Adjusts to Traffic Volume

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry Python SDK
- OpenTelemetry tracing sampling
- OpenTelemetry metrics API
- OpenTelemetry Collector
- OpenTelemetry Collector probabilistic sampler processor
- Kubernetes Deployments and ConfigMaps
- Python
- YAML

## Sources Consulted
- OpenTelemetry Python sampling API: https://opentelemetry-python.readthedocs.io/en/latest/sdk/trace.sampling.html
- OpenTelemetry Python metrics API: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- OpenTelemetry Collector configuration docs: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector processor list: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector probabilistic sampler processor docs: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/probabilisticsamplerprocessor/README.md
- OpenTelemetry trace SDK specification: https://opentelemetry.io/docs/specs/otel/trace/sdk/
- Kubernetes Deployment docs: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes ConfigMap docs: https://kubernetes.io/docs/concepts/configuration/configmap/
- Kubernetes ConfigMap update tutorial: https://kubernetes.io/docs/tutorials/configuration/updating-configuration-via-a-configmap/
- Kubernetes shared process namespace docs: https://kubernetes.io/docs/tasks/configure-pod-container/share-process-namespace/

## Issues Found
- The custom Python sampler examples omitted the current `trace_state` argument from `Sampler.should_sample`. Added `trace_state=None` to both sampler implementations and passed it through to `SamplingResult`.
- The Collector configuration used the older `${SAMPLING_RATE}` environment expansion form. Updated it to the current `${env:SAMPLING_RATE:-10}` form documented by the Collector.
- The external controller wrote an env file and expected a running Collector process to see the changed environment on reload. Reworked the example to rewrite the Collector config file directly and signal the Collector process.
- The controller looked only for `otelcol_receiver_accepted_spans`; Prometheus output can expose Collector counters with a `_total` suffix. Updated the parser to accept both metric names.
- The Kubernetes Deployment example was missing the required `spec.selector` and matching pod template labels for `apps/v1`. Added both.
- The Kubernetes example relied on a ConfigMap-backed environment variable changing dynamically. Reworked the example to use a ConfigMap-projected config file and added `shareProcessNamespace: true` so the sidecar pattern can signal the Collector after the projected file updates.
- The metrics example created the same observable gauge twice, once without a callback and once with a callback, and also defined an unused counter. Removed the duplicate gauge and unused counter from the snippet.

## Review Notes
- The in-process adaptive sampler is a simplified educational example. Production implementations should consider using trace-ID-based deterministic sampling to keep sampling decisions stable across retries and replicated entry points.
- The external controller still uses a simple line rewrite for readability; a production controller should update YAML with a structured parser or generate config from a template.
- The Kubernetes sidecar pattern also requires RBAC permissions for patching the ConfigMap, which is outside the scope of the snippet.
