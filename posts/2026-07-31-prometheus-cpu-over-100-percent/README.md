# Why Prometheus CPU Metrics Can Exceed 100%: Cores, Rates, and Aggregation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Node Exporter, Linux, CPU Metrics, PromQL, Infrastructure Monitoring

Description: Understand why Prometheus CPU queries can report more than 100%, then choose deliberately between core usage, host utilization, and fleet aggregation.

---

A CPU value above 100% is not necessarily an error. It often means that the query is reporting **CPU cores consumed**, then formatting that number as a percentage.

On an eight-logical-CPU host:

- `1.0` CPU-second per second means one logical CPU is fully occupied;
- `4.0` means the workload is consuming the equivalent of four logical CPUs;
- multiplying `4.0` by 100 produces `400%`;
- normalizing the same usage by all eight CPUs produces `50%` host utilization.

Both results can be correct. The problem begins when a dashboard labels one interpretation as the other.

## What `node_cpu_seconds_total` Measures

On Linux, the node exporter reads the per-CPU accounting fields exposed through `/proc/stat`. It exports them as:

```text
node_cpu_seconds_total{cpu="0",mode="user"}
node_cpu_seconds_total{cpu="0",mode="system"}
node_cpu_seconds_total{cpu="0",mode="idle"}
...
```

Each series is a counter of seconds accumulated by one logical CPU in one mode. The `cpu` label refers to a logical CPU, not necessarily a physical package or core. Simultaneous multithreading can expose two logical CPUs for one physical core.

Because this is a counter, query it with `rate()` over a range:

```promql
rate(node_cpu_seconds_total{mode="user"}[5m])
```

Prometheus defines `rate()` as the average per-second increase over the selected range and adjusts for counter resets. For a single logical CPU, a rate near `1` means about one CPU-second of that mode was accumulated per wall-clock second.

Do not graph the raw counter as utilization. It is the total CPU time accumulated since boot, not a current percentage.

## Three Useful CPU Views

### 1. Cores consumed

Sum the non-idle rates across CPUs:

```promql
sum by (job, instance) (
  rate(
    node_cpu_seconds_total{
      mode!~"idle|guest|guest_nice"
    }[5m]
  )
)
```

A result of `3.6` means the host accumulated non-idle and I/O-wait accounting at the equivalent of 3.6 logical CPUs during the window. Display it as **cores**, not percent.

The guest modes are excluded because Linux already includes guest time in the `user` and `nice` fields; adding guest fields from an exporter that places them in the same mode-labeled family would double count it. Current node exporter releases publish guest accounting separately as `node_cpu_guest_seconds_total`, so the extra negative matchers have no effect on their `node_cpu_seconds_total` series. This common definition includes `iowait` because it is otherwise the complement of idle. Linux's own documentation warns that I/O-wait accounting is not a reliable measure of CPU execution: a CPU does not literally wait for I/O, and the reported value can change in unintuitive ways. If the question is specifically “how much CPU executed work?”, select the execution modes instead:

```promql
sum by (job, instance) (
  rate(node_cpu_seconds_total{
    mode=~"user|nice|system|irq|softirq"
  }[5m])
)
```

Keep `steal` visible separately on virtual machines. It is time in which the guest wanted CPU but the hypervisor ran something else, not application work completed by the guest.

### 2. Percent of one host's logical CPU capacity

Average the idle rate over all logical CPUs and subtract it from one:

```promql
100 * (
  1 -
  avg by (job, instance) (
    rate(node_cpu_seconds_total{mode="idle"}[5m])
  )
)
```

This result is normally interpreted on a 0–100 scale for each host. The average performs the normalization: a fully busy 2-CPU host and a fully busy 64-CPU host both report approximately 100%.

An equivalent form makes the numerator and denominator explicit:

```promql
100 *
sum by (job, instance) (
  rate(
    node_cpu_seconds_total{
      mode!~"idle|guest|guest_nice"
    }[5m]
  )
)
/
count by (job, instance) (
  node_cpu_seconds_total{mode="idle"}
)
```

The denominator counts the logical CPUs currently exported for the target. Retain both `job` and `instance` if an instance label might appear in more than one scrape job.

### 3. Fleet CPU consumption

Summing host percentages is rarely meaningful:

```promql
# Avoid treating this as a percentage.
sum(
  100 * (
    1 -
    avg by (job, instance) (
      rate(node_cpu_seconds_total{mode="idle"}[5m])
    )
  )
)
```

Ten hosts at 60% produce `600`, but that number is neither a host percentage nor a capacity-weighted fleet percentage.

For total cores consumed, sum the per-host numerator:

