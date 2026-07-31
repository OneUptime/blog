# What Is the Right Scrape Interval for Host Metrics?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Node Exporter, Scrape Interval, Host Metrics, Monitoring Architecture

Description: Select host-metric scrape intervals from detection objectives, signal behavior, exporter duration, query windows, and storage cost.

---

For many production Linux hosts, **15 to 30 seconds** is a sensible starting range. It gives CPU, memory pressure, disk, and network alerts enough resolution for operational response without assuming that every environment needs five-second collection.

That range is a recommendation, not a Prometheus default. Current Prometheus configuration documentation gives the global `scrape_interval` a default of one minute. The official node exporter guide uses 15 seconds in its example.

Choose deliberately:

| Host-metric use case | Starting interval |
| --- | ---: |
| Latency-sensitive production alerting | 15s |
| General production infrastructure | 30s |
| Cost-sensitive capacity monitoring | 60s |
| Very fast incident experiments | 5–10s, only after load testing |
| Slow inventory or expensive optional collectors | 2–5m in a separate job |

The right value is the slowest interval that still meets the detection and diagnostic objective.

## Configure Intervals Per Scrape Job

Global default:

```yaml
global:
  scrape_interval: 30s
  scrape_timeout: 10s
```

Per-job override:

```yaml
scrape_configs:
  - job_name: node
    scrape_interval: 15s
    scrape_timeout: 10s
    static_configs:
      - targets:
          - node-a.example.com:9100
          - node-b.example.com:9100
```

Prometheus requires the scrape timeout not to exceed the scrape interval. Leave enough margin that collection normally finishes well before the next scheduled scrape.

Do not set timeout equal to interval as a routine default. A scrape that regularly consumes the whole period has no safety margin for CPU pauses, filesystem stalls, network delay, or a newly enabled collector.

## Start from the Detection Objective

Suppose the monitoring objective is to notify within two minutes of sustained memory pressure.

With a 60-second scrape interval and a 60-second evaluation interval, alignment alone can consume a material part of that budget. A 15-second scrape provides more observations and earlier visibility, but a `for: 5m` rule still cannot meet a two-minute objective.

Budget the whole path:

```text
source change
  -> exporter observation
  -> next scrape
  -> rule evaluation
  -> `for` duration
  -> Alertmanager delivery
```

The scrape interval is only one term.

For slow disk-capacity planning, a one-minute sample may be entirely adequate. For short CPU throttling or pressure episodes that affect a latency-sensitive service, one minute may hide important shape.

## Gauges and Counters Behave Differently

A gauge such as available memory is observed only at scrape times. A spike that begins and ends between two scrapes can be missed completely.

A counter such as network bytes or CPU seconds preserves cumulative increase as long as it does not reset, so the next scrape still includes the total work between samples. A reset between scrapes can lose unobserved increase before the reset. Even without a reset, a long interval loses timing detail: Prometheus knows the increase happened somewhere between the two samples, not when inside the interval.

Faster scraping therefore helps:

- see short-lived gauge changes;
- localize counter activity in time;
- shorten alert-detection alignment;
- provide more points for a rate calculation.

It does not make the underlying exporter or kernel update more frequently than their source data.

## Match Rate Windows to the Interval

`rate()` needs a range vector with enough samples. A practical floor is at least four expected scrapes:

| Scrape interval | Practical initial `rate()` range |
| --- | ---: |
| 5s | 20–30s |
| 15s | 1m |
| 30s | 2m |
| 60s | 5m |

This is an operational heuristic, not a PromQL rule. Missing scrapes, jitter, and the desired smoothing may require a longer window.

For alerting, a five-minute CPU rate with a 15-second scrape is stable but intentionally smooth. A one-minute rate is more responsive but noisier. Changing the dashboard step does not create source resolution that was never scraped.

## Estimate the Ingestion Cost

For regularly scraped float series:

```text
samples per second
  ≈ targets × active series per target ÷ scrape interval in seconds
```

Example:

```text
5,000 hosts × 1,000 series ÷ 15 seconds
  ≈ 333,333 samples/second
```

