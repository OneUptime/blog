# Static Thresholds vs Dynamic Baselines: How to Reduce Noisy Infrastructure Alerts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, PromQL, Alerting, Dynamic Baselines, Infrastructure Monitoring, SRE

Description: Combine hard operational thresholds with recorded historical baselines, minimum-impact gates, cold-start protection, and sustained alert durations.

---

Static thresholds and dynamic baselines solve different alerting problems.

A static threshold asks:

> Has this signal crossed a known unsafe boundary?

A dynamic baseline asks:

> Is this signal unusual for this resource at this time?

Neither is generally superior. A disk with 500 MiB available is dangerous even if that is normal. A database host using 70% CPU may be healthy every weekday, while 45% at 03:00 could signal a runaway job. Reliable infrastructure alerting combines known limits, historical context, and user-visible impact.

## Where Static Thresholds Work Best

Use static thresholds when the boundary has physical or operational meaning:

- filesystem or inode headroom needed for recovery;
- memory available before reclaim becomes harmful;
- a certificate or lease approaching expiry;
- a queue depth tied to a deadline;
- a cloud quota;
- a tested storage latency limit;
- an SLO error or latency budget.

Static rules are:

- easy to explain;
- cheap to evaluate;
- available immediately for a new host;
- stable during incidents;
- straightforward to test.

Their main weakness is heterogeneity. The same CPU percentage, free-byte value, or IOPS level can mean different things on hosts with different size, purpose, and workload.

Do not solve that only by creating hundreds of per-host thresholds. Group resources by meaningful class—such as role, storage tier, or instance type—and keep the number of policies reviewable.

## Where Dynamic Baselines Help

Use a historical baseline when:

- normal values differ materially by host or role;
- workload has a repeatable daily or weekly cycle;
- change from normal is more informative than an absolute level;
- the signal has enough stable history;
- the response can tolerate the baseline window and computation.

Examples include:

- CPU or network usage far above a host's usual level;
- background I/O outside its normal batch window;
- an unexpected increase in connection count;
- an exporter suddenly producing far more series;
- a host whose behavior diverges from peers of the same class.

Dynamic rules still need a practical impact gate. Otherwise a stable metric with tiny variance can alert on an irrelevant change from 0.01 to 0.02.

## Record the Signal Before Baselining It

First create a well-defined host CPU ratio:

```yaml
groups:
  - name: host-baselines
    interval: 1m
    rules:
      - record: instance:node_cpu_utilization:ratio5m
        expr: |
          1 -
          avg by (job, instance) (
            rate(node_cpu_seconds_total{mode="idle"}[5m])
          )
```

The recording rule gives the expensive or easy-to-misread expression one stable name and label set. It also ensures the historical range contains the **ratio**, not raw CPU counters.

Prometheus recommends applying `rate()` before aggregation so counter resets are visible to the rate calculation.

## Mean and Standard-Deviation Baseline

Historical mean:

```promql
avg_over_time(
  instance:node_cpu_utilization:ratio5m[7d] offset 1h
)
```

Historical population standard deviation:

```promql
stddev_over_time(
  instance:node_cpu_utilization:ratio5m[7d] offset 1h
)
```

The one-hour offset keeps the newest hour—the period most likely to contain the current incident—out of the training window. It does not make the baseline immune to a multi-day incident or a gradual regression.

An anomaly condition can require three standard deviations above the mean **and** at least 70% CPU:

```promql
(
  instance:node_cpu_utilization:ratio5m
  >
  avg_over_time(
    instance:node_cpu_utilization:ratio5m[7d] offset 1h
  )
  +
  3 *
  stddev_over_time(
    instance:node_cpu_utilization:ratio5m[7d] offset 1h
  )
)
and
(
  instance:node_cpu_utilization:ratio5m > 0.70
)
```

“Three standard deviations” is not a universal incident boundary. Infrastructure data is rarely a perfect stationary normal distribution. Treat the multiplier as a tunable sensitivity control, not a probability guarantee.

## Quantile Baseline for Skewed Signals

For a signal with asymmetric spikes, a historical quantile can be easier to reason about:

```promql
quantile_over_time(
  0.99,
  instance:node_cpu_utilization:ratio5m[14d] offset 1h
)
```

Alert when the current value exceeds both a multiple of that historical quantile and a minimum-impact threshold:

```promql
(
  instance:node_cpu_utilization:ratio5m
  >
  1.20 *
  quantile_over_time(
    0.99,
    instance:node_cpu_utilization:ratio5m[14d] offset 1h
  )
)
and
(
  instance:node_cpu_utilization:ratio5m > 0.70
)
```

Prometheus's `quantile_over_time()` computes the quantile over the samples in each range vector. With a regular recording-rule interval, those samples are approximately time-weighted equally. Missed evaluations reduce the observations available.