```promql
sum(
  rate(
    node_cpu_seconds_total{
      mode!~"idle|guest|guest_nice"
    }[5m]
  )
)
```

For a capacity-weighted fleet percentage, divide total non-idle CPU rate by the number of logical CPUs:

```promql
100 *
sum(
  rate(
    node_cpu_seconds_total{
      mode!~"idle|guest|guest_nice"
    }[5m]
  )
)
/
count(
  node_cpu_seconds_total{mode="idle"}
)
```

Add stable grouping labels such as `cluster` or `region` to both aggregations when calculating separate fleet ratios.

## Why a Panel Unexpectedly Shows 400%

Check these causes in order:

1. **The query returns cores, but the panel applies percent formatting.** A value of `4` becomes `400%`.
2. **The query multiplies by 100 and the visualization also converts a ratio to percent.** A ratio of `0.8` can be displayed as `8000%`.
3. **The query sums logical CPUs without dividing by their count.** That intentionally uses an N-core scale.
4. **The query sums hosts.** Four separate 75% host values add to 300%.
5. **The aggregation drops too many labels.** An expression such as `sum(rate(...))` may combine environments, clusters, or duplicate scrape jobs.
6. **Different products use different conventions.** Process and container CPU commonly use the “cores consumed” convention, where 100% means one core. A host overview commonly uses 100% to mean all host CPU capacity.

Inspect the raw query result in Prometheus's table view before changing panel units. The labels reveal whether the result represents a CPU, a host, or an entire fleet.

## Container CPU Has the Same Unit Question

A typical container counter such as `container_cpu_usage_seconds_total` also becomes CPU-seconds per second after `rate()`:

```promql
sum by (cluster, namespace, pod, container) (
  rate(container_cpu_usage_seconds_total{container!=""}[5m])
)
```

A result of `1.7` means 1.7 cores consumed. Multiplying by 100 gives 170% of one core. It does **not** mean 170% of the node.

To report percent of a container limit, divide by the container's effective CPU quota or limit using metrics from the same collector and with compatible labels. Do not divide blindly by the host's CPU count: a two-core container limit on a 64-core node has a very different saturation point.

## Build an Alert with an Explicit Denominator

This rule alerts when a host uses more than 90% of its exported logical CPU capacity for 15 minutes:

```yaml
groups:
  - name: host-cpu
    rules:
      - alert: HostCPUUtilizationHigh
        expr: |
          (
            sum by (job, instance) (
              rate(
                node_cpu_seconds_total{
                  mode!~"idle|guest|guest_nice"
                }[5m]
              )
            )
            /
            count by (job, instance) (
              node_cpu_seconds_total{mode="idle"}
            )
          ) > 0.90
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "CPU utilization is high on {{ $labels.instance }}"
```

Use a ratio in the rule and format it as a percentage only in the annotation or dashboard. This avoids hidden unit conversion.

CPU usage by itself is usually a diagnostic or capacity signal. Before paging, correlate it with user-visible latency, errors, run-queue pressure, or an exhausted CPU quota. Prometheus's alerting guidance recommends paging on actionable symptoms and allowing slack for brief blips.

## Validate a CPU Query

For every CPU expression, write down:

- **numerator:** CPU-seconds per second, idle fraction, or another quantity;
- **denominator:** one core, all logical CPUs on a host, a quota, or fleet capacity;
- **aggregation boundary:** CPU, host, cluster, or fleet;
- **output unit:** cores, a 0–1 ratio, or a 0–100 percentage;
- **window:** long enough to smooth scrape jitter but short enough for the response objective.

Then test the expression on a host with a known CPU count. A single busy thread should produce roughly one core consumed, about 25% on a four-CPU host, and about 12.5% on an eight-CPU host.

## Summary

Prometheus CPU rates can exceed 100% because CPU time is additive across logical CPUs. A rate of one is one core's worth of time, not automatically 100% of a machine. Use a sum when the desired unit is cores, divide by logical CPU count when the desired unit is host capacity, and aggregate numerators and denominators separately for a fleet. Label the result with its real unit so the dashboard cannot silently change its meaning.

## Official Documentation

- [Linux kernel documentation for `/proc/stat` CPU accounting](https://docs.kernel.org/filesystems/proc.html#miscellaneous-kernel-statistics-in-proc-stat)
- [Prometheus `rate()` and other query functions](https://prometheus.io/docs/prometheus/latest/querying/functions/)
- [Prometheus aggregation operators](https://prometheus.io/docs/prometheus/latest/querying/operators/)
- [Prometheus node exporter CPU collector source](https://github.com/prometheus/node_exporter/blob/master/collector/cpu_linux.go)
- [Prometheus alerting practices](https://prometheus.io/docs/practices/alerting/)
