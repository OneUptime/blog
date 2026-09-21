# How to Choose Between Counter, Gauge, Histogram, Summary, Info, and StateSet Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Monitoring, Observability, DevOps

Description: Choose OpenMetrics metric types by measurement meaning, aggregation needs, and label lifecycle, with practical counter, gauge, distribution, and state examples.

---

A metric's type should express what its value means across time. Picking a gauge simply because it is easy to set can make an event total hard to query. Picking a counter for a queue length makes ordinary decreases look like resets.

The [OpenMetrics type definitions](https://prometheus.io/docs/specs/om/open_metrics_spec/#metric-types) provide the semantic contract. Start with the operational question, then choose the type and labels that allow that question to be answered accurately.

## Counters measure accumulated work

Use a counter for requests handled, jobs completed, bytes transmitted, or CPU seconds consumed. Its total increases monotonically except when the underlying cumulative sequence resets, such as at process restart.

```text
# TYPE worker_jobs counter
# HELP worker_jobs Jobs completed since worker startup.
worker_jobs_total{result="success"} 120
worker_jobs_total{result="failure"} 4
# EOF
```

In OpenMetrics 1.0, the family name lacks the `_total` suffix used by the total sample. Query a counter's rate or increase over a window rather than treating its current total as the recent workload:

```promql
sum by (result) (rate(worker_jobs_total[5m]))
```

If a source reports “failures in the last five minutes,” the number can decrease as the window moves. That measurement is a gauge unless you can obtain a genuine cumulative event total. Renaming it with `_total` does not change its semantics.

## Gauges describe current state

Use a gauge for queue length, memory currently used, temperature, configured capacity, and the latest measured timestamp of a meaningful event. Gauges may increase, decrease, or remain constant.

```text
# TYPE worker_queue_depth gauge
# HELP worker_queue_depth Jobs currently waiting.
worker_queue_depth{queue="default"} 9
# EOF
```

A gauge that only happens to increase is still a gauge when its meaning is a current amount. The size of a file is a useful example: rotation or truncation changes current size, without necessarily resetting a cumulative bytes-written counter.

## Histograms describe aggregatable distributions

Use a histogram when you need latency or size distributions across many instances. Classic histograms expose cumulative buckets plus count and sum. Consistent bucket boundaries allow aggregation across replicas before calculating a quantile.

```promql
histogram_quantile(
  0.95,
  sum by (le) (rate(worker_job_duration_seconds_bucket[5m]))
)
```

Bucket selection controls resolution, especially around service objectives. A percentile can be approximate even when every sample is represented in a bucket. The [Prometheus histogram guidance](https://prometheus.io/docs/practices/histograms/) explains these tradeoffs and how histogram quantiles differ from client-calculated summary quantiles.

Modern native histograms have different wire-format and client support requirements. Do not assume they can be represented by the classic OpenMetrics 1.0 bucket example merely because both are called histograms.

## Summaries expose count, sum, and optional quantiles

A summary can expose an observation count, total sum, and client-calculated quantiles. Support varies by library: the [Python Summary documentation](https://prometheus.github.io/client_python/instrumenting/summary/) explicitly says that its implementation does not store or expose quantile information.

Precomputed quantiles cannot generally be added or averaged to obtain a fleet-wide percentile. Averaging the 95th percentiles from a busy replica and an idle replica does not produce the service's 95th percentile. Use a histogram when cross-instance distribution aggregation is part of the requirement.

Count and sum can still support an aggregate mean when their semantics and observation units match. For duration measurements, divide the rate of the sum by the rate of the count, with an explicit policy for periods containing no observations.

## Info describes stable textual metadata

An Info family expresses attributes such as a build version and revision that should not change during a process lifetime:

```text
# TYPE worker_build info
# HELP worker_build Worker build identity.
worker_build_info{version="2.4.0",revision="a1b2c3"} 1
# EOF
```

The sample value is 1; the information lives in its labels. Use bounded, intentional metadata. Request identifiers or continually changing timestamps are not good Info labels because they create new series repeatedly.

## StateSet describes a small set of boolean states

StateSet represents related boolean values. For an enumeration, exactly one state is true:

```text
# TYPE worker_mode stateset
# HELP worker_mode Current worker operating mode.
worker_mode{worker_mode="idle"} 0
worker_mode{worker_mode="running"} 1
worker_mode{worker_mode="draining"} 0
# EOF
```

The state label takes the family's name. Avoid a separate ordinary label with that same name. A boolean bitset can represent independent flags, while a single-choice enum needs mutual exclusivity.

Before deployment, verify that the chosen client and ingestion path preserve the type you need. Then test a restart, a state transition, zero observations, and aggregation across two instances. Those transitions reveal semantic mistakes that a successful parser check cannot detect.
