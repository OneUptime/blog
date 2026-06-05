# Validation Summary: How to Track Feature Flag Impact on Performance with OpenTelemetry

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- OpenTelemetry Python tracing and metrics APIs
- OpenTelemetry feature flag semantic conventions
- OpenTelemetry Collector attributes processor
- LaunchDarkly Python SDK
- Prometheus / PromQL histogram and counter queries
- Feature flag rollout observability

## Sources Consulted
- OpenTelemetry Python manual instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python metrics API reference: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- OpenTelemetry feature flag semantic conventions: https://opentelemetry.io/docs/specs/semconv/feature-flags/feature-flags-logs/
- OpenTelemetry Prometheus compatibility documentation: https://opentelemetry.io/docs/compatibility/prometheus/client-libraries/
- OpenTelemetry Prometheus exporter specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk_exporters/prometheus/
- OpenTelemetry Collector attributes processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/attributesprocessor
- LaunchDarkly flag evaluation documentation: https://launchdarkly.com/docs/sdk/features/evaluating
- Prometheus histogram documentation: https://prometheus.io/docs/practices/histograms/

## Issues Found
- The metrics decorator read `span.attributes` from the current OpenTelemetry span. The public Python tracing API documents setting attributes with `set_attribute`, but active spans are not a portable place to read back user attributes. I changed the example to keep evaluated flag states in a request-local `ContextVar` and read metric attributes from that context.
- The rollout percentage dashboard queried `feature_flag_evaluations`, but the original code never recorded that counter. I moved the feature flag evaluation counter into the flag wrapper and record it on every evaluation.
- The duration histogram used `unit="ms"` and recorded milliseconds, but the PromQL queried a metric name without the unit suffix. I changed the histogram to record seconds with `unit="s"` and updated PromQL to use the default OpenTelemetry Prometheus translated name `http_server_request_duration_by_flag_seconds_bucket`.
- The PromQL counter names omitted the default Prometheus `_total` suffix for OpenTelemetry counters. I updated the error and evaluation queries to use `http_server_request_errors_by_flag_total` and `feature_flag_evaluations_total`.
- The original metric label names used `feature_flag_value`. I updated the metric attributes and PromQL labels to use the current feature flag semantic-convention attribute `feature_flag.result.variant`, which translates to `feature_flag_result_variant` in Prometheus.
- The request handler example did not reset request-local flag state. I added `ContextVar` reset handling so one request's flag state does not leak into another request context.
- The best-practices section said not to record every flag evaluation as an event while the example recorded a feature flag event. I adjusted the wording to warn against duplicate repeated lookup events within the same request instead of contradicting the example.
- The Collector normalization snippet mapped `ff.value` to `feature_flag.value`. I changed it to `feature_flag.result.variant` to match the current OpenTelemetry feature flag semantic convention.

## Review Notes
The post is now technically consistent as an illustrative guide. The feature flag semantic conventions are currently marked development/release-candidate rather than fully stable, so teams should confirm their backend's support and label translation behavior before relying on exact query names in production.
