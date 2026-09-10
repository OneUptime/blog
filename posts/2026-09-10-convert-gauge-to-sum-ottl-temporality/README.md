# Convert Gauges to Sums in OTTL with Correct Temporality

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OpenTelemetry Collector, OTTL, Observability, Troubleshooting

Description: Use convert_gauge_to_sum only for measurements that already have sum semantics, and verify temporality, monotonicity, timestamps, and resets.

Changing a metric's type does not change what its numbers mean. If a gauge contains current CPU temperature, labeling it as a cumulative sum creates misleading telemetry. OTTL's gauge-to-sum function is useful when the producer already emits counter-like values but encodes them with the wrong OTLP type.

This guide targets OpenTelemetry Collector Contrib **0.160.0**. The function preserves data points and sets sum metadata; it does not calculate differences, integrate rates, or maintain state across requests.

## Establish the Meaning of the Source Values

Compare these sequences:

| Source meaning | Values | Suitable interpretation |
|---|---|---|
| Requests since process start | 100, 120, 145 | Cumulative monotonic sum, with valid reset metadata |
| Requests in each collection interval | 20, 25, 18 | Delta monotonic sum, with valid intervals |
| Current active requests | 8, 3, 11 | Usually a gauge or deliberately modeled nonmonotonic instrument |
| Temperature | 21, 22, 20 | Gauge |

A delta monotonic sum can report a smaller positive number in the next interval. Monotonic describes the kind of accumulated measurements, not a requirement that consecutive interval totals increase.

The [OpenTelemetry sum data model](https://opentelemetry.io/docs/specs/otel/metrics/data-model/#sums) defines temporality and monotonicity. Confirm the instrumentation contract with the producer rather than inferring it from a metric name ending in `total`.

## Use the Conversion for a Known Misencoded Counter

Assume `legacy.requests_total` contains counts since a known process start and already supplies suitable start timestamps:

```yaml
processors:
  transform/fix_legacy_counter:
    error_mode: ignore
    metric_statements:
      - statements:
          - convert_gauge_to_sum("cumulative", true) where metric.name == "legacy.requests_total" and metric.type == METRIC_DATA_TYPE_GAUGE
```

The first argument must be `cumulative` or `delta`. The second is a boolean. A spelling such as `AGGREGATION_TEMPORALITY_CUMULATIVE` is not the string argument this function expects.

The [tagged implementation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/processor/transformprocessor/internal/metrics/func_convert_gauge_to_sum.go) sets the sum's aggregation temporality and monotonicity, then moves the original points into it. Non-gauge metrics are left unchanged.

Put this function in a metric-context group. If a neighboring statement touches `datapoint.attributes`, use a separate group to avoid an inference conflict.

## Do Not Mistake Relabeling for Delta Conversion

Applying `convert_gauge_to_sum("delta", true)` to values `100, 120, 145` does not produce `100, 20, 25`. It produces delta-labeled values `100, 120, 145`, which overcount if interpreted as interval contributions.

If the source contains cumulative values and the destination requires delta, first represent the source honestly as a cumulative sum and evaluate an appropriate stateful cumulative-to-delta processor. That additional component has its own requirements for routing, initial values, resets, and retained state.

Similarly, converting a per-second rate into a sum requires a defined integration interval and actual calculation. The OTTL type conversion does not infer that interval from timestamps or multiply the values for you.

## Check Start Times and Reset Behavior

A gauge may omit a start timestamp because a point-in-time measurement does not require an accumulation origin. A cumulative sum's start timestamp helps consumers recognize its accumulation period and resets.

The conversion function does not invent a correct process-start time. Do not set every point's start time to its observation time merely to make the field nonzero. That would describe a different accumulation interval.

If the producer restarts and the value drops from `145` to `3`, verify that the start timestamp changes to reflect the new accumulation period. If that information is unavailable, fixing the producer is more reliable than assigning sum semantics in the Collector.

For delta sums, verify interval boundaries and overlaps. Two replicas reporting the same interval under the same identity can create duplicate contributions even when their metadata is individually valid.

## Preserve Metric Identity Deliberately

Changing type or temporality can conflict with an existing stream of the same name, unit, resource, and attributes. During a transition, prevent old and new representations from arriving under an ambiguous identity.

A temporary distinct metric name can help a canary comparison, but plan downstream queries and retirement of the old stream. Do not convert every gauge in a pipeline because one backend prefers sums; most gauges are correctly modeled as gauges.

## Validate Metadata and Values Together

Use a local OTLP fixture containing the known counter, an unrelated gauge, an already-correct sum, and a reset sequence. Inspect the file or detailed debug output:

```bash
otelcol-contrib validate --config collector.yaml
otelcol-contrib --config collector.yaml
```

The selected metric should have sum type, cumulative temporality, and monotonicity enabled. Its values, attributes, observation timestamps, and start timestamps should match the input. The unrelated metric and existing sum should remain unchanged.

Also run a fixture with delta conversion to prove that values are preserved rather than differenced. This simple check prevents a configuration that parses successfully from silently corrupting a counter interpretation.

## Conclusion

Use gauge-to-sum conversion only when the source measurements already support the chosen sum semantics. Verify temporality, start times, resets, and stream identity. The function repairs an encoding mismatch; it cannot manufacture the measurement history required for a valid counter.

## Official Documentation

- [Gauge-to-sum implementation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/processor/transformprocessor/internal/metrics/func_convert_gauge_to_sum.go)
- [Conversion function documentation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/processor/transformprocessor/README.md#convert_gauge_to_sum)
- [OTel sum semantics](https://opentelemetry.io/docs/specs/otel/metrics/data-model/#sums)
