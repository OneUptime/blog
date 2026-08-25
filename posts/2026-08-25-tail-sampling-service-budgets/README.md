# How to Enforce Per-Service Trace Budgets with Composite Tail-Sampling Rate Allocation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Tail Sampling, OpenTelemetry Collector, Rate Allocation, Capacity Planning

Description: Allocate a composite span-per-second sampling budget among service classes, with ordered matching, decision-time trace charging, and replica-aware limits.

---

The tail-sampling `composite` policy combines ordered classifiers with a `max_total_spans_per_second` budget and percentage allocations. It is useful when one noisy service should not consume the entire sampled-span allowance.

Despite the common shorthand “trace budget,” the limiter accounts in spans per wall-clock second. At each decision, the accumulated spans for a trace are accepted or rejected together and charged by their count. Spans arriving after a sampled decision are not part of that charge.

## Allocate Every Class Explicitly

```yaml
processors:
  tail_sampling:
    sampling_strategy: trace-complete
    decision_wait: 20s
    policies:
      - name: service-budgets
        type: composite
        composite:
          max_total_spans_per_second: 1000
          policy_order: [checkout, payments, other-services]
          composite_sub_policy:
            - name: checkout
              type: string_attribute
              string_attribute:
                key: service.name
                values: [checkout]
            - name: payments
              type: string_attribute
              string_attribute:
                key: service.name
                values: [payments]
            - name: other-services
              type: always_sample
          rate_allocation:
            - policy: checkout
              percent: 40
            - policy: payments
              percent: 30
            - policy: other-services
              percent: 30
```

The intended allocations are 400, 300, and 300 sampled spans per second. In Collector Contrib v0.159.0, evaluator construction follows the order of `composite_sub_policy`; the retained `policy_order` field is decoded but is not consulted by the helper. Keep both lists aligned with the documented configuration model, but do not expect `policy_order` to reorder a differently ordered `composite_sub_policy` in that release. List every subpolicy in `rate_allocation`.

As of v0.159.0, helper code assigns an omitted subpolicy an equal-share default; a zero or negative percentage is treated the same way. Releases through v0.158.0 instead left an omitted subpolicy with zero capacity. Mixing positive percentages with defaulted entries can make the effective sum surprising. Use a unique name for each subpolicy, make every allocation explicitly positive, and keep their total at or below 100%.

That last constraint is important in the v0.159.0 implementation. Admission compares the selected subpolicy's counter with both its allocation and `max_total_spans_per_second`; it does not maintain a separate sum of all subpolicy counters. With one allocation per uniquely named subpolicy, allocations totaling at most 100% are what make the configured maximum an aggregate ceiling across classes for spans charged at decision time.

## Understand Ordered Classification

The composite evaluator walks subpolicies in order. The first matching subpolicy owns the trace. If admitting the entire trace would exceed that subpolicy's current-second allocation, the composite returns not sampled; it does not fall through to a later catch-all budget.

That behavior is what prevents an exhausted checkout class from consuming `other-services` capacity. It also means order is material when a trace matches several classes.

The counters reset on the first evaluation after the Unix second changes. This is not a smoothing token bucket. Output can be bursty at second boundaries, and unused allocation is not automatically borrowed by an earlier class whose budget is exhausted.

## Define “Service” for a Distributed Trace

The string attribute policy scans resource and span attributes across the accumulated trace. A normal distributed trace can contain `service.name=checkout`, `service.name=payments`, and several other services. Such a trace matches multiple service classifiers and is charged to the first one.

If the budget should belong to the entry service, tenant, or team, propagate a stable classification attribute such as `sampling.budget=checkout-edge` consistently and match that instead. Do not assume any encountered `service.name` is the trace owner.

Test missing and conflicting classification values. The final `always_sample` subpolicy provides a catch-all, but it may hide instrumentation drift unless the unknown-class rate is monitored.

## Account for Whole-Trace Charging