## Same-Time-Last-Week Comparison

For a strong weekly cycle:

```promql
instance:node_cpu_utilization:ratio5m
>
1.5 *
instance:node_cpu_utilization:ratio5m offset 1w
```

The `offset` modifier shifts the selector by exactly one Prometheus week, which is seven 24-hour days. It does not understand business calendars, holidays, daylight-saving transitions, deployments, or last week's incident.

Use multiple weeks or an external seasonal model when a single comparison is too fragile. A one-week offset should be a diagnostic component, not the sole page condition.

## Protect New and Sparse Series

An over-time function will calculate from the samples it has. A new host with one hour of data does not have a trustworthy seven-day baseline.

Require enough observations:

```promql
count_over_time(
  instance:node_cpu_utilization:ratio5m[7d] offset 1h
) > 1800
```

A five-minute recording cadence would have 2,016 ideal observations in seven days, so 1,800 allows some gaps. The example recording rule above runs every minute and would need a different count. Derive the requirement from the actual rule interval and tolerated missing-data rate.

Keep a static fallback for resources without baseline history. Otherwise new hosts can be entirely unprotected during their cold-start period.

## A Complete Dynamic Warning

```yaml
groups:
  - name: host-cpu-anomaly
    interval: 1m
    rules:
      - alert: HostCPUAboveBaseline
        expr: |
          (
            instance:node_cpu_utilization:ratio5m
            >
            avg_over_time(
              instance:node_cpu_utilization:ratio5m[7d] offset 1h
            )
            +
            3 *
            stddev_over_time(
              instance:node_cpu_utilization:ratio5m[7d] offset 1h
            )
          )
          and
          (
            instance:node_cpu_utilization:ratio5m > 0.70
          )
          and
          (
            count_over_time(
              instance:node_cpu_utilization:ratio5m[7d] offset 1h
            ) > 9000
          )
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "CPU is unusually high on {{ $labels.instance }}"
```

At a one-minute rule interval, 10,080 evaluations are expected across seven days; 9,000 allows gaps. Tune the count with observed rule reliability.

The `for` clause handles brief anomalies. Prometheus keeps the alert pending until the expression has remained active for that duration.

## Common Baseline Failure Modes

### The incident becomes normal

A long incident or gradual degradation enters the historical window and raises the baseline. Use an offset, keep a static safety boundary, and review baseline behavior during known incidents.

### Fleet-wide failure looks normal

A change deployed everywhere can shift all hosts together. A per-host baseline may eventually adapt. Retain service SLO alerts and compare canaries, versions, or unchanged peer groups.

### Tiny variance causes noise

When standard deviation is nearly zero, a small harmless change is many deviations away. Add an absolute or relative impact floor.

### Label churn destroys history

If a hostname, pod UID, image digest, or other identifying label changes, Prometheus sees a new series with no baseline. Aggregate away ephemeral labels before recording and keep only labels required for ownership and routing.

### The query is too expensive

Long subqueries over raw high-cardinality metrics can overload rule evaluation. Prometheus skips a group's next evaluation if the previous evaluation has not completed. Use recording rules, bounded label sets, and monitor missed rule iterations.

### Missing data is interpreted as recovery

If the source series disappears, the anomaly expression may return no result. Alert on scrape health separately and use `keep_firing_for` deliberately when short gaps should not resolve a firing alert.

## Use a Hybrid Policy

A robust policy often has three layers:

1. **Static safety boundary:** prevents known resource exhaustion.
2. **Dynamic warning:** finds meaningful deviation early.
3. **Symptom page:** fires when users, deadlines, or redundancy are affected.

For example:

- ticket when CPU is above its baseline and above 70% for 15 minutes;
- warning when CPU is above 90% for 15 minutes even without history;
- page when high CPU coincides with an SLO latency or error-budget burn.

This preserves coverage while using history to reduce low-value notifications.

## Summary

Use static thresholds for hard operational limits and dynamic baselines for resource-specific deviation. Record a correctly normalized signal first, exclude the current incident from its training window, require adequate history, add an impact floor, and sustain the condition with `for`. Always retain a static fallback and symptom-based page because a baseline can learn incidents, miss new series, and normalize a fleet-wide failure.

## Official Documentation

- [Prometheus over-time, `rate()`, and prediction functions](https://prometheus.io/docs/prometheus/latest/querying/functions/)
- [Prometheus `offset` modifier and subqueries](https://prometheus.io/docs/prometheus/latest/querying/basics/#offset-modifier)
- [Prometheus recording and alerting rule syntax](https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/)
- [Prometheus recording rule practices](https://prometheus.io/docs/practices/rules/)
- [Prometheus alerting practices](https://prometheus.io/docs/practices/alerting/)
- [The Zen of Prometheus: actionable and symptom-based alerts](https://prometheus.io/docs/practices/the_zen/)
