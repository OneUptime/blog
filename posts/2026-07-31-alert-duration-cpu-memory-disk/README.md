# How Long Should CPU, Memory, and Disk Stay High Before an Alert Fires?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Alerting, CPU, Memory, Disk, SRE

Description: Choose Prometheus `for` durations from signal volatility, time to impact, scrape cadence, and runbook response rather than one fleet-wide default.

---

There is no universal alert duration for CPU, memory, and disk. The right delay is long enough to reject harmless transients but short enough to leave time for the response to prevent or limit impact.

A useful starting policy is:

| Signal | Initial warning duration | Why |
| --- | ---: | --- |
| High host CPU | 10–15 minutes | Ignores short bursts and deployment warm-up |
| Low available memory | 5–10 minutes | Memory can deteriorate faster and may trigger reclaim or OOM |
| Low filesystem space | 10–15 minutes | Ignores temporary files; forecasts should provide earlier notice |
| I/O queue and latency high | 5–10 minutes | Requires sustained contention rather than one storage burst |

These are engineering starting points, not values prescribed by Prometheus. Tune them from workload behavior, user-impact timing, and the action the alert triggers.

## What Prometheus `for` Actually Does

An alerting rule is active whenever its PromQL expression returns a vector element. With:

```yaml
for: 10m
```

Prometheus keeps each matching label set pending. It becomes firing only after that same alert instance has remained active for at least ten minutes.

If the expression stops returning the element before then, the pending state is cleared. A later recurrence starts a new pending period.

The effective alert identity comes from its labels. Do not put a changing measurement value into a rule label: every change can create a different alert identity. Put current values and explanatory text in annotations.

## Total Detection Time Is Longer Than `for`

The notification delay includes:

```text
metric collection
  + scrape alignment
  + rate/range window behavior
  + rule evaluation alignment
  + `for` duration
  + Alertmanager grouping and delivery
```

With a 60-second scrape interval and 60-second rule interval, a `for: 5m` rule does not guarantee notification exactly five minutes after the real condition begins. The first confirming sample and rule evaluation can arrive later, and Alertmanager has its own `group_wait`, grouping, and receiver delays.

Measure end-to-end alert delivery rather than treating the YAML duration as the complete response budget.

## CPU: Allow Bursts, Catch Sustained Contention

Host CPU often spikes during:

- application startup and JIT compilation;
- deployments;
- compression;
- backups;
- scheduled jobs;
- a short traffic burst.

A normalized host ratio:

```promql
1 -
avg by (job, instance) (
  rate(node_cpu_seconds_total{mode="idle"}[5m])
)
```

An initial warning:

```yaml
- alert: HostCPUUtilizationHigh
  expr: |
    (
      1 -
      avg by (job, instance) (
        rate(node_cpu_seconds_total{mode="idle"}[5m])
      )
    ) > 0.90
  for: 15m
  labels:
    severity: warning
  annotations:
    summary: "CPU utilization is high on {{ $labels.instance }}"
```

Fifteen minutes is appropriate only if the service can tolerate that much CPU contention plus response time. A latency-sensitive service may need a faster symptom alert. A batch worker that is intentionally CPU-bound may need no CPU alert at all.

Page on user-visible latency, errors, missed deadlines, or exhausted quota when possible. High CPU without impact is commonly a capacity ticket or diagnostic alert.

## Memory: Use Headroom and Pressure

Memory failures can accelerate: reclaim increases latency, swapping can amplify I/O, and a limit can end in an OOM kill.

Use available memory:

```promql
node_memory_MemAvailable_bytes
/
node_memory_MemTotal_bytes
```

Example warning:

```yaml
- alert: HostMemoryAvailableLow
  expr: |
    (
      node_memory_MemAvailable_bytes
      /
      node_memory_MemTotal_bytes
    ) < 0.10
  for: 10m
  labels:
    severity: warning
  annotations:
    summary: "Available memory is low on {{ $labels.instance }}"
```

A faster critical rule can require stronger evidence:

```yaml
- alert: HostMemoryPressureCritical
  expr: |
    (
      node_memory_MemAvailable_bytes
      /
      node_memory_MemTotal_bytes
      < 0.05
    )
    and
    (
      rate(node_pressure_memory_waiting_seconds_total[5m])
      > 0.05
    )
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: "Severe memory pressure on {{ $labels.instance }}"
```

The PSI threshold is illustrative. Validate it against application latency and reclaim behavior. A workload whose OOM transition takes less than five minutes needs earlier headroom or trend alerts; shortening `for` after the failure point will not save it.

## Disk Space: Alert on Headroom and Time Remaining

Disk capacity normally changes more slowly, so a forecast is often more valuable than an immediate high-used percentage.

Current headroom:

```promql
node_filesystem_avail_bytes
/
node_filesystem_size_bytes
```

