# Why Does a Prometheus Instant Query Return No Data for Slowly Scraped Infrastructure Metrics?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, PromQL, Infrastructure Metrics, Scrape Interval, Staleness, Troubleshooting

Description: Understand why slowly scraped metrics disappear from Prometheus instant queries and choose query windows that preserve freshness without hiding missing data.

---

An instant query does not mean “find the last value ever stored.” It evaluates an expression at one timestamp. For an instant-vector selector, Prometheus looks backward for the newest eligible sample, but only within its lookback period and only if the series has not been marked stale.

That distinction matters when an infrastructure job is scraped every 10 or 15 minutes. Prometheus's default lookback period is five minutes. A healthy series can therefore be present immediately after a scrape and absent from the same instant query six minutes later.

## Reproduce the Gap

Consider a deliberately slow inventory job:

```yaml
scrape_configs:
  - job_name: node-inventory
    scrape_interval: 10m
    scrape_timeout: 30s
    static_configs:
      - targets:
          - inventory-exporter.example.net:9470
```

Suppose `infrastructure_asset_info` was scraped at 12:00. With the default five-minute lookback:

| Query time | Newest sample | Plain instant selector |
| --- | --- | --- |
| 12:04 | 12:00 | returns the series |
| 12:06 | 12:00 | returns no series |
| 12:10 | 12:10 | returns the series again |

The data has not been deleted. It is simply too old to satisfy the instant selector at 12:06.

Confirm the configured values instead of assuming them:

```bash
curl -s http://prometheus.example.net:9090/api/v1/status/flags
curl -s http://prometheus.example.net:9090/api/v1/status/config
```

Check the effective `query.lookback-delta`, the job's `scrape_interval`, and whether the target is currently healthy.

## Use an Explicit Range for “Last Known Value”

For a slowly changing gauge or info metric, state the intended tolerance in the query:

```promql
last_over_time(infrastructure_asset_info{job="node-inventory"}[25m])
```

The 25-minute window allows two missed 10-minute opportunities plus some scheduling margin. It is a policy choice, not a universal constant.

Make age visible beside the value:

```promql
time()
-
max_over_time(
  timestamp(
    infrastructure_asset_info{job="node-inventory"}
  )[25m:1m]
)
```

The subquery evaluates `timestamp()` through the range and `max_over_time()` keeps the newest source timestamp. Applying `timestamp()` directly to the result of `last_over_time()` would report the derived sample's evaluation timestamp, not the original observation time.

Now a dashboard can display the last observation while an alert checks whether it is acceptably fresh:

```yaml
- alert: InfrastructureInventoryMetricStale
  expr: |
    time()
      - max_over_time(
          timestamp(
            infrastructure_asset_info{job="node-inventory"}
          )[25m:1m]
        )
      > 900
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "Infrastructure inventory data is more than 15 minutes old"

- alert: InfrastructureInventoryMetricMissing
  expr: |
    group by (job, instance) (
      present_over_time(
        up{job="node-inventory"}[25m]
      )
    )
    unless on (job, instance)
    group by (job, instance) (
      present_over_time(
        infrastructure_asset_info{job="node-inventory"}[25m]
      )
    )
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "Infrastructure inventory metric is missing from {{ $labels.instance }}"
```

Choose the range so it is longer than the normal scrape interval. Choose the age threshold from the operational freshness requirement.

The age expression eventually returns an empty vector once its subquery can no longer retrieve a source sample. Because the instant selector at each subquery step uses the ordinary lookback, it can remain present for almost one additional lookback period beyond the nominal subquery range. Without the separate missing rule, a firing stale alert would then resolve even though collection had not recovered. The `group by` expression treats every target with an `up` sample in the range as expected regardless of whether its latest scrape succeeded, then reports targets with no metric sample in the range. A target removed from service discovery eventually loses `up` from that range too, so detecting that case still requires the independent expected-target inventory described below.

## Do Not Apply Gauge Logic Blindly to Counters

`last_over_time()` is appropriate when the question really is “what was the last observed gauge value?” It does not calculate a counter's rate.

For counters, use a range large enough to contain multiple samples:

