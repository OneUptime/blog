# Place Span Metrics Before Tail Sampling to Avoid Biased RED Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Span Metrics, Tail Sampling, RED Metrics, OpenTelemetry Collector

Description: Branch complete spans into the span metrics connector before selective tail sampling so request, error, and duration metrics describe traffic rather than retained traces.

---

The span metrics connector derives Request, Error, and Duration metrics from the spans it receives. If a tail sampler first keeps nearly all errors and slow traces but only 5% of routine traces, a connector placed after it sees that intentionally distorted population.

Without valid probability-sampling information that the connector can use for adjusted counts, the resulting call rate is too low, error rate is too high, and duration distribution is skewed slow. Those can be useful “retained trace” metrics, but they are not unbiased service RED metrics.

## Branch Before Tail Sampling

Collector configuration permits one receiver to feed multiple pipelines. Use one trace pipeline as the full-population source for `span_metrics` and another for sampled trace export:

```yaml
receivers:
  otlp:
    protocols:
      grpc:

processors:
  memory_limiter:
    check_interval: 1s
    limit_mib: 1800
  tail_sampling:
    decision_wait: 20s
    num_traces: 80000
    policies:
      - name: errors
        type: status_code
        status_code:
          status_codes: [ERROR]
      - name: slow
        type: latency
        latency:
          threshold_ms: 1500
      - name: baseline
        type: probabilistic
        probabilistic:
          sampling_percentage: 5
  batch/traces:
  batch/metrics:

connectors:
  span_metrics:
    histogram:
      unit: s
    aggregation_temporality: AGGREGATION_TEMPORALITY_DELTA
    metrics_flush_interval: 30s

exporters:
  otlp/traces:
    endpoint: traces.example.com:4317
  otlp/metrics:
    endpoint: metrics.example.com:4317

service:
  pipelines:
    traces/red-source:
      receivers: [otlp]
      processors: [memory_limiter]
      exporters: [span_metrics]
    traces/sampled:
      receivers: [otlp]
      processors: [memory_limiter, tail_sampling, batch/traces]
      exporters: [otlp/traces]
    metrics/red:
      receivers: [span_metrics]
      processors: [batch/metrics]
      exporters: [otlp/metrics]
```

The connector is an exporter at the end of the full-span trace pipeline and a receiver at the start of the metrics pipeline. The tail sampler exists only in the sampled trace branch.

The component's current preferred name is `span_metrics`. The older `spanmetrics` name remains as a deprecated alias.

## Define What “Complete Population” Means

This topology derives metrics from every span accepted and forwarded through the `traces/red-source` branch; its `memory_limiter` can refuse data before it reaches the connector. When sampled spans carry valid probability-sampling information, the connector can statistically account for compatible SDK or upstream probabilistic sampling; otherwise, those upstream drops remain invisible. It cannot recover telemetry lost because of an upstream exporter failure or hard drops in a previous Collector tier. For unbiased request rate when adjusted counts are unavailable or invalid, generate metrics before every selective sampling stage or use native application request metrics.

Also choose the span kind and dimensions appropriate for the dashboard. Counting both CLIENT and SERVER spans as “requests” double-counts one distributed interaction. The connector's defaults separate series by `span.kind`, `span.name`, service, status, and Collector instance; queries must select the intended operation side.

Perform resource enrichment and span-name normalization consistently in both branches when those values form metric dimensions or trace search fields. A processor referenced by multiple pipelines gets a separate instance in each pipeline.

## Understand Receiver Fan-Out Backpressure

The Collector architecture uses one receiver instance and a synchronous fan-out consumer when that receiver appears in several pipelines. A blocking processor in one branch can block the other branches and the receiver.

For stronger failure isolation, use two Collector tiers. The first tier enriches complete spans and sends them to `span_metrics` plus a trace-ID load-balancing exporter. The second tier performs tail sampling. This also aligns with the tail sampler's documented scaling pattern.

## Protect Metric Stream Correctness

In multi-instance deployments, span metrics must follow the OpenTelemetry Single Writer Principle. Current connector defaults include `collector.instance.id` as a dimension, which prevents several instances from writing the exact same stream but creates per-Collector series that the backend must aggregate.

Do not disable that dimension casually. Review `resource_metrics_key_attributes`, temporality, backend aggregation, and replica churn. The connector README recommends a dedicated pipeline and stable resource keys for Prometheus-like exporters.

Limit cardinality at its source: use low-cardinality span names and route templates, choose dimensions carefully, and set `aggregation_cardinality_limit` as a circuit breaker if appropriate.

## When Post-Sampling Metrics Can Be Adjusted

The current connector can derive stochastic adjusted counts from valid OpenTelemetry probability-sampling information in W3C `tracestate`. Current tail sampling has an alpha, off-by-default `processor.tailsamplingprocessor.usetracestate` feature gate that can propagate effective thresholds for sampling policies that vote to sample.

That path is useful but version-sensitive and only correct when every sampling stage preserves valid probability semantics. Pre-tail metrics remain the simpler, stable choice for operational RED dashboards, especially with hard drops, incomplete upstream telemetry, or custom rules whose inclusion probability is unknown.

## Validate with a Controlled Workload

Send a workload whose selected `SERVER` operation has exactly one server span per request: 10,000 successes, 100 failures whose OpenTelemetry span status is `ERROR`, and a known duration distribution. Configure tail sampling to keep all failures, every trace matching the slow policy, and a 5% baseline sample of the remainder. For that `service.name`, `span.kind`, and `span.name` slice, aggregating or filtering the default `status.code` and `collector.instance.id` dimensions as appropriate, verify that:

- pre-tail calls approximate 10,100;
- pre-tail failures approximate 100;
- pre-tail latency matches the source distribution;
- the sampled trace backend retains all 100 failures, every trace matching the slow policy, and the baseline sample of the remainder; and
- a temporary post-tail connector shows the expected biased population.

This turns pipeline placement into a measurable invariant instead of a diagram assumption.

## Official Documentation

- [Span metrics connector overview and configuration](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/spanmetricsconnector/README.md)
- [OpenTelemetry Collector connectors](https://github.com/open-telemetry/opentelemetry-collector/blob/main/connector/README.md)
- [Collector architecture and receiver fan-out](https://opentelemetry.io/docs/collector/architecture/#receivers)
- [Tail-sampling statefulness and scaling guidance](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md#scaling-collectors-with-the-tail-sampling-processor)
- [OpenTelemetry metrics Single Writer Principle](https://opentelemetry.io/docs/specs/otel/metrics/data-model/#single-writer)

## Conclusion

Feed `span_metrics` from a full-span branch before tail sampling when RED metrics must represent traffic. Export retained traces from a separate branch or tier, account for synchronous fan-out and single-writer behavior, and verify the topology with known request counts and failures.
