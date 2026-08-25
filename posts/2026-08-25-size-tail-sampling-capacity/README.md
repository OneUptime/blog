# How to Size OpenTelemetry Tail Sampling `decision_wait`, `num_traces`, and Decision Caches from Real Traffic

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Tail Sampling, OpenTelemetry Collector, Capacity Planning, Observability

Description: Size the OpenTelemetry tail-sampling window, live-trace capacity, and late-span decision caches from measured trace arrival rates instead of guesswork.

---

The OpenTelemetry Collector tail-sampling processor has three different kinds of capacity. `decision_wait` controls how long a new trace normally remains pending, `num_traces` limits how many trace IDs can be live at once, and the two decision caches remember completed decisions after span data is released. Treating those settings as interchangeable is a common source of memory incidents and split traces.

The useful starting model is:

```text
live trace slots ~= new trace IDs/second x effective wait seconds
decision-cache entries ~= decisions/second x desired remembrance seconds
pending span bytes ~= spans/second x effective wait x measured bytes/span
```

These are capacity estimates, not guarantees. Arrival bursts, unbalanced trace-ID routing, unusually large traces, policy evaluation time, and Go object overhead all need headroom.

## Measure the Inputs at the Tail-Sampling Tier

Measure where tail sampling actually runs, after any load-balancing layer. The generated processor metric `otelcol_processor_tail_sampling_new_trace_id_received` counts newly observed trace IDs. Use peak rates over intervals comparable to the intended wait, not only a daily average.

Also collect:

- the delay from the first span arriving to the last span arriving for the same trace;
- spans and serialized bytes per trace, including high percentiles;
- the fraction of final keep and drop decisions;
- late-span volume and lateness; and
- Collector RSS under representative traffic.

`decision_wait` starts from the processor's observation of a new trace. It is not a maximum application span duration. SDK batching, network queues, multiple services, and exporter retries can make spans arrive far apart even when their timestamps overlap.

## Choose `decision_wait` from Arrival Completeness

Pick a window that covers the arrival delay required by the policies. A status policy needs enough time for an error span to arrive; a latency policy needs enough of the trace to observe its real time bounds. Start near a high percentile of first-to-last arrival delay, then validate the late-span histogram rather than assuming that a round number such as 30 seconds is safe.

The default is 30 seconds. A shorter wait lowers pending state and decision latency but increases the chance of deciding on incomplete data. A longer wait sees more of a trace but consumes more live slots and bytes.

If root spans normally arrive last, `decision_wait_after_root_received` can accelerate decisions while keeping `decision_wait` as a fallback. It should be based on the measured root-arrival-to-last-arrival tail, because child exports can still arrive after the root.

## Calculate `num_traces`

Suppose a shard group sees a peak of 2,400 new trace IDs per second, the selected wait is 20 seconds, and you want 30% burst headroom:

```text
2,400 x 20 x 1.30 = 62,400 live trace slots
```

Round up and test, for example:

```yaml
processors:
  tail_sampling:
    decision_wait: 20s
    decision_wait_after_root_received: 4s
    num_traces: 70000
    expected_new_traces_per_sec: 2400
    policies:
      - name: errors
        type: status_code
        status_code:
          status_codes: [ERROR]
      - name: baseline
        type: probabilistic
        probabilistic:
          sampling_percentage: 5
```

`expected_new_traces_per_sec` is an allocation hint. It does not admit, reject, or rate-limit traces. `num_traces` is the live-trace bound. When the bound is reached and `block_on_overflow` is false, the oldest live trace is evicted to make room.

With `num_shards` greater than one, the processor divides `num_traces` and the expected-rate hint across shards. Enforcement is approximate: skew can fill one shard before the aggregate total is reached. Measure each Collector replica, and remember that every replica has its own state.

## Size the Two Decision Caches Separately

The sampled and non-sampled caches are count-bounded LRU caches. They have no time-to-live setting. Their effective remembrance time depends on how quickly entries of each decision class are inserted.

If 240 traces/s are kept and 2,160 traces/s are dropped, remembering roughly ten minutes of decisions requires approximately:

```text
sampled:     240 x 600 =   144,000 entries
non-sampled: 2,160 x 600 = 1,296,000 entries
```

A reasonable rounded configuration is:

```yaml
processors:
  tail_sampling:
    num_traces: 70000
    decision_cache:
      sampled_cache_size: 200000
      non_sampled_cache_size: 1500000
```

The caches hold decisions, not buffered span bodies, but they still consume memory. Size them from the separate keep/drop throughputs. The upstream configuration comments recommend making an effective cache at least an order of magnitude larger than `num_traces`; real late-arrival requirements and decision ratios should refine that rule.

There is an important current-implementation detail behind that separation. When the relevant decision cache is active, the processor inserts the decision and removes the completed trace entry and its buffered data. With the default size-zero no-op caches, a completed entry remains in the live trace structure until the circular capacity turns over, so late spans can still inherit its decision there. The pending-bytes formula above is therefore an undecided-working-set estimate, not a complete heap estimate for a cache-disabled configuration; already-decided entries can remain part of the `num_traces` inventory.

## Validate the Whole Memory Envelope

Trace count alone cannot predict heap usage. A trace with 200 events and large attributes costs much more than a two-span trace. Replay representative OTLP traffic in staging, step the arrival rate and wait window, and measure RSS, allocation rate, garbage-collection pauses, and downstream export latency.

Watch these processor metrics together:

- `otelcol_processor_tail_sampling_sampling_traces_on_memory`;
- `otelcol_processor_tail_sampling_sampling_trace_dropped_too_early`;
- `otelcol_processor_tail_sampling_sampling_trace_removal_age`;
- `otelcol_processor_tail_sampling_sampling_late_span_age`;
- `otelcol_processor_tail_sampling_early_releases_from_cache_decision`; and
- `otelcol_processor_tail_sampling_sampling_decision_timer_latency`.

The late-span age histogram covers late spans handled while the completed decision is still in the live trace structure. Cache hits take a separate fast path and increment `early_releases_from_cache_decision` instead, without contributing an age observation, so use both metrics when sizing decision caches.

Set `maximum_trace_size_bytes` as a separate per-trace safety rail if giant traces threaten the memory model. Experimental `tail_storage` can move pending span bodies to an extension, but it does not remove the need to size live trace metadata, caches, disk, or throughput.

## Official Documentation

- [OpenTelemetry Collector Contrib tail-sampling processor](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md)
- [Tail-sampling processor configuration structs and validation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/config.go)
- [Tail-sampling processor internal telemetry](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/documentation.md)
- [Tail-sampling processor trace lifecycle implementation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/processor.go)

## Conclusion

Choose `decision_wait` from measured span-arrival completeness, derive `num_traces` from peak new-trace rate times that window, and size each LRU decision cache from its own decision throughput and required remembrance period. Then load-test the byte-level memory envelope and use the processor's eviction, lateness, and decision-latency metrics to correct the model.
