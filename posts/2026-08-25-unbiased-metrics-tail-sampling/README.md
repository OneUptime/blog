# Preserve Unbiased Request Metrics with Selective Tail Sampling

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Tail Sampling, RED Metrics, Span Metrics, Probability Sampling

Description: Preserve representative request counts with pre-sampling metrics or probability-aware adjusted counts, and avoid invalid global scaling after selective tail sampling.

---

Suppose tail sampling keeps every trace containing an error, every trace whose overall duration exceeds two seconds, and 5% of all other traces. Counting the retained server spans does not measure request rate. Within this tail-sampling stage, server spans in the first two trace classes have inclusion probability 1, while server spans in the remaining class have inclusion probability 0.05.

Multiplying the entire sampled count by 20 overestimates the always-kept classes. Applying no correction undercounts routine traffic. The correct design either measures before selection or carries a valid inclusion probability for each retained span.

## Prefer Metrics Before Selective Sampling

The most robust options are:

- native OpenTelemetry HTTP/RPC request metrics emitted by the application; or
- the `span_metrics` connector fed by a full-span branch before tail sampling.

```yaml
service:
  pipelines:
    traces/red-source:
      receivers: [otlp]
      exporters: [span_metrics/pre-tail]
    traces/sampled:
      receivers: [otlp]
      processors: [tail_sampling, batch]
      exporters: [otlp_grpc/traces, span_metrics/post-tail]
    metrics/red:
      receivers: [span_metrics/pre-tail]
      exporters: [otlp_grpc/metrics]
    metrics/red-adjusted:
      receivers: [span_metrics/post-tail]
      exporters: [otlp_grpc/metrics]
```

The `red-source` / `red` branch feeds every eligible span that reached the receiver to its connector, independent of which traces the other pipeline retains. The current connector contributes 1 for a span without a valid sampling threshold and automatically adjusts a span with a valid upstream `th`. SDK head sampling or transport loss without valid probability information remains unrecoverable here, so use application metrics before those stages when they matter to the service-level rate. The separate post-tail branch is explained below.

Use server spans for inbound request rate and keep `span.kind` in the query. Summing both client and server calls can count the same distributed interaction more than once.

## Why One Global Sample Rate Is Wrong

For an observed item with inclusion probability `p`, an unbiased stochastic count contribution is approximately:

```text
adjusted count = 1 / p
```

A server span from a routine trace retained at 5% contributes 20. A span from an always-kept trace contributes 1. The estimator works only when the probability attached to that item is truthful. A hard-dropped class has probability zero and cannot be reconstructed from retained data.

Policy vote ratios from the Collector are aggregate diagnostics, not per-trace inclusion probabilities. Do not use the fraction of final traces kept as a universal multiplier for a heterogeneous rule set.

## Use TraceState Adjustment Only with End-to-End Probability Semantics

Current Collector Contrib has an alpha tail-sampling feature gate:

```sh
otelcol-contrib \
  --feature-gates=+processor.tailsamplingprocessor.usetracestate \
  --config=/etc/otelcol/config.yaml
```

When enabled, the probabilistic tail policy reads OpenTelemetry `rv` and `th` information from the W3C `tracestate` `ot` section when present, with a documented fallback to its legacy trace-ID hash. When a trace is selected, the processor writes the smallest effective threshold among policies that voted to sample onto the spans present at that decision. Filter-style policies such as status or latency imply always-sample probability for their matching class. Late spans forwarded under an already-made keep decision bypass this rewrite.

To produce adjusted post-tail metrics, keep that connector as a separate instance wired from the output of `tail_sampling`, as in the service pipelines above; otherwise it cannot see the rewritten threshold. Distinct namespaces keep the pre-tail and post-tail metric streams separate when both run during validation.

```yaml
processors:
  tail_sampling:
    policies:
      - name: errors
        type: status_code
        status_code:
          status_codes: [ERROR]
      - name: slow
        type: latency
        latency:
          threshold_ms: 2000
      - name: baseline-ten-percent
        type: probabilistic
        probabilistic:
          sampling_percentage: 10
  batch:

connectors:
  span_metrics/pre-tail:
    namespace: red.pre_tail
  span_metrics/post-tail:
    namespace: red.post_tail
    enable_metrics_sampling_method: true
```

At this tail stage, a matching error or latency filter contributes `th=0`. If no stricter incoming `th` exists, spans from such a trace therefore have adjusted count 1. A routine trace retained only by the 10% policy carries that policy's threshold, subject to any stricter incoming threshold. The current span metrics connector calculates stochastic adjusted counts from valid trace-state sampling information for call sums and histogram observations.

`enable_metrics_sampling_method` does not turn adjustment on; current connector code performs adjusted-count calculation regardless. The option adds `sampling.method=extrapolated` or `sampling.method=counted` as a metric dimension. Queries must sum both series when they represent one request total, but `counted` only means that no usable `th` was present; it does not prove that an earlier sampler kept everything.

## Know When Adjustment Is Invalid

Use pre-tail metrics instead when any of these apply:

- an SDK or gateway dropped traces without propagating valid probability information;
- a custom or traffic-dependent rule does not report a valid per-trace inclusion probability;
- a `drop` policy removes requests that should still count toward the metric;
- different samplers overwrite or strip `tracestate` incorrectly;
- malformed trace state is common;
- server spans used for request counts can arrive after the sampling decision and be forwarded without the tail stage's rewritten `th`; or
- an alpha feature is unacceptable for the SLO data path.

The processor exposes `otelcol_processor_tail_sampling_count_spans_with_unparseable_tracestate`. Its scope is narrower than an input-validation counter: it increments once for each span skipped because its `tracestate` cannot be parsed **while the processor is rewriting the effective `th` on a sampled trace**. It does not count malformed state on traces that were not selected or on late spans that bypass the rewrite, and it is not a trace count. Alert on increases, but do not treat a zero value as proof that every incoming `tracestate` was valid.

Existing stricter thresholds are not weakened by the tail processor. Review the full sampling chain, not only the final Collector.

## Validate the Estimator

Generate a known workload, for example 100,000 server requests with 1,000 errors and a controlled latency distribution. Compare:

1. source request count;
2. pre-tail span-metrics count;
3. unadjusted retained-span count;
4. trace-state-adjusted post-tail count; and
5. results split by error and latency classes.

Repeat over enough independent trace IDs for stochastic error to narrow. Verify counts after every rollout because changing policy order, percentages, feature gates, or upstream SDK samplers can change the estimator.

## Official Documentation

- [Tail-sampling TraceState handling](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md#tracestate-handling)
- [Tail-sampling feature-gated telemetry](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/documentation.md)
- [Span metrics connector sampling support](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/spanmetricsconnector/README.md)
- [Span metrics stochastic adjusted-count implementation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/spanmetricsconnector/internal/metrics/adjusted_count.go)
- [OpenTelemetry TraceState probability-sampling specification](https://opentelemetry.io/docs/specs/otel/trace/tracestate-probability-sampling/)

## Conclusion

For stable RED metrics, count requests before selective tail sampling. Probability-aware post-tail metrics can be unbiased only when each retained span carries valid end-to-end inclusion information; the current tail support is alpha. Never apply one inverse sample rate to a population where errors, slow traces, and routine requests have different probabilities.
