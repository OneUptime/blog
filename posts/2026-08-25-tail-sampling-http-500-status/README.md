# Why an HTTP 500 Trace Can Miss a `status_code: ERROR` Tail-Sampling Policy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Tail Sampling, HTTP, Semantic Conventions, Troubleshooting

Description: Diagnose the difference between HTTP response attributes and OpenTelemetry span status, then retain 5xx traces by fixing instrumentation or adding a precise OTTL policy.

---

The tail-sampling `status_code` policy does not inspect HTTP response attributes. It scans each received span's OpenTelemetry `Status.Code` enum and matches only the configured values `OK`, `ERROR`, or `UNSET`.

A span can therefore contain `http.response.status_code=500` while its OpenTelemetry status remains `UNSET`. The trace looks like a server failure in attributes but does not match `status_codes: [ERROR]`.

## Inspect Both Fields

On a correctly instrumented modern HTTP server failure, the two fields relevant to this sampling decision commonly look like:

```text
span.attributes["http.response.status_code"] = 500
span.status.code = ERROR
```

Older HTTP semantic conventions used deprecated `http.status_code`. Neither attribute automatically changes status inside the Collector.

The OpenTelemetry HTTP semantic conventions say 5xx spans should have error status, while server-side 4xx spans must normally remain unset unless application context indicates an error. “Should” also leaves room for instrumentation limitations. Manual spans, old libraries, middleware ordering, and transformations are common reasons for unset status.

An explicit `OK` status is stronger than `ERROR` in the Trace API ordering and is intended to suppress errors an analysis tool might otherwise infer. Check for code that marks a span OK too early.

## Keep the Normal Status Policy

The standard policy is still useful because it catches non-HTTP errors and errors on any child span:

```yaml
processors:
  tail_sampling:
    sampling_strategy: trace-complete
    decision_wait: 20s
    policies:
      - name: span-status-errors
        type: status_code
        status_code:
          status_codes: [ERROR]
```

The evaluator scans every span in the accumulated trace. The problem is field population, not a root-span-only check.

## Fix Instrumentation First

Upgrade the relevant HTTP instrumentation and verify it follows the current HTTP semantic conventions. For custom spans, set the OpenTelemetry status to error when the operation meets the documented error rules. Fixing the source benefits every backend and processor, not only this tail sampler.

Do not blindly convert every 4xx to error. A server-side 404 can be a normal existence check, while the corresponding client span may classify it differently. Follow the span kind and application context.

## Add an OTTL Safety-Net Policy

If source fixes need time, add a separate positive OTTL tail policy for modern 5xx attributes:

```yaml
processors:
  tail_sampling:
    sampling_strategy: trace-complete
    decision_wait: 20s
    policies:
      - name: span-status-errors
        type: status_code
        status_code:
          status_codes: [ERROR]
      - name: http-5xx-attribute
        type: ottl_condition
        ottl_condition:
          error_mode: ignore
          span:
            - 'span.attributes["http.response.status_code"] != nil and span.attributes["http.response.status_code"] >= 500 and span.attributes["http.response.status_code"] <= 599'
```

The two top-level positive policies act as alternatives: either actual error status or the HTTP attribute retains the trace. The nil guard avoids comparing a missing attribute. Add a separately tested legacy condition only while old instrumentation still emits `http.status_code`, and measure its use so it can be removed.

Another option is a transform processor before tail sampling:

```yaml
processors:
  transform/http-status:
    error_mode: ignore
    trace_statements:
      - 'set(span.status.code, STATUS_CODE_ERROR) where span.attributes["http.response.status_code"] != nil and span.attributes["http.response.status_code"] >= 500 and span.attributes["http.response.status_code"] <= 599'
  tail_sampling:
    policies:
      - name: errors
        type: status_code
        status_code:
          status_codes: [ERROR]
```

This mutates telemetry and can override an intentionally set status, so apply it only when the operator owns the semantic rule. Put `transform/http-status` before `tail_sampling` in the trace pipeline.

## Check Timing and Upstream Sampling

Tail sampling can still fail to retain the intended complete error trace if:

- the SDK head sampler did not record the relevant span;
- spans from the trace were split across tail-sampling replicas;
- the error span arrived after the decision window; or
- a `span-ingest` drop decision finalized the trace before the error arrived.

Use `trace-complete`, trace-ID affinity, and a measured wait when the policy must see errors anywhere in the trace. Inspect `otelcol_processor_tail_sampling_sampling_late_span_age` and decision-cache behavior.

## Reproduce with a Four-Case Fixture

Send four traces:

1. HTTP 500 attribute plus `ERROR` status;
2. HTTP 500 attribute plus `UNSET` status;
3. HTTP 200 attribute plus `ERROR` status from a different failure;
4. HTTP 404 server span with `UNSET` status.

The status policy should select cases 1 and 3. The additional 5xx OTTL policy should also select case 2. Case 4 should follow another policy unless application semantics explicitly classify it as an error.

## Official Documentation

- [Tail-sampling status-code policy](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md)
- [Status-code evaluator scans span status](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/internal/sampling/status_code.go)
- [Tail-sampling OTTL policy implementation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/internal/sampling/ottl.go)
- [OpenTelemetry HTTP span status conventions](https://opentelemetry.io/docs/specs/semconv/http/http-spans/#status)
- [OpenTelemetry Trace API status rules](https://opentelemetry.io/docs/specs/otel/trace/api/#set-status)
- [Collector Contrib transform processor](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md)

## Conclusion

An HTTP status attribute and OpenTelemetry span status are different fields. Fix instrumentation so 5xx operations set `StatusCode=ERROR`, or add a narrow OTTL attribute policy while migrating. Then verify whole-trace arrival and upstream sampling before blaming the status evaluator.
