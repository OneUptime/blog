# Calculate Interface Bandwidth Without Spikes After Restarts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, PromQL, Node Exporter, Network Monitoring, Counter, Bandwidth

Description: Convert node_exporter interface byte counters into reliable bandwidth rates while handling resets, scrape gaps, interface churn, and unit conversion correctly.

---

Network byte metrics are cumulative counters, not bandwidth gauges. A raw value such as `node_network_receive_bytes_total = 9.4e12` says how many bytes the interface has counted since its counter began. Bandwidth is the rate at which that counter changes.

The reliable pattern is:

1. calculate a reset-aware rate for each counter series;
2. keep interface and host identity intact;
3. aggregate rates only after that;
4. convert bytes per second to bits per second when needed.

## Start with `rate()`

Receive bandwidth in bytes per second:

```promql
rate(
  node_network_receive_bytes_total{
    device!="lo"
  }[5m]
)
```

Transmit bandwidth:

```promql
rate(
  node_network_transmit_bytes_total{
    device!="lo"
  }[5m]
)
```

Convert to bits per second:

```promql
8
*
rate(
  node_network_receive_bytes_total{
    device!="lo"
  }[5m]
)
```

Prometheus documents `rate()` as the per-second average increase over the selected range. It adjusts for breaks in monotonicity such as target restarts and extrapolates to the range boundaries to tolerate ordinary scrape alignment and missed scrapes.

## Why Raw Subtraction Produces Bad Graphs

This expression is not a safe rate:

```promql
node_network_receive_bytes_total
-
node_network_receive_bytes_total offset 5m
```

After a host or interface restart, the current counter can be smaller than the older value. Raw subtraction becomes negative. Clamping the result to zero hides the symptom but still does not handle boundary alignment, missed scrapes, or multiple samples correctly.

Similarly, `delta()` is intended for gauges. Use `rate()` or `increase()` for counters.

## Choose a Range with Enough Samples

With a 15-second scrape interval, `[5m]` provides many samples and a stable operational graph. With a two-minute scrape interval, `[5m]` may contain only two or three observations. A missed scrape can then remove the result or make it volatile.

Choose a range that:

- is longer than the scrape interval;
- normally contains several observations;
- is short enough for the behavior you need to see;
- matches the alert's required sensitivity.

For a two-minute job, a 10- or 15-minute rate may be more robust:

```promql
rate(node_network_receive_bytes_total[15m])
```

The tradeoff is smoothing. A longer window cannot show a short burst precisely.

## Use `irate()` Only for a Deliberately Volatile View

`irate()` uses the last two data points. Prometheus recommends it for graphing volatile, fast-moving counters and recommends `rate()` for alerts and slower-moving counters.

```promql
8 * irate(node_network_receive_bytes_total{device="bond0"}[5m])
```

This can reveal a recent burst, but it is sensitive to scrape timing. A brief dip can also reset an alert's `for` state. Use a steadier `rate()` expression for alerting.

## Aggregate After Calculating Each Rate

Correct total receive traffic by cluster:

```promql
sum by (cluster) (
  rate(
    node_network_receive_bytes_total{
      device=~"bond0|ens[0-9]+"
    }[5m]
  )
)
```

Do not sum counters first and then call `rate()`:

```promql
# Avoid
rate(
  sum(node_network_receive_bytes_total)[5m:]
)
```

Prometheus's function documentation says to take `rate()` first and aggregate afterward. Otherwise a reset from one target can be hidden by increases from other targets.

## Diagnose Resets Instead of Treating Them as Traffic

Count detected decreases:

```promql
resets(
  node_network_receive_bytes_total{
    device!="lo"
  }[1h]
)
```

A reset can come from:

- host reboot;
- interface recreation or driver reset;
- exporter restart when the underlying source is process-local;
- counter wrap in a narrow source counter;
- an identity-label collision between different interfaces.

Correlate with host boot time:

```promql
changes(node_boot_time_seconds[1h]) > 0
```

and exporter process start:

