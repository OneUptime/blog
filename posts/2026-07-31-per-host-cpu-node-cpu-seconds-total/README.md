# Calculate Per-Host CPU from `node_cpu_seconds_total` Correctly

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, PromQL, Node Exporter, CPU, Linux, Infrastructure Monitoring

Description: Calculate a labeled per-host non-idle CPU ratio correctly, preserve counter-reset handling, and avoid averaging across modes or machines.

---

The reliable starting point for per-host CPU usage is:

```promql
100 * (
  1 -
  avg by (job, instance) (
    rate(node_cpu_seconds_total{mode="idle"}[5m])
  )
)
```

This calculates the percentage of observed logical-CPU time that was not reported as `idle` over five minutes, separately for every `job` and `instance`.

The formula is short. Understanding its labels, counter semantics, and definition of “usage” is what keeps the result from becoming a misleading fleet average.

## Understand the Metric Shape

On Linux, Node Exporter reads per-CPU accounting from `/proc/stat`. After Prometheus scrapes a target, a `node_cpu_seconds_total` series normally has these dimensions:

```text
job
instance
cpu
mode
```

Node Exporter supplies `cpu` and `mode`; Prometheus normally attaches `job` and `instance` when it scrapes the target.

Typical modes include:

- `user`;
- `nice`;
- `system`;
- `idle`;
- `iowait`;
- `irq`;
- `softirq`;
- `steal`.

The counter value is cumulative seconds in that mode. A raw value such as:

```text
node_cpu_seconds_total{instance="db-1:9100",cpu="3",mode="idle"} 932481.7
```

is time since boot or the exporter’s accounting continuity, not current utilization. Calculate a rate over a range.

Current Node Exporter exposes guest time separately as `node_cpu_guest_seconds_total`; its source notes that guest time is already accounted in user and nice CPU statistics. Do not add guest time to user time when building a mode sum.

## Calculate Each CPU’s Idle Fraction First

Prometheus `rate()`:

- calculates the average per-second increase over the range;
- adjusts for counter resets;
- extrapolates to the range boundaries.

For one logical CPU:

```promql
rate(
  node_cpu_seconds_total{
    job="node",
    instance="db-1:9100",
    cpu="3",
    mode="idle"
  }[5m]
)
```

A result near `0.72` means that logical CPU accumulated about 0.72 idle seconds per wall-clock second during the window: roughly 72% idle for that interval.

Prometheus documentation says to apply `rate()` before aggregation. If you aggregate counters first, a reset or hot-plug change in one series can be hidden from `rate()`.

## Average Across CPUs Within Each Host

Now remove only the `cpu` dimension:

```promql
avg by (job, instance) (
  rate(node_cpu_seconds_total{mode="idle"}[5m])
)
```

If a four-CPU host has idle rates:

```text
cpu0  0.80
cpu1  0.70
cpu2  0.60
cpu3  0.90
```

the average idle fraction is:

```text
(0.80 + 0.70 + 0.60 + 0.90) / 4 = 0.75
```

The host’s non-idle fraction is:

```text
1 - 0.75 = 0.25
```

Multiplying by 100 gives 25%.

Hosts with different CPU counts remain comparable as a share of each host’s observed logical-CPU time. The query reports a normalized share, not a total. A 25% result corresponds to approximately one core-equivalent of non-idle accounting on a four-CPU host and eight on a 32-CPU host.

## Preserve Every Host-Identity Label You Need

In a simple Prometheus setup, `job` and `instance` may uniquely identify a target. In a multi-cluster system, the same pair can appear in more than one tenant, environment, or Prometheus replica.

Preserve the real uniqueness boundary:

```promql
100 * (
  1 -
  avg by (cluster, job, instance) (
    rate(node_cpu_seconds_total{mode="idle"}[5m])
  )
)
```

Use only labels that actually exist in your data. Inspect the result in Prometheus table view.

Do not group by display-only labels that can change unexpectedly. Prefer stable target identity through service discovery and relabeling. The default `instance` often includes a port; map it to a hostname in presentation or join carefully with an information metric rather than assuming string formats.

## Know What `1 - idle` Includes

This formula is best named **non-idle CPU share**, because the complement includes:

- user and nice execution;
- kernel execution;
- interrupt handling;
- `iowait`;
- steal time.

Linux kernel documentation warns that `/proc/stat` `iowait` is not a reliable direct measure of CPU waiting: tasks waiting for I/O are not running on a CPU, assigning that wait on multicore systems is difficult, and the counter can decrease.

On virtual machines, `steal` is capacity taken by the hypervisor rather than useful guest execution.

Keep the headline calculation simple, then show a per-mode breakdown:

```promql
100 *
avg by (job, instance, mode) (
  rate(node_cpu_seconds_total[5m])
)
```

This returns the average share for each mode on each host. Do not sum `node_cpu_guest_seconds_total` into it; guest accounting is already included in user/nice time.

If your organization defines utilization differently-for example, excluding `iowait` or reporting steal separately-name and document that convention. Do not label two different formulas “CPU usage” on adjacent dashboards.

## Avoid These Misleading Queries

### Averaging every mode

```promql
avg by (job, instance) (
  rate(node_cpu_seconds_total[5m])
)
```

This averages CPUs and modes together. Because CPU time is distributed among the modes, the result tends toward the reciprocal of the number of exported modes rather than host utilization.

Filter to `mode="idle"` before taking the complement, or deliberately sum a documented set of modes.

### Dropping the host labels