```promql
rate(infrastructure_events_total{job="node-inventory"}[30m])
```

A range shorter than the scrape interval frequently contains fewer than two samples, so a rate cannot be calculated. Also remember that a 30-minute rate intentionally smooths events over 30 minutes; it is not equivalent to a frequently scraped signal.

## Distinguish Four Different “No Data” Cases

### The newest sample is outside lookback

The target is healthy and the series reappears after each slow scrape. An explicit range query solves the display requirement.

### The scrape failed

Prometheus writes `up` for every scrape attempt. Because a slowly scraped job's `up` series has the same lookback gap, inspect its last result over an explicit range:

```promql
last_over_time(up{job="node-inventory"}[25m]) == 0
```

Inspect the target page and scrape error. Do not increase lookback as a response: for ordinary scrape-timestamped series, the failed scrape marks the old application series stale, and a larger lookback does not override that marker. In cases where staleness markers are not tracked, a larger lookback can instead make an old value look current.

### The target or metric disappeared

When a target is removed, or a successful scrape no longer exposes a previously returned series, Prometheus marks affected series stale. Queries after the stale marker do not return the old value merely because it is inside the ordinary lookback window.

Use service-discovery and metric-presence alerts for this case:

```promql
absent_over_time(infrastructure_asset_info{job="node-inventory"}[25m])
```

Be careful with fleet-wide absence expressions: one remaining host can make a broad selector nonempty. Compare against an inventory of expected hosts when per-host identity matters.

### The exporter supplies explicit timestamps

Exporters normally let Prometheus timestamp samples at scrape time. Exporters that attach their own timestamps have different staleness behavior unless `track_timestamps_staleness` is enabled in the scrape configuration. Check the exposition and configuration before diagnosing an unexpected last value.

## Should You Increase the Global Lookback?

Prometheus supports changing `--query.lookback-delta`, and the query API can accept a `lookback_delta` parameter. Increasing it globally is usually a broad solution to a narrow problem:

- every plain instant selector may accept older data;
- dashboards can make delayed collection, or failures without tracked staleness, look healthy;
- alert expressions may retain values longer than their authors intended;
- the new behavior applies to fast and slow jobs alike.

Prefer explicit range functions for the small number of slow metrics. If nearly every job is deliberately slower than five minutes, a larger server-wide lookback may be reasonable, but review freshness-sensitive alerts first.

## Avoid `or vector(0)` as a Data-Freshness Fix

This expression is tempting:

```promql
infrastructure_asset_info or vector(0)
```

When the selector is empty, this returns an unlabeled zero. When labeled series are present, the unmatched zero can also appear alongside them. It does not preserve a missing host's labels, and it turns “unknown” into a numeric measurement. Zero might mean no assets, a failed exporter, a removed target, or an old sample. Those are different states.

Keep value and availability separate:

```promql
last_over_time(infrastructure_asset_info[25m])
```

```promql
last_over_time(up{job="node-inventory"}[25m])
```

```promql
absent_over_time(infrastructure_asset_info{job="node-inventory"}[25m])
```

## A Practical Checklist

1. Verify the query evaluation time and time zone.
2. Check the job's effective scrape interval and timeout.
3. Check `up`, the target's last scrape, and its last error.
4. Find the latest stored sample with a range query.
5. Decide whether the metric is a gauge, counter, or info metric.
6. Set an explicit range and a separate freshness threshold.
7. Test target removal and scrape failure, not only the healthy path.
8. Document why this job is scraped slowly; increasing the interval trades away detection resolution.

Slowly scraped metrics are not inherently broken. The bug is usually an unstated query assumption. Make “last known,” “fresh enough,” and “currently collectible” three explicit concepts, and the gaps become predictable.

## Official Documentation

- [Prometheus: Querying basics and staleness](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [Prometheus: Query functions](https://prometheus.io/docs/prometheus/latest/querying/functions/)
- [Prometheus: Configuration reference](https://prometheus.io/docs/prometheus/latest/configuration/configuration/)
- [Prometheus: HTTP API](https://prometheus.io/docs/prometheus/latest/querying/api/)