```promql
changes(process_start_time_seconds{job="node"}[1h]) > 0
```

Do not page merely because `resets()` is nonzero. A planned reboot is expected. Use it as context for suspicious bandwidth graphs and unexpected network-device churn.

## Understand Interface Recreation

Prometheus identifies a series by all of its labels. If an interface is removed and recreated with the same `instance` and `device` labels, it appears to be the same series.

If the new counter starts lower, `rate()` interprets the drop as a reset. If it starts at a higher value than the old interface's last value, no mathematical decrease exists, so the apparent increase can look like traffic.

Reduce this risk by:

- using stable host identity rather than a reused IP address;
- treating frequently recreated `veth` interfaces separately;
- filtering interfaces by operational role;
- retaining a device identity label when your exporter exposes one;
- breaking dashboards at provisioning or replacement events.

PromQL cannot infer that two monotonically increasing values came from different physical interfaces when their label sets are identical.

## Counter Width and Wraparound

Linux exposes standard link statistics through `rtnl_link_stats64` and several user-space interfaces. Prefer a current exporter and a 64-bit source. A narrow counter can wrap quickly on a high-speed link.

A visible decrease is handled as a reset, but samples alone cannot recover:

- traffic between the old value and the counter maximum;
- more than one complete wrap between scrapes;
- the difference between a wrap and a reset.

If the source counter is narrow, shorten the scrape interval enough to avoid multiple wraps and, preferably, replace the collection path with one that exposes 64-bit statistics.

## Avoid Double Counting Network Layers

Summing every `device` is rarely host throughput. A packet can be represented on:

- a physical NIC;
- a bond;
- a VLAN subinterface;
- a bridge;
- one or more virtual Ethernet endpoints.

Choose the layer that represents the question. Use a bond or service-facing interface for host ingress and egress, member NICs for link distribution and errors, and virtual interfaces for workload-level analysis. Do not add them all together.

## Add Link Capacity Separately

Bandwidth and utilization are different:

```text
utilization = observed bits per second / effective link bits per second
```

The denominator must reflect the operational path. A bond may not deliver the arithmetic sum of member speeds for one flow, and duplex traffic may need separate receive and transmit ratios. Treat unknown speed as unknown rather than dividing by a guessed constant.

## Recording Rule Example

```yaml
groups:
  - name: node-network-rates
    interval: 30s
    rules:
      - record: instance_device:node_network_receive_bytes:rate5m
        expr: |
          rate(
            node_network_receive_bytes_total{
              device!~"lo|veth.*|docker.*"
            }[5m]
          )

      - record: instance_device:node_network_transmit_bytes:rate5m
        expr: |
          rate(
            node_network_transmit_bytes_total{
              device!~"lo|veth.*|docker.*"
            }[5m]
          )
```

Validate the exclusion pattern on real hosts; interface names vary.

## Troubleshooting Checklist

1. Confirm the metric is a counter.
2. Use `rate()` for alerting and stable graphs.
3. Ensure the range normally contains several scrapes.
4. Calculate rate before `sum`.
5. Multiply bytes per second by eight only when the display expects bits.
6. Inspect `resets()`, boot time, and interface lifecycle.
7. Check for reused host or device labels.
8. Select one network layer instead of summing physical and virtual devices.
9. Prefer 64-bit kernel statistics on high-speed links.

Restart spikes are usually a query or identity problem, not real terabits of traffic. Preserve the counter's series boundary and let a counter-aware function do the arithmetic.

## Official Documentation

- [Prometheus: Query functions](https://prometheus.io/docs/prometheus/latest/querying/functions/)
- [Prometheus: The Zen of Prometheus](https://prometheus.io/docs/practices/the_zen/)
- [Prometheus: Monitoring Linux host metrics with node_exporter](https://prometheus.io/docs/guides/node-exporter/)
- [node_exporter: netdev collector and filters](https://github.com/prometheus/node_exporter)
- [Linux kernel: Interface statistics](https://docs.kernel.org/networking/statistics.html)
