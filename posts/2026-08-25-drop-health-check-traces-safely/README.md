# Drop Health-Check Traces Without Hiding Child-Span Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Tail Sampling, Kubernetes, Health Check, Distributed Tracing

Description: Drop only successful health-check traces by combining a route match with the absence of any error span, while preserving error traces through a hard-veto-safe policy.

---

Health probes can dominate trace volume, but a blanket route drop can hide a valuable failure: the `/ready` server span may call a database, queue, or dependency whose child span has `StatusCode=ERROR`. Because a top-level `drop` outcome vetoes every positive sampling policy, a naive health-route drop discards that error trace too.

The safe rule is narrower: drop a trace only when it is a health route **and** no span in the accumulated trace has error status.

## Encode the Absence of Errors Inside the Drop

```yaml
processors:
  tail_sampling:
    sampling_strategy: trace-complete
    decision_wait: 20s
    decision_cache:
      sampled_cache_size: 500000
      non_sampled_cache_size: 3000000
    policies:
      - name: drop-successful-probes
        type: drop
        drop:
          drop_sub_policy:
            - name: probe-route
              type: string_attribute
              string_attribute:
                key: http.route
                values: [/live, /ready]
            - name: no-error-in-trace
              type: not
              not:
                not_sub_policy:
                  name: any-error
                  type: status_code
                  status_code:
                    status_codes: [ERROR]
      - name: retain-errors
        type: status_code
        status_code:
          status_codes: [ERROR]
      - name: baseline
        type: probabilistic
        probabilistic:
          sampling_percentage: 5
```

This configuration requires OpenTelemetry Collector Contrib v0.154.0 or later.

The `drop_sub_policy` list is an AND:

- a probe route plus no error produces `Dropped`;
- a probe route plus any error makes the nested `not` return `NotSampled`, so the drop wrapper does not veto;
- the top-level `retain-errors` policy then samples the error trace; and
- a non-probe trace never matches the route condition and continues to other policies.

Exact values do not need regex matching, so the configuration above intentionally leaves regex mode disabled. In current source, regex-enabled values are compiled as provided and evaluated with Go's `MatchString`; the implementation does not add `^` and `$`, despite a nearby source comment that says patterns are automatically anchored. Add explicit anchors when a full-value regex match matters, and replay the exact Collector release before relying on that behavior.

## Match the Semantic Route, Not Raw URLs

Use the stable, low-cardinality `http.route` semantic-convention attribute when instrumentation provides it. Do not enumerate raw IDs in `url.path`, and do not use a full URL or query string as a policy key.

The `string_attribute` policy scans every resource and span attribute in the trace; it does not require the match to be on the root server span. If `/live` or `/ready` can appear on downstream spans of ordinary traces, use a tested OTTL matcher that also identifies the intended entry span, or stamp a dedicated probe attribute at ingress.

If a framework does not populate `http.route`, fix or enrich the instrumentation before relying on this rule. A missing key does not match the ordinary string policy, so the trace is not dropped; that fail-open behavior preserves data but also preserves probe noise.

Some platforms use `/healthz`, `/livez`, or `/readyz`. Add the exact route templates actually emitted, not assumed endpoint paths. If probes are identified by a dedicated boolean attribute set at ingress, a boolean matcher is even less ambiguous.

## Require a Whole-Trace View

Use `trace-complete` for this rule. The logic proves an absence-no error anywhere-which is only meaningful after enough of the trace has arrived. In `span-ingest`, policies see one incoming batch at a time, and pending cleanup does not re-evaluate all accumulated batches. A route batch can arrive before a later error batch.

Choose `decision_wait` from first-to-last arrival measurements. Optionally use a measured `decision_wait_after_root_received` to accelerate decisions after root arrival; it does not extend the original `decision_wait` deadline. A decision cache keeps later batches consistent with the original decision only while the trace ID remains cached, but it cannot revise a premature drop when the late batch contains the error.

Route every trace ID to one tail-sampling instance. If the root and error child reach different replicas, neither replica has the complete evidence required by the rule.

## Verify Error Status Is Actually Set

The `status_code` policy examines the OpenTelemetry span `Status.Code`, not HTTP attributes. `http.response.status_code: 500` is an attribute; it does not automatically become `StatusCode=ERROR` inside the Collector.

Current HTTP semantic conventions say 5xx spans should have error status, but instrumentation defects, old libraries, manual spans, or transformations can leave it unset. Inspect representative probe failures. If necessary, fix status in instrumentation. If status cannot be fixed, use the same tested OTTL failure predicate-including `http.response.status_code >= 500` and any domain-specific failure attributes-in both places: negate it inside `drop-successful-probes` and add a top-level retention policy. A positive policy alone cannot override `Dropped`.

Remember that HTTP server 4xx responses are normally left with unset span status unless application context says they are errors. Decide whether an unhealthy readiness response represented as 4xx should be retained and, if so, include it in both the negated drop predicate and the positive retention policy.

## Test the Full Truth Table

Replay at least these traces:

| Route | Child status | Expected result |
| --- | --- | --- |
| `/live` | all unset/OK | Dropped |
| `/ready` | one ERROR | Sampled |
| ordinary route | one ERROR | Sampled |
| ordinary route | no error | Baseline decision |
| missing `http.route` | no error | Baseline decision |

Send the child error in a later OTLP request and just before the decision boundary. Then send it just after the boundary to demonstrate the residual late-span risk.

Monitor final `otelcol_processor_tail_sampling_global_count_traces_sampled`, the drop policy's `otelcol_processor_tail_sampling_count_traces_sampled{decision="dropped"}`, backend examples, and both late-span paths. `otelcol_processor_tail_sampling_sampling_late_span_age` covers late spans handled while the final decision remains live; cache-served spans increment `otelcol_processor_tail_sampling_early_releases_from_cache_decision` without an age observation. Per-policy votes alone do not prove the exported result.

## Official Documentation

- [Tail-sampling practical policy example and drop semantics](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md#a-practical-example)
- [`drop`, `not`, string, and status policy configuration](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/config.go)
- [Drop evaluator AND behavior](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/internal/sampling/drop.go)
- [Status policy scans every received span](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/internal/sampling/status_code.go)
- [OpenTelemetry HTTP span status conventions](https://opentelemetry.io/docs/specs/semconv/http/http-spans/#status)

## Conclusion

Drop a health trace only when the route matches and a whole-trace error check does not. Keep the error policy separate, use `trace-complete`, wait for child spans, and verify that instrumentation sets span status correctly. This removes routine probes without turning a hard drop veto into an error blind spot.