For each matching trace at decision time, the evaluator calculates:

```text
new sampled count = spans already charged this second + trace span count
```

It accepts only if the new value fits the allocated spans per second. A checkout trace with 450 spans accumulated before its decision cannot fit a 400-span allocation even at the beginning of a second. Smaller traces that arrive later may still fit because a rejected trace does not consume the counter.

`trace.SpanCount` is only the count known when evaluation runs. Late spans that arrive while a sampled decision is retained or cached are forwarded without another composite evaluation or counter increment; after the decision is forgotten, a late batch can be evaluated as a new partial trace. Allow headroom and monitor late spans because total exported spans can therefore exceed the configured rate.

`maximum_trace_size_bytes` provides an early byte-size drop before a sampling decision. For a hard span-count exclusion, put a `span_count` matcher inside a top-level `drop` policy; a standalone top-level `span_count` policy is only a positive sampling vote. Composite allocation controls span count, not serialized bytes or backend cost.

## Combine Priority and Hard Exclusions Carefully

You can use `and` subpolicies inside a composite to classify, for example, payment errors separately from payment baseline traffic. Put the most specific class first. Keep an explicit catch-all last.

Hard non-export rules should remain top-level `drop` policies. A `Dropped` decision vetoes the composite's sampled vote. Ordinary top-level positive policies, however, can bypass a composite rejection by sampling the trace themselves. If the composite must be the total positive budget, do not add an independent `always_sample`, error, or latency policy outside it.

## Scale the Budget Across the Fleet

Each Collector replica has independent per-second counters. A 1,000 spans/s configuration on five replicas can admit about 5,000 spans/s across the tier. Divide the fleet budget per replica or use a topology whose number of budget owners is controlled.

With `num_shards` greater than one, current tail sampling gives each shard `max(1, max_total_spans_per_second / num_shards)` using integer division, then applies the percentage allocations inside that shard. Enforcement is therefore approximate, especially when the configured limit is smaller than the shard count or trace IDs are skewed.

Use `trace-complete`. Composite rate allocation is temporal state, and whole-trace classification needs the accumulated trace. Current `IsStateful` reporting reflects only whether a child evaluator is stateful, so a composite made from stateless children can pass `span-ingest` startup checks despite maintaining allocation counters. Do not interpret that as whole-trace budget semantics: ingest-time classification sees only the current batch while charging the trace's cumulative span count.

## Observe Attribution and Utilization

Enable the alpha `processor.tailsamplingprocessor.recordpolicy` gate in a test environment to record `tailsampling.composite_policy` on the instrumentation scopes present when a composite subpolicy accepts a trace. Late spans forwarded under an existing sampled decision do not receive that composite-subpolicy attribution. Per-policy trace metrics show the top-level composite vote. The `otelcol_processor_tail_sampling_count_spans_sampled` metric likewise counts spans presented to each top-level policy evaluation, not deduplicated exporter output, and requires the separate alpha `processor.tailsamplingprocessor.metricstatcountspanssampled` gate.

Track source spans by budget class independently so you can distinguish an exhausted allocation from absent traffic. Replay traces at second boundaries and across replicas, and verify the exact retained trace IDs and span totals.

## Official Documentation

- [Tail-sampling composite policy configuration](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md)
- [Composite and rate-allocation configuration structs](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/config.go)
- [Composite allocation helper](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/composite_helper.go)
- [Composite evaluator and whole-trace accounting](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/internal/sampling/composite.go)
- [Sharded rate division](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/sharded_processor.go)
- [Trace-complete and span-ingest evaluation paths](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/processor.go)

## Conclusion

Use one ordered composite policy, explicit allocations totaling no more than 100%, and a final catch-all to partition a sampled-span budget. Define trace ownership explicitly, because distributed traces contain several services. Finally, multiply limits across replicas and remember that all spans known for an admitted trace are charged together at decision time; later spans are not recharged.
