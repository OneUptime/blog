# Validation Summary: How to Create Tail-Based Sampling

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- OpenTelemetry Collector (contrib distribution)
- `tail_sampling` processor (tailsamplingprocessor)
- OTLP receiver/exporter (gRPC + HTTP)
- `memory_limiter`, `batch`, `resource` processors
- `loadbalancing` exporter
- Kubernetes deployment manifests
- Prometheus metrics / alerting (collector self-telemetry)
- HAProxy (trace-ID-based load balancing example)

## Sources Consulted
- OpenTelemetry Collector Contrib — `tailsamplingprocessor` README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/tailsamplingprocessor
- OpenTelemetry Collector Contrib — `tailsamplingprocessor/documentation.md` (internal metrics list)
- OpenTelemetry Collector Contrib — `loadbalancingexporter` documentation
- OpenTelemetry HTTP semantic conventions (stable, v1.23+): `http.response.status_code` replaces deprecated `http.status_code`
- OpenTelemetry Collector Contrib — `ottlfuncs` and OTTL contexts (span / spanevent)

## Issues Found

1. **Incorrect comment on `expected_new_traces_per_sec`** (Section 4) — The comment described it as "How often to check for traces that exceeded decision_wait", but per the official processor README it is a hint used to size internal data structures, not a polling interval. Updated the comment to reflect its actual purpose.

2. **Latency policy described as evaluating "root span duration"** (Section 5) — The official documentation explicitly states the latency policy uses the overall trace duration (earliest start time to latest end time across all spans), not the root span. Updated the explanation accordingly.

3. **Broken "Span Event Based Sampling" example** (Section 6) — The example used `span_count` with `min_spans: 1` / `max_spans: 0` to "keep traces where any span has an exception event". `span_count` counts spans (not events), `max_spans: 0` is not a documented sentinel for "unlimited" in the official README, and the example does not actually match exception events at all. Replaced with the correct `ottl_condition` policy using the `spanevent` context (`name == "exception"`), which is the documented way to match against span events in the tail sampling processor.

4. **Claim that processor supports an `or` policy type** (Section 7) — There is no `or` policy in the tail sampling processor. Supported logical types are `and`, `not`, `drop`, and `composite`. OR-style behavior is implicit (multiple top-level policies are OR'd; any sample vote keeps the trace, while a `drop` vote overrides). Updated the wording to reflect the actual supported policy types and how OR behavior is achieved.

5. **Incorrect collector metric names** (Sections 9 and 10) — Several metric names did not match the names emitted by the processor (per `documentation.md`):
   - `otelcol_processor_tail_sampling_count_traces_on_memory` → corrected to `otelcol_processor_tail_sampling_sampling_traces_on_memory` (in both the monitoring query and the Prometheus alert rule).
   - `otelcol_processor_tail_sampling_sampling_decision_latency` → corrected to `otelcol_processor_tail_sampling_sampling_decision_timer_latency`.
   - `otelcol_processor_tail_sampling_count_spans_dropped` does not exist. Replaced the alert with one based on `otelcol_processor_tail_sampling_sampling_trace_dropped_too_early`, which is a real metric indicating traces evicted before a decision could be made.

## Review Notes

- **Deprecated semantic convention**: The post uses `http.status_code` (Section 6) for HTTP status-code-based sampling. The stable OTel HTTP semantic convention has moved to `http.response.status_code` (stable since semconv v1.23+). The tail sampling processor itself just matches whatever attribute key you provide, so the example still works if your instrumentation emits the legacy key, but new instrumentations should use `http.response.status_code`. Left unchanged to avoid contradicting still-deployed instrumentation; readers should pick the key that matches their SDK/conventions.
- **`exception.type` as a `string_attribute`** (Section 6) — The OTel SDK `recordException` API records exceptions as **span events**, with `exception.type` as an event attribute (not a span attribute). The `string_attribute` policy matches span attributes, not event attributes, so this example only works if the user has manually added `exception.type` as a span attribute. For matching events recorded by `recordException`, the `ottl_condition` example added in the Span Event section is the correct approach. The existing `string_attribute` example was left as-is because it is technically valid for the case where the attribute is set on the span itself.
- **`baseline` final policy in some examples**: When a probabilistic `baseline` policy is added as the last entry, all top-level policies are evaluated independently (OR'd), so the probabilistic policy effectively adds extra traces on top of those already kept by earlier policies — it is not "10% of what's left" as it might intuitively read. The post mostly frames this correctly; this is a worth-knowing semantic nuance for readers.
- **`policy_order` in composite policy**: The order listed in `policy_order` determines priority for rate allocation when the total budget is reached, which the post explains well.
- **`max_total_spans_per_second` cap**: The composite policy's overall cap is documented as a spans-per-second budget, which the post accurately reflects.
- **OneUptime OTLP endpoint format and `x-oneuptime-token` header** were not independently validated against OneUptime documentation but follow the same pattern used in other posts in this blog repository, so they are presumed correct.
