# OpenTelemetry `trace-complete` vs `span-ingest` Tail Sampling

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Tail Sampling, OpenTelemetry Collector, Distributed Tracing, Performance

Description: Compare current trace-complete and span-ingest tail-sampling semantics, policy compatibility, decision timing, storage pressure, and late-span behavior.

---

Current Collector Contrib tail sampling exposes two evaluation strategies. `trace-complete` is the default: accumulate a trace and evaluate its policies on the timer path. `span-ingest` evaluates each incoming trace batch immediately and only keeps the trace pending when no terminal result is available.

They are not two performance settings for the same semantics. They give policies different views of the data.

| Question | `trace-complete` | `span-ingest` |
| --- | --- | --- |
| Policy input | Accumulated received batches for the trace | Current incoming batch's span data, plus cumulative span-count and size metadata; previous span data is not re-evaluated |
| Positive decision | At the scheduled timer, or root-accelerated timer | Immediately when a terminal sampled outcome is possible |
| Pending cleanup | Policies evaluate accumulated data | Becomes not sampled without policy re-evaluation |
| Stateful policies | Supported | Rejected when the evaluator reports itself stateful |
| Pending pressure | Higher and longer | Can be lower with the corresponding decision cache enabled when policies reach terminal outcomes early |
| Completeness model | Best for facts distributed across the trace | Best for monotonic facts visible in one incoming batch or cumulative metadata |

## Use `trace-complete` for Whole-Trace Questions

This is the safe default for rules such as:

- retain a trace if any descendant has `StatusCode=ERROR`;
- combine a route on the root span with an error on a child;
- compare the earliest start with the latest end for trace latency;
- count the trace's spans received before the decision; or
- apply rate or byte limiters whose decisions depend on shared state.

```yaml
processors:
  tail_sampling:
    sampling_strategy: trace-complete
    decision_wait: 20s
    decision_wait_after_root_received: 4s
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
```

The cost is pending span storage and later export. Choose the wait from measured span-arrival behavior and size `num_traces` and memory or `tail_storage` accordingly.

## Use `span-ingest` Only for Eagerly Decidable Rules

```yaml
processors:
  tail_sampling:
    sampling_strategy: span-ingest
    decision_wait: 2m
    decision_cache:
      sampled_cache_size: 500000
      non_sampled_cache_size: 2000000
    policies:
      - name: any-error-batch
        type: status_code
        status_code:
          status_codes: [ERROR]
```

When an incoming batch contains an error span, this stateless policy can return `Sampled` immediately. The processor releases previously accumulated pending batches together with the current batch. Future late batches depend on the decision cache.

If no batch produces a terminal sample or drop, cleanup at `decision_wait` marks the trace not sampled. Crucially, cleanup does not combine and re-evaluate all stored batches. An `and` policy can therefore miss when one required attribute arrived in an earlier batch and another arrived later.

The setting still uses `decision_wait`; in this mode it is a pending cleanup deadline, not the ordinary positive-decision time. When set, `decision_wait_after_root_received` can move that cleanup earlier after a root span arrives.

## Validate Policy Compatibility in the Target Version

The processor rejects `span-ingest` at startup when a configured evaluator reports that it is stateful. Current source marks the byte and span rate limiters stateful. An upper-bounded latency policy and a maximum span-count policy are also stateful because a later span can invalidate an earlier match. Wrapper policies inherit statefulness from their children.

Lower-bound-only latency and minimum-only span count are monotonic in principle: once the lower bound is crossed, later data cannot undo the match. The latency evaluator still computes from the current batch's span data, while the span-count evaluator reads cumulative `SpanCount` metadata. Simple status, attribute, OTTL, trace-flag, and probabilistic evaluators report stateless behavior.

Do not turn that list into a permanent compatibility contract. `span-ingest` is new enough that evaluator classification and edge behavior can change. Run the exact configuration against the exact Collector release before deployment.

Hard drop policies are not compatible with retaining the non-dropped remainder under the current ingest path. A matching drop policy terminates the trace as dropped. A nonmatching drop remains unresolved, blocks positive decisions from ordinary policies, and cleanup finalizes the trace as not sampled without re-evaluation. Use `trace-complete` when combining positive selection with exclusions or when an exclusion requires a whole-trace absence proof.

## Compare Resource Use Correctly

With the corresponding decision cache enabled, `span-ingest` can reduce the residence time of traces that quickly match a terminal policy. It does not guarantee low memory by itself:

- non-matching traces remain pending until cleanup;
- previous pending batches still need storage until a terminal result;
- `num_traces` still bounds live trace metadata;
- decision caches still consume memory; and
- late spans can still arrive after either strategy's decision.

The experimental Pebble tail-storage extension is often paired with `span-ingest` so pending batches live on local disk. It is alpha, feature-gated, limited to `num_shards: 1`, and currently clears its database on startup.

## Run a Semantic Replay, Not Only a Load Test

For each policy, split relevant spans across OTLP requests and permute their order. Include a root before children, root after children, error in a later batch, and a span after cleanup. Compare the selected trace IDs and exported span counts under both strategies.

Then load-test:

- time to positive decision;
- live traces and storage bytes;
- policy evaluation errors;
- late-span age and cache hits; and
- output completeness.

Lower memory use is not a win if the strategy changes which traces the policy keeps.

## Official Documentation

- [Tail-sampling strategies and policy behavior](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md#sampling-strategies)
- [Tail-sampling strategy configuration](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/config.go)
- [Trace-complete and span-ingest decision implementation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/processor.go)
- [Sampling policy evaluator contract](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/pkg/samplingpolicy/samplingpolicy.go)

## Conclusion

Choose `trace-complete` when the decision depends on facts spread across a trace or on stateful allocation. Choose `span-ingest` only when each desired terminal match can be proven from the current batch or cumulative metadata exposed to the evaluator and its cleanup semantics are acceptable. Replay reordered, split batches before treating the two strategies as operational substitutes.
