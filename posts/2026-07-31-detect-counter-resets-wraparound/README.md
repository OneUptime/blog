# How to Detect Counter Resets and Wraparound in High-Speed Network Infrastructure Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, PromQL, Network Monitoring, Counters, Node Exporter, Troubleshooting

Description: Detect network counter discontinuities, distinguish likely resets from wraparound, and avoid incorrect rates on high-speed interfaces.

---

Prometheus counters are expected to increase until the process or underlying source resets. Network interfaces complicate that model: a counter can restart when the host boots, the device is recreated, the driver resets, or a narrow hardware counter wraps.

Prometheus can detect a decrease. It cannot determine the physical reason for that decrease from two samples alone.

## Detect Discontinuities with `resets()`

For receive-byte counters:

```promql
resets(
  node_network_receive_bytes_total{
    device!="lo"
  }[1h]
)
```

For packets, errors, or drops:

```promql
resets(node_network_receive_packets_total[1h])
```

```promql
resets(node_network_receive_errs_total[1h])
```

Prometheus defines a reset for a float counter as a decrease between consecutive samples. The function reports how many such decreases occurred in the selected range.

Use the result as diagnostic context:

```yaml
- alert: NetworkCounterFrequentlyResetting
  expr: resets(node_network_receive_bytes_total{device!="lo"}[30m]) > 2
  for: 5m
  labels:
    severity: info
  annotations:
    summary: "Network counter repeatedly reset on {{ $labels.instance }} {{ $labels.device }}"
```

A single reset during a planned reboot is not normally page-worthy. Repeated resets without a known lifecycle event can indicate interface churn or a driver problem.

## Correlate with Lifecycle Evidence

Host reboot:

```promql
changes(node_boot_time_seconds[1h]) > 0
```

Exporter restart:

```promql
changes(process_start_time_seconds{job="node"}[1h]) > 0
```

Target availability:

```promql
min_over_time(up{job="node"}[1h]) == 0
```

Interpret combinations:

| Counter decrease | Boot changed | Exporter start changed | Likely investigation |
| --- | --- | --- | --- |
| yes | yes | usually yes | host reboot |
| yes | no | no | interface or driver reset, recreation, or wrap |
| yes | no | yes | exporter restart; verify whether source is kernel-persistent |
| many decreases | no | no | narrow counter, unstable interface, or identity collision |

This is evidence, not proof. Kernel network counters can persist across an exporter restart, while some other exporters expose process-local counters.

## Let `rate()` Handle Ordinary Resets

Use:

```promql
rate(node_network_receive_bytes_total[5m])
```

Prometheus adjusts for breaks in monotonicity when calculating `rate()` and `increase()`. Do not replace it with:

```promql
clamp_min(
  node_network_receive_bytes_total
  -
  node_network_receive_bytes_total offset 5m,
  0
)
```

Clamping removes negative output but does not reconstruct counter behavior or handle scrape alignment.

Always calculate the rate per series before aggregation:

```promql
sum by (cluster) (
  rate(node_network_receive_bytes_total[5m])
)
```

If counters are summed first, a reset from one interface can be masked by growth on another.

## What Reset Adjustment Can and Cannot Recover

For a normal reset to zero, a counter-aware function can treat the post-reset value as new activity. It still has only sampled observations, so precision is bounded by the scrape interval.

For a fixed-width counter wrapping from its maximum back to zero, Prometheus sees the same shape: a decrease. It does not know the counter width. It therefore cannot reconstruct:

- bytes between the last pre-wrap sample and the maximum;
- more than one wrap between two scrapes;
- whether a decrease was a wrap, reboot, or device recreation.

The correct fix for high-speed links is to collect a sufficiently wide source counter, not to guess the modulus in a generic PromQL expression.

## Why 32-Bit Counters Fail Quickly

A 32-bit octet counter wraps after `2^32` bytes, about 4.29 GB.

Approximate wrap times at sustained line rate:

| Rate | Approximate wrap time |
| --- | ---: |
| 100 Mb/s | 5.7 minutes |
| 1 Gb/s | 34 seconds |
| 10 Gb/s | 3.4 seconds |
| 100 Gb/s | 0.34 seconds |

At 10 Gb/s, a 15-second scrape can miss several complete 32-bit wraps. No query can infer how many occurred.

Linux's standard modern link-statistics interface uses `rtnl_link_stats64`. Use a current collection path that reads 64-bit statistics. For network devices accessed through SNMP, prefer 64-bit high-capacity counters where the device and exporter support them.

## Recognize Identity Collisions

A new device can inherit the same series labels:

```text
instance="10.0.1.20:9100", device="eth0"
```

If autoscaling assigns that address to a replacement host, or an interface is recreated under the same name, Prometheus sees one apparent identity. A lower starting value looks like a reset. A higher starting value can look like a huge increase because there is no decrease at all.

Preserve:

- an immutable cloud instance or machine identifier;
- a stable cluster identifier;
- the logical interface role;
- a device identity where available.

Do not use an IP address as the only host identity in an autoscaled fleet.

## Watch the Collection Path

Linux documents several sources for interface statistics:

- rtnetlink, the preferred standard interface;
- `/proc/net/dev`, a historical combined view;
- sysfs files for individual standard counters;
- ethtool for driver-defined and protocol-specific statistics.

Different sources and drivers can have different update timing or semantics. Compare:

```bash
ip -s -s link show dev eth0
ethtool -S eth0
```

with the exporter's `/metrics` output. If only the exporter series jumps, investigate exporter parsing and label identity. If the kernel view resets too, investigate the device lifecycle and driver.

## Build a Discontinuity Dashboard

Show, per host and interface:

- `rate()` of bytes, packets, errors, and drops;
- `resets()` over one and 24 hours;
- host boot time;
- exporter process start time;
- `up` and scrape duration;
- link operational state;
- provisioning and interface-change events.

Annotate reboots and deploys. A spike is much easier to classify when its lifecycle context is visible.

## Test the Expected Cases

In a non-production environment:

1. record a steady transfer;
2. restart node_exporter without rebooting;
3. bring the interface down and up;
4. recreate a disposable virtual interface;
5. reboot the host;
6. replace a test VM while reusing its address;
7. inspect `rate()` and `resets()` after each event.

This establishes what your kernel, driver, exporter version, and identity model actually do.

## Practical Rules

- Use counter types for cumulative traffic.
- Use `rate()` for bandwidth and `resets()` for discontinuities.
- Rate first, aggregate second.
- Prefer 64-bit source counters.
- Shorten scrapes only when the source width requires it; this does not fix identity reuse.
- Correlate decreases with boot, exporter, target, and interface events.
- Treat a higher starting counter on a reused label as an identity problem.
- Do not infer a counter modulus unless the collection protocol explicitly defines it.

Prometheus can make counter resets safe for ordinary rate calculations. Accurate wraparound recovery, however, begins at the source with wide counters and unambiguous series identity.

## Official Documentation

- [Prometheus: Query functions (`rate`, `increase`, and `resets`)](https://prometheus.io/docs/prometheus/latest/querying/functions/)
- [Prometheus: Recording rule best practices](https://prometheus.io/docs/practices/rules/)
- [Prometheus: Metric and label instrumentation practices](https://prometheus.io/docs/practices/instrumentation/)
- [Linux kernel: Interface statistics](https://docs.kernel.org/networking/statistics.html)
- [node_exporter documentation](https://github.com/prometheus/node_exporter)