Example current-space warning:

```yaml
- alert: FilesystemAvailableSpaceLow
  expr: |
    (
      node_filesystem_avail_bytes{fstype=~"ext4|xfs"}
      /
      node_filesystem_size_bytes{fstype=~"ext4|xfs"}
      < 0.10
    )
    and
    (
      node_filesystem_avail_bytes{fstype=~"ext4|xfs"}
      < 10 * 1024 * 1024 * 1024
    )
  for: 15m
  labels:
    severity: warning
  annotations:
    summary: "Filesystem space is low on {{ $labels.instance }} {{ $labels.mountpoint }}"
```

Exhaustion forecast:

```promql
predict_linear(
  node_filesystem_avail_bytes{fstype=~"ext4|xfs"}[6h],
  24 * 60 * 60
) < 0
```

Use linear prediction only for stable growth. For a filesystem that can fill in ten minutes during a runaway log storm, a 15-minute current-space delay is unsafe. Add a consumption-rate alert or enforce application-side retention.

## I/O: Require Latency and Queueing

Disk active time can remain high on a healthy parallel device. Prefer sustained service evidence:

```promql
rate(node_disk_io_time_weighted_seconds_total[5m])
```

alongside completion latency:

```promql
(
  rate(node_disk_read_time_seconds_total[5m])
  +
  rate(node_disk_write_time_seconds_total[5m])
)
/
(
  rate(node_disk_reads_completed_total[5m])
  +
  rate(node_disk_writes_completed_total[5m])
)
```

A five-to-ten-minute duration may reject backup and checkpoint bursts, but the threshold and delay must be different for low-latency databases and archival workloads.

## Range Window and `for` Are Different Controls

In:

```yaml
expr: |
  (
    1 -
    avg by (job, instance) (
      rate(node_cpu_seconds_total{mode="idle"}[5m])
    )
  ) > 0.90
for: 15m
```

the five-minute range tells `rate()` how much source data to use for each evaluation. The 15-minute `for` tells Prometheus how long the resulting condition must remain active.

Increasing the rate window smooths and delays the signal itself. Increasing `for` leaves the signal calculation unchanged but waits longer before firing. Tune them separately:

- use the range window to make the measurement meaningful;
- use `for` to reject conditions shorter than the operationally relevant duration.

## Use `keep_firing_for` for Resolution Stability

Prometheus also supports:

```yaml
keep_firing_for: 5m
```

This keeps an already firing alert active for the configured duration after the expression last matched. It can prevent flapping or a false resolution during a short data gap.

It does **not** delay the initial firing and should not hide a real recovery indefinitely:

```yaml
- alert: HostCPUUtilizationHigh
  expr: instance:node_cpu_utilization:ratio5m > 0.90
  for: 15m
  keep_firing_for: 5m
```

Monitor `up` and rule evaluation health separately. `keep_firing_for` is not a substitute for detecting failed scrapes.

## Derive the Duration from an Error Budget

For each alert, answer:

1. How long can this condition persist before user impact or irreversible risk?
2. How much time does the runbook action require?
3. How much delivery and human-response delay should be reserved?
4. How long do harmless occurrences normally last?

Then:

```text
maximum detection delay
  < time to unacceptable impact
    - response and remediation time
    - safety margin
```

If harmless events last longer than the maximum safe delay, duration alone cannot separate them. Add a better signal: workload state, service latency, pressure, growth rate, maintenance mode, or a resource-class label.

## Review Pending Alerts

Do not tune only from pages. Inspect how often rules enter pending state and then recover:

- many short pending events suggest an appropriate `for` or a noisy threshold;
- alerts that fire just before natural recovery may need a longer duration;
- incidents that cause impact while still pending need a shorter delay or a better leading indicator;
- alerts that fire with no runbook action should be downgraded or removed.

Test rule transitions with Prometheus's rule-testing support and replay representative historical data where possible.

## Summary

Start with roughly 10–15 minutes for bursty CPU and disk-space warnings, 5–10 minutes for memory or I/O pressure, then tune from real time-to-impact and transient duration. Account for scrape, evaluation, range-window, and Alertmanager delay. Use `for` for sustained truth, `keep_firing_for` for resolution stability, and faster symptom alerts when users are already affected.

## Official Documentation

- [Prometheus alerting rule `for` and `keep_firing_for` behavior](https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/)
- [Prometheus rule configuration and evaluation behavior](https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/)
- [Prometheus alerting practices](https://prometheus.io/docs/practices/alerting/)
- [The Zen of Prometheus: use `for` and alert on symptoms](https://prometheus.io/docs/practices/the_zen/)
- [Prometheus query functions](https://prometheus.io/docs/prometheus/latest/querying/functions/)
- [Prometheus unit testing for rules](https://prometheus.io/docs/prometheus/latest/configuration/unit_testing_rules/)