```promql
100 * (
  1 - avg(rate(node_cpu_seconds_total{mode="idle"}[5m]))
)
```

This collapses every CPU on every selected target into one fleet-wide value. A large healthy fleet can hide one saturated database host.

### Summing non-idle modes without normalizing

```promql
100 * sum by (instance) (
  rate(node_cpu_seconds_total{mode!="idle"}[5m])
)
```

This returns CPU-seconds per second multiplied by 100 and scales with the number of logical CPUs. It can legitimately exceed 100, so it is not a host percentage. It also mixes `iowait` and steal into the total.

If you want the non-idle CPU-seconds-per-second total, omit the multiplication by 100 and name the unit explicitly. Choose a documented set of modes if you intend to measure execution rather than the full non-idle complement.

### Aggregating before `rate()`

```promql
rate(
  sum by (job, instance) (node_cpu_seconds_total{mode="idle"})[5m]
)
```

Besides requiring subquery syntax in this shape, aggregation before rate prevents Prometheus from reliably seeing resets in the individual counters. Rate first, aggregate second.

### Using `irate()` for a paging rule

`irate()` uses the last two samples and is useful for graphing highly volatile counters. Prometheus recommends `rate()` for alerts and slow-moving counters because brief changes can make alert `for` behavior unstable.

### Averaging percentages across hosts

```promql
avg(
  100 * (1 - avg by (instance) (...))
)
```

An unweighted average answers “what is the average host percentage?” A CPU-weighted fleet capacity question is different. Keep the per-host series for alerting, and define fleet capacity calculations separately.

## Record the Expression

For a frequently used query:

```yaml
groups:
  - name: node-cpu
    rules:
      - record: job_instance:node_cpu_non_idle:ratio_rate5m
        expr: |
          1 -
          avg by (job, instance) (
            rate(node_cpu_seconds_total{mode="idle"}[5m])
          )
```

The recording rule stores a 0–1 ratio. Multiply by 100 only for a percentage display:

```promql
100 * job_instance:node_cpu_non_idle:ratio_rate5m
```

If cluster or tenant labels are required for uniqueness, preserve them in the expression and reflect them in the aggregation level of the recording-rule name.

## Keep a Per-CPU View

A host average can hide affinity or a single-thread bottleneck:

```promql
100 * (
  1 -
  rate(node_cpu_seconds_total{mode="idle"}[5m])
)
```

This retains `cpu`. To find the busiest logical CPU per host:

```promql
max by (job, instance) (
  100 * (
    1 -
    rate(node_cpu_seconds_total{mode="idle"}[5m])
  )
)
```

Compare average and maximum. One CPU near 100% with a modest host average can matter for pinned interrupts or single-threaded work.

## Handle Missing and Changing Series

The utilization query returns nothing when idle series are absent. It does not automatically turn an exporter outage into 0% CPU.

Monitor separately:

- `up` for scrape success;
- expected target count;
- Node Exporter collector errors;
- CPU count changes;
- stale targets;
- label churn.

Node Exporter removes offline CPUs from its collector output. A hot-plug event can change the set being averaged. That may be correct for current online capacity, but annotate or investigate unexpected changes.

If Node Exporter runs in a container, its documentation requires access to the host namespaces and root filesystem configuration for host monitoring. Verify that the target actually represents the host rather than the container.

## Validate the Result

### Inspect labels

Run each stage in table view:

```promql
node_cpu_seconds_total{mode="idle"}
```

```promql
rate(node_cpu_seconds_total{mode="idle"}[5m])
```

```promql
avg by (job, instance) (
  rate(node_cpu_seconds_total{mode="idle"}[5m])
)
```

Confirm that the final result has one series per intended host.

### Count observed CPUs

```promql
count by (job, instance) (
  node_cpu_seconds_total{mode="idle"}
)
```

Compare with the host’s expected online logical CPU count.

### Compare the mode total

Under stable accounting, the per-host sum of `node_cpu_seconds_total` mode rates divided by observed CPUs should be roughly one. Scrape gaps, hot-plug events, and the documented `iowait` behavior can disturb the check.

### Generate controlled load

On a safe test host, exercise:

- one busy worker;
- all logical CPUs;
- an idle interval;
- exporter restart;
- CPU hot-plug if the platform supports it.

Confirm expected host average, per-CPU view, reset handling, and recovery.

## Alert on Consequence, Not the Percentage Alone

A high non-idle ratio can be healthy for batch work. For paging, correlate with:

- CPU PSI or runnable queue;
- latency or deadline misses;
- insufficient scheduling headroom;
- inability to scale;
- a safe responder action.

Use the per-host percentage for capacity and diagnosis. Page only when the combined condition is urgent, important, actionable, and real.

## Official Documentation

- [Prometheus: Getting Started and the `node_cpu_seconds_total` Recording Rule](https://prometheus.io/docs/prometheus/latest/getting_started/)
- [Prometheus: Query Functions (`rate` and `irate`)](https://prometheus.io/docs/prometheus/latest/querying/functions/)
- [Prometheus: Aggregation Operators](https://prometheus.io/docs/prometheus/latest/querying/operators/)
- [Prometheus Node Exporter](https://github.com/prometheus/node_exporter)
- [Prometheus Node Exporter: Linux CPU Collector Source](https://github.com/prometheus/node_exporter/blob/master/collector/cpu_linux.go)
- [Linux Kernel: `/proc/stat` CPU Accounting](https://docs.kernel.org/filesystems/proc.html)
