# How to Preserve Unbiased Request-Rate Metrics When Tail Sampling Favors Errors and Slow Traces

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Tail Sampling, RED Metrics, Span Metrics, Probability Sampling

Description: Preserve representative request counts with pre-sampling metrics or probability-aware adjusted counts, and avoid invalid global scaling after selective tail sampling.

---

Suppose tail sampling keeps every error, every request slower than two seconds, and 5% of everything else. Counting the retained server spans does not measure request rate. Errors and slow requests have inclusion probability 1, while routine requests have inclusion probability 0.05.

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
      exporters: [span_metrics]
    traces/sampled:
      receivers: [otlp]
      processors: [tail_sampling, batch]
      exporters: [otlp/traces]
    metrics/red:
      receivers: [span_metrics]
      exporters: [otlp/metrics]
```

This counts every eligible span that reached the receiver, independent of which traces the other pipeline retains. It is still downstream of SDK head sampling and transport loss, so place the metric source before every selective stage that matters to the service-level rate.

Use server spans for inbound request rate and keep `span.kind` in the query. Summing both client and server calls can count the same distributed interaction more than once.

## Why One Global Sample Rate Is Wrong

For an observed item with inclusion probability `p`, an unbiased stochastic count contribution is approximately:

```text
adjusted count = 1 / p
```

A sampled routine request at 5% contributes 20. An always-kept error contributes 1. The estimator works only when the probability attached to that item is truthful. A hard-dropped class has probability zero and cannot be reconstructed from retained data.

Policy vote ratios from the Collector are aggregate diagnostics, not per-trace inclusion probabilities. Do not use the fraction of final traces kept as a universal multiplier for a heterogeneous rule set.

## Use TraceState Adjustment Only with End-to-End Probability Semantics

Current Collector Contrib has an alpha tail-sampling feature gate:

```sh
otelcol-contrib \
  --feature-gates=+processor.tailsamplingprocessor.usetracestate \
  --config=/etc/otelcol/config.yaml
```

When enabled, the probabilistic tail policy reads OpenTelemetry `rv` and `th` information from the W3C `tracestate` `ot` section when present, with a documented fallback to its legacy trace-ID hash. For sampled traces, the processor writes the smallest effective threshold among policies that voted to sample. Filter-style policies such as status or latency imply always-sample probability for their matching class.

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

connectors:
  span_metrics:
    enable_metrics_sampling_method: true
```

For an error retained by the filter, the effective threshold represents 100% inclusion for that class. A routine trace retained only by the 10% policy carries the probabilistic threshold. The current span metrics connector calculates stochastic adjusted counts from valid trace-state sampling information for call sums and histogram observations.

`enable_metrics_sampling_method` does not turn adjustment on; current connector code performs adjusted-count calculation regardless. The option adds `sampling.method=extrapolated` or `sampling.method=counted` as a metric dimension. Queries must sum both series when they represent one request total.

## Know When Adjustment Is Invalid

Use pre-tail metrics instead when any of these apply:

- an SDK or gateway dropped traces without propagating valid probability information;
- a custom rule has unknown or traffic-dependent inclusion probability;
- a `drop` policy removes requests that should still count toward the metric;
- different samplers overwrite or strip `tracestate` incorrectly;
- malformed trace state is common; or
- an alpha feature is unacceptable for the SLO data path.

The processor exposes `otelcol_processor_tail_sampling_count_spans_with_unparseable_tracestate`. Its scope is narrower than an input-validation counter: it increments once for each span skipped because its `tracestate` cannot be parsed **while the processor is rewriting the effective `th` on a sampled trace**. It does not count malformed state on traces that were not selected, and it is not a trace count. Alert on increases, but do not treat a zero value as proof that every incoming `tracestate` was valid.

Existing stricter thresholds are not weakened by the tail processor. Review the full sampling chain, not only the final Collector.

## Validate the Estimator

Generate a known workload, for example 100,000 server requests with 1,000 errors and a controlled latency distribution. Compare:

1. source request count;
2. pre-tail span-metrics count;
3. unadjusted retained-span count;
4. trace-state-adjusted post-tail count; and
5. results split by error and latency classes.

Repeat over enough independent trace IDs for stochastic error to narrow. Verify counts after every rollout because changing policy order, percentages, feature gates, or upstream SDK samplers changes the estimator.

## Official Documentation

- [Tail-sampling TraceState handling](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md#tracestate-handling)
- [Tail-sampling feature-gated telemetry](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/documentation.md)
- [Span metrics connector sampling support](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/spanmetricsconnector/README.md)
- [Span metrics stochastic adjusted-count implementation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/spanmetricsconnector/internal/metrics/adjusted_count.go)
- [OpenTelemetry TraceState probability-sampling specification](https://opentelemetry.io/docs/specs/otel/trace/tracestate-probability-sampling/)

## Conclusion

For stable RED metrics, count requests before selective tail sampling. Probability-aware post-tail metrics can be unbiased only when each retained span carries valid end-to-end inclusion information; the current tail support is alpha. Never apply one inverse sample rate to a population where errors, slow traces, and routine requests have different probabilities.
