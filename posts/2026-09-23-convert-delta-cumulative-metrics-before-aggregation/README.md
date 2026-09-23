# How to Convert Delta and Cumulative Metrics Safely Before Aggregation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OpenTelemetry Collector, Metric, Monitoring

Description: Choose metric temporality deliberately, preserve source identity during conversion, and test resets, Collector restarts, and gaps before combining streams.

A value of `120` can mean 120 events since a process started or 120 events during the last collection interval. Those measurements have different temporalities. Adding them because the metric names match produces a number with no consistent interpretation.

Normalize temporality while individual source streams are still identifiable. Then aggregate only contributions whose time boundaries and measurement semantics are compatible. This ordering preserves information needed to handle resets and gaps.

## Inspect timestamps as well as values

A cumulative sum covers an interval from its start timestamp to its observation timestamp. A delta sum covers a particular reporting interval. The timestamps make `100, 130, 160` interpretable; values alone cannot identify whether a process restarted or whether intervals overlap. [OpenTelemetry metric data model](https://opentelemetry.io/docs/specs/otel/metrics/data-model/#temporality)

For an uninterrupted cumulative stream with a fixed start time:

| Observation | Cumulative value | Difference since previous observation |
|---|---:|---:|
| 10:00 | 100 | Unknown without a preceding baseline |
| 10:01 | 130 | 30 |
| 10:02 | 160 | 30 |

Adding the cumulative observations gives `390`, which does not describe the work during these intervals. Conversely, treating delta values `30, 30, 30` as cumulative and applying a counter rate can suggest no activity.

## Convert cumulative data while preserving each writer

Collector Contrib **0.160.0** provides the `cumulative_to_delta` processor. This example converts only a named metric and deliberately suppresses the first observed cumulative value:

```yaml
processors:
  cumulative_to_delta/requests:
    include:
      match_type: strict
      metrics: [example.requests]
    initial_value: drop
    max_staleness: 1h
```

Place it in the metrics pipeline before transformations that remove source identity. Keep resource attributes such as `service.instance.id` and any point attributes that distinguish independent counters until conversion finishes.

`drop` establishes the first observation as a baseline rather than exporting its entire historical value as a new delta. `keep` can be appropriate when the collector and source share a lifecycle. `auto` uses start-time information to decide whether the first point belongs to a newly started stream. Choose deliberately and test the producer's timestamps. The processor supports monotonic sums and histogram types, with the exact selection and initial-value contract documented in the [tagged README](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/processor/cumulativetodeltaprocessor/README.md).

The processor needs successive observations of a stream to reach the same Collector instance. Randomly distributing them among gateways can create multiple baselines and incorrect deltas. The [scaling guide](https://opentelemetry.io/docs/collector/scaling/) discusses this stateful processing requirement.

## Convert delta data for a cumulative destination

For a backend that expects cumulative data, use a separate pipeline containing:

```yaml
processors:
  delta_to_cumulative/requests:
    max_stale: 30m
    max_streams: 100000
```

In this release, `delta_to_cumulative` is alpha and retains accumulation state in memory. `max_stale` expires inactive streams; `max_streams` bounds the tracked stream population and causes excess new streams to be dropped. Both names differ from `max_staleness` in the opposite converter. [Tagged delta-to-cumulative documentation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/processor/deltatocumulativeprocessor/README.md)

These are alternative examples, not a recommendation to chain both processors in one path. Converting back and forth adds state and failure boundaries without recovering information lost earlier.

For a complete run of deltas `5, 7, 3`, cumulative output can be `5, 12, 15`. Restarting the Collector loses the prior in-memory total, so downstream consumers must handle a new cumulative sequence correctly. A persistent exporter queue is not automatically persistent converter state.

## Keep temporal conversion separate from spatial aggregation

Suppose instance A resets while instance B continues counting. If their cumulative values are combined first, B's increase can hide A's reset. Once those identities are erased, a later converter cannot reliably reconstruct the separate histories.

The useful ordering is:

```text
identify source streams
  -> convert temporality per source if required
  -> align compatible contributions
  -> aggregate selected dimensions
  -> export the derived stream
```

Aligned delta intervals make addition easier to reason about, but the converter does not itself create a service-wide window. Adding one worker's one-minute delta to another worker's five-minute delta does not yield a meaningful one-minute total. A stateful windowing component or backend still needs to own that operation.

Histograms also require compatible representations. Converting temporality does not standardize explicit bucket boundaries, units, or instrumentation scope. Preserve these distinctions when planning which streams can combine.

## Exercise the state transitions before rollout

Build a fixture sequence containing normal growth, a source restart with a new start timestamp, a Collector restart, a long idle gap, a replay, and an out-of-order arrival. Compare output values and time boundaries against the intended accounting contract rather than merely checking that points arrive.

Repeat with two source instances whose values and reset times differ. Route each consistently, then deliberately break that routing in a test environment to expose its importance. Monitor dropped data and converter state pressure when testing limits.

Finally, compare the converted stream and original data over several complete windows during a staged rollout. Document the expected first-point loss or baseline behavior. A conversion is safe when its restart and delivery assumptions remain visible to the systems that consume its results.