At 60 seconds:

```text
5,000 × 1,000 ÷ 60
  ≈ 83,333 samples/second
```

The faster interval produces about four times as many samples for those series. Disk is not the only cost. More samples also increase scrape traffic, parsing, WAL traffic, compaction work, remote-write traffic, and query input.

Series count and churn still matter enormously for memory and index cost. Increasing the interval does not fix an unbounded-label design.

## Split Fast and Slow Collectors

Node exporter supports scrape-time collector filtering with `collect[]`. A deployment can scrape operational signals frequently and expensive or slow collectors less often:

```yaml
scrape_configs:
  - job_name: node-fast
    scrape_interval: 15s
    scrape_timeout: 10s
    params:
      collect[]:
        - cpu
        - loadavg
        - meminfo
        - pressure
        - diskstats
        - netdev
    static_configs:
      - targets:
          - node-a.example.com:9100

  - job_name: node-slow
    scrape_interval: 2m
    scrape_timeout: 30s
    params:
      collect[]:
        - filesystem
        - systemd
    static_configs:
      - targets:
          - node-a.example.com:9100
```

Collectors must also be enabled in the node exporter process; the request filter does not activate a collector that the exporter was not configured to expose.

Keep the metric families disjoint between jobs or accept that duplicate logical signals will have different `job` labels. Query and alert rules must select the intended job.

Before enabling a disabled collector, the node exporter project recommends testing it on one system and watching scrape duration and post-relabel sample count. Some collectors are disabled because they can be slow, high-cardinality, or resource-intensive.

## Watch the Scrape Pipeline

Prometheus automatically records target scrape metrics:

```promql
up{job="node"}
```

```promql
scrape_duration_seconds{job="node"}
```

```promql
scrape_samples_scraped{job="node"}
```

```promql
scrape_samples_post_metric_relabeling{job="node"}
```

```promql
scrape_series_added{job="node"}
```

Watch for:

- `up == 0`;
- scrape duration approaching timeout;
- abrupt sample-count growth;
- sustained series churn;
- Prometheus ingestion or remote-write backlog;
- rule evaluations that miss their schedule.

If the 99th-percentile scrape duration is close to the interval, first find the slow collector or target. Merely increasing timeout can convert fast failures into prolonged resource pressure across many targets.

## When to Scrape Faster

Use a shorter interval when:

- a specific alert has a measured detection target;
- short pressure episodes cause real service impact;
- the exporter completes with ample margin;
- Prometheus and remote storage have tested capacity;
- the extra resolution changes a decision.

Run a controlled trial on a subset of hosts. Compare alert quality, scrape duration, samples per second, resource use, and remote-write behavior before expanding.

## When to Scrape Slower

Use a longer interval when:

- the metric changes slowly;
- the action is capacity planning rather than incident response;
- the collector is expensive;
- remote links are constrained;
- the additional points do not change a query or alert;
- storage and ingestion cost outweigh the resolution benefit.

Do not globally slow critical host pressure metrics just because one optional collector is expensive. Split jobs or collector sets.

## Summary

Start around 15 seconds for latency-sensitive production host alerts, 30 seconds for general production monitoring, and 60 seconds for slower capacity use cases. Keep scrape timeout below the interval with margin, give rate windows several expected samples, split expensive collectors into slower jobs, and validate the choice from end-to-end detection time plus measured Prometheus, exporter, network, and storage load.

## Official Documentation

- [Prometheus configuration for `scrape_interval` and `scrape_timeout`](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#scrape_config)
- [Prometheus official node exporter guide and 15-second example](https://prometheus.io/docs/guides/node-exporter/)
- [Prometheus node exporter collector filtering and deployment guidance](https://github.com/prometheus/node_exporter#filtering-enabled-collectors)
- [Prometheus node exporter guidance for disabled collectors](https://github.com/prometheus/node_exporter#disabled-by-default)
- [Prometheus `rate()` documentation](https://prometheus.io/docs/prometheus/latest/querying/functions/#rate)
- [Prometheus storage capacity guidance](https://prometheus.io/docs/prometheus/latest/storage/)
