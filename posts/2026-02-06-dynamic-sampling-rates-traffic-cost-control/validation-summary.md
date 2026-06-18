# Validation Summary: How to Implement Dynamic Sampling Rates That Scale with Traffic to Control Costs

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector probabilistic sampling processor
- OpenTelemetry Collector tail sampling processor
- Prometheus HTTP API and PromQL
- Python
- Kubernetes Deployments, ConfigMaps, emptyDir volumes, and shared process namespaces

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector probabilistic sampling processor documentation and schema: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/probabilisticsamplerprocessor
- OpenTelemetry Collector tail sampling processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- Prometheus HTTP API documentation: https://prometheus.io/docs/prometheus/latest/querying/api/
- Kubernetes volumes documentation: https://kubernetes.io/docs/concepts/storage/volumes/
- Kubernetes shared process namespace documentation: https://kubernetes.io/docs/tasks/configure-pod-container/share-process-namespace/

## Issues Found
- The controller used `otelcol_receiver_accepted_spans` while describing the target as traces per second. That Collector metric counts accepted spans, so the post and code now target spans per second.
- The Python example called `/api/v1/query` on `http://localhost:8888`, which is the Collector's typical internal metrics scrape endpoint, not a Prometheus query API. The example now uses a Prometheus server URL and explains that Prometheus must scrape the Collector metrics.
- The Python example exposed Kubernetes environment variables that the script did not read. The constants now read from environment variables.
- The tail sampling composite example used invalid `composite_sub_policy` entries and `percent_allocation` fields. The snippet now uses valid top-level `status_code`, `latency`, and `rate_limiting` policies without the invalid composite block.
- The tail sampling explanation said normal traces were rate-limited to a fixed trace volume, but the policy field is `spans_per_second`. The wording now says predictable span volume.
- The Kubernetes sidecar example mounted a ConfigMap as the writable config volume. Kubernetes ConfigMap volumes are read-only, so the example now copies the ConfigMap into an `emptyDir` volume before the collector and sidecar start.
- The Kubernetes sidecar example did not enable process namespace sharing, so the sidecar could not reliably signal the collector process. The pod spec now sets `shareProcessNamespace: true`.
- The Kubernetes Deployment example omitted the required `spec.selector` and matching pod template labels for `apps/v1`. Those fields are now included.

## Review Notes
The examples still assume a Prometheus server is scraping the Collector's internal telemetry and that the Collector process name matches `otelcol-contrib`. In production, users should validate the final Collector config with their exact Collector distribution and version.
