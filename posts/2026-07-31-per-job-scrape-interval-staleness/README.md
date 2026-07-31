# How to Set Per-Job Scrape Intervals Without Making Alerts Blind to Stale Series

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Scrape Interval, Alerting, PromQL, Staleness, Infrastructure Metrics

Description: Configure different Prometheus scrape intervals safely by aligning range windows, freshness alerts, timeouts, and rule evaluation with each job's collection cadence.

---

Prometheus allows each scrape job to override the global scrape interval. That is useful when a fast availability signal and a slow inventory signal have different cost and freshness needs.

The danger is changing only `scrape_interval`. Queries and alerts still contain assumptions about sample frequency. A five-minute rate, a five-minute absence window, and a two-minute `for` clause mean very different things when one job is scraped every 15 seconds and another every two minutes.

## Configure Jobs Explicitly

```yaml
global:
  scrape_interval: 30s
  scrape_timeout: 10s
  evaluation_interval: 30s

scrape_configs:
  - job_name: node-fast
    scrape_interval: 15s
    scrape_timeout: 10s
    static_configs:
      - targets:
          - host-01.example.net:9100

  - job_name: hardware-inventory
    scrape_interval: 2m
    scrape_timeout: 30s
    static_configs:
      - targets:
          - inventory.example.net:9470
```

Prometheus's configuration reference requires a scrape timeout no greater than the scrape interval. The global values are defaults; job-level values override them.

Document the requirement behind each cadence:

| Job | Interval | Freshness objective | Main use |
| --- | ---: | ---: | --- |
| node-fast | 15s | detect host failure within minutes | paging |
| hardware-inventory | 2m | update inventory within 10 minutes | dashboard |

Cost alone should not determine cadence.

## Make Rate Windows Job-Aware

`rate()` needs multiple counter samples. A range shorter than or barely longer than the interval is fragile.

For a 15-second job:

```promql
rate(node_network_receive_bytes_total{job="node-fast"}[5m])
```

For a two-minute job:

```promql
rate(inventory_events_total{job="hardware-inventory"}[10m])
```

Choose a window that normally includes several samples and tolerates the number of missed scrapes your use case allows. Longer windows smooth more heavily, so do not reuse a slow-job rate for a burst-sensitive alert.

Test the actual sample count:

```promql
count_over_time(
  inventory_events_total{job="hardware-inventory"}[10m]
)
```

Alert when the signal does not have enough observations for the intended calculation.

## Treat Gauge Freshness Separately from Value

A last-known inventory value may remain useful while collection is temporarily delayed:

```promql
last_over_time(
  hardware_asset_count{job="hardware-inventory"}[10m]
)
```

Make its age visible:

```promql
time()
-
max_over_time(
  timestamp(
    hardware_asset_count{job="hardware-inventory"}
  )[10m:30s]
)
```

The subquery preserves source timestamps as values before selecting the newest one. Applying `timestamp()` directly to `last_over_time()` would return the derived sample's evaluation timestamp. Do not let a wide `last_over_time()` silently present an old value as current; use a separate freshness alert.

## Understand `up` and Staleness

Prometheus generates `up` for every configured target at each scrape:

- `1` means the scrape succeeded;
- `0` means the scrape failed.

For the fast job:

```promql
up{job="node-fast"} == 0
```

With a 15-second interval and a rule evaluated every 30 seconds, a short `for` can observe several failures quickly. With a two-minute interval, the same rule may evaluate the unchanged `up` sample many times between scrapes.

When a target is removed from service discovery, its series are marked stale and disappear from later instant queries. That is different from a configured target returning `up == 0`. Monitor expected target inventory so removal cannot evade a scrape-failure alert.

## Size Absence Windows from the Interval

For the two-minute job:

```promql
absent_over_time(
  hardware_asset_count{job="hardware-inventory"}[7m]
)
```

Seven minutes represents roughly three expected opportunities plus margin. Choose it from policy.

Be precise about labels. This broad expression returns empty as long as any target exposes the metric:

```promql
absent_over_time(hardware_asset_count{job="hardware-inventory"}[7m])
```

It cannot identify which expected target vanished. For per-target detection, compare observed targets with a separate expected-target metric or service-discovery inventory.

## Align Alert `for` with Observations

Prometheus evaluates an alert at the rule group's evaluation interval. The `for` duration means the same labeled expression result must remain active across evaluations for that wall-clock duration.

It does not mean “N failed scrapes.”

For reachability:

```yaml
- alert: NodeExporterDown
  expr: up{job="node-fast"} == 0
  for: 2m
```

For a slow collector:

```yaml
- alert: HardwareInventoryScrapeFailing
  expr: up{job="hardware-inventory"} == 0
  for: 6m
```

The second alert permits more than one expected scrape opportunity before firing. If one failure must page immediately, use a fast dedicated health check rather than expecting a slow collection job to provide fast detection.

`keep_firing_for` can prevent a resolved notification from flapping during brief data loss, but it does not repair an expression whose range is too short.

## Do Not Solve Everything with Global Lookback

Instant selectors use a lookback period, five minutes by default. A job slower than that can disappear between successful scrapes.

Prometheus supports changing the lookback delta, but a global increase lets every instant selector accept older samples. Prefer:

- explicit `last_over_time()` for last-known gauges;
- a separate age expression;
- range windows appropriate to each job;
- faster collection for signals that drive rapid pages.

Make staleness policy visible in PromQL instead of hiding it in a server-wide flag.

## Use Separate Jobs for Separate Cadences

A scrape interval belongs to a scrape configuration, not to individual metrics inside one response. If CPU must be scraped every 15 seconds and expensive hardware inventory every five minutes, use:

- separate exporter endpoints;
- separate scrape jobs with collector filtering where the exporter supports it;
- a textfile metric for slowly changing machine-tied state;
- a different collection component.

Do not scrape the same complete endpoint twice at different intervals unless you control duplicate ingestion and label identities. Two jobs create different `job` label sets and double collection for overlapping metrics.

## Monitor the Collection System

Per job, graph:

```promql
scrape_duration_seconds
```

```promql
scrape_samples_scraped
```

```promql
up
```

```promql
time() - timestamp(up)
```

Alert when scrape duration approaches timeout. A job that routinely takes 28 seconds with a 30-second timeout has little safety margin even if it currently succeeds.

Monitor rule execution too. Slow rule groups can miss scheduled evaluations; Prometheus exposes `prometheus_rule_group_iterations_missed_total`.

## Migration Checklist

Before lengthening a job interval:

1. Inventory every alert, recording rule, dashboard, and API query for the job.
2. Expand counter ranges to include enough samples.
3. Define a separate gauge freshness threshold.
4. Recalculate absence windows.
5. Review alert `for` durations in terms of scrape opportunities.
6. Test one failed scrape, repeated failures, and target removal.
7. Confirm instant queries do not depend on a shorter lookback.
8. Verify scrape timeout remains below the interval.
9. Monitor sample savings and detection delay.

Per-job intervals are safe when collection cadence is part of the signal contract. Change the interval, ranges, freshness policy, and alert timing as one reviewed unit.

## Official Documentation

- [Prometheus: Configuration reference](https://prometheus.io/docs/prometheus/latest/configuration/configuration/)
- [Prometheus: Querying basics and staleness](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [Prometheus: Query functions](https://prometheus.io/docs/prometheus/latest/querying/functions/)
- [Prometheus: Alerting rules](https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/)
- [Prometheus: Recording rules](https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/)
