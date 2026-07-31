# Can Node Exporter Use Different Scrape Intervals for CPU, Disk, and Network Metrics?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Node Exporter, Scrape Interval, Collectors, PromQL, Performance

Description: Split Node Exporter collectors across Prometheus scrape jobs when different intervals are justified, while avoiding duplicate series and misleading rates.

---

Node Exporter does not schedule its CPU, disk, filesystem, and network collectors independently. A request to `/metrics` runs the enabled collectors selected for that request. Prometheus controls `scrape_interval` per scrape configuration, not per metric within one response.

For most hosts, scrape all enabled collectors together. The Node Exporter project calls this the recommended mode because it avoids errors when comparing metric families. If a measured cost or resolution requirement justifies different intervals, create multiple Prometheus scrape jobs and use Node Exporter's request-time `collect[]` filter.

## Understand the Three Controls

These mechanisms are different:

### Startup collector flags

```text
--collector.systemd
--no-collector.arp
--collector.disable-defaults
```

They define which collectors the Node Exporter process has enabled. Some collectors are disabled by default because of cardinality, resource demand, or collection time. A request cannot use a collector that was not enabled for that exporter.

### Request-time filtering

```text
/metrics?collect[]=cpu&collect[]=meminfo
```

The `collect[]` parameter selects from enabled collectors for one request. It can be repeated. The alternative `exclude[]` parameter collects all enabled collectors except the named ones. The two forms cannot be combined on one request.

### Prometheus metric relabeling

```yaml
metric_relabel_configs:
  - source_labels: [__name__]
    regex: node_network_.+
    action: drop
```

Metric relabeling drops samples after Prometheus receives the scrape response. It reduces stored samples, but it does not prevent Node Exporter from running the collector or reduce bytes transferred to Prometheus. Use `collect[]` when collection and transfer cost are the reason for splitting.

## Configure Separate Scrape Jobs

This example scrapes CPU, memory, load, and virtual-memory counters every 15 seconds, while collecting disk, filesystem, and network metrics every minute:

```yaml
scrape_configs:
  - job_name: node-fast
    scrape_interval: 15s
    scrape_timeout: 10s
    params:
      "collect[]":
        - cpu
        - meminfo
        - loadavg
        - vmstat
    static_configs:
      - targets:
          - node-01.example.internal:9100
          - node-02.example.internal:9100
        labels:
          collector_set: fast

  - job_name: node-slow
    scrape_interval: 1m
    scrape_timeout: 30s
    params:
      "collect[]":
        - diskstats
        - filesystem
        - netdev
        - netclass
    static_configs:
      - targets:
          - node-01.example.internal:9100
          - node-02.example.internal:9100
        labels:
          collector_set: slow
```

For dynamic discovery, repeat the same service-discovery and target-relabeling rules in both jobs or generate the two jobs from one configuration source. A host that lands in only one job has an incomplete monitoring contract.

Prometheus requires every `job_name` to be unique. Keep the job or `collector_set` label distinct. Do not relabel both jobs into exactly the same series label sets: exporter self-metrics or accidentally overlapping collectors can then write competing samples to one time series.

## Expect Common Exporter Metrics in More Than One Job

Node Exporter exposes exporter-process and scrape self-metrics in addition to collector families. Multiple requests can therefore produce series with the same metric name and target address but different `job` or `collector_set` labels.

Queries must select the intended series:

```promql
rate(node_cpu_seconds_total{job="node-fast"}[2m])
```

```promql
rate(node_disk_read_bytes_total{job="node-slow"}[5m])
```

Avoid broad queries such as:

```promql
sum(rate(process_cpu_seconds_total[5m]))
```

when both jobs scrape the same exporter process. That double-counts the exporter self-metric across job labels.

## Choose Rate Windows From the Slowest Input

A rate needs at least two samples, and a useful alert range should survive ordinary jitter or one missed scrape. A practical starting point is a range at least four times the scrape interval:

| Scrape interval | Example rate range |
| --- | --- |
| 15 seconds | 1–2 minutes |
| 1 minute | 4–5 minutes |
| 5 minutes | 20–30 minutes |

Longer windows smooth bursts and delay detection. Shorter windows increase empty results and noise. Evaluate the actual workload rather than applying the table mechanically.

Counters such as CPU seconds, disk bytes, and network bytes accumulate between scrapes, so a slower interval does not inherently lose the cumulative total. It does reduce temporal resolution. Gauges and short-lived states can change and recover between scrapes without ever being observed.

## Keep Cross-Collector Calculations Aligned

Splitting collectors creates different sample timestamps and resolutions. Queries such as:

- disk throughput divided by CPU usage;
- memory pressure correlated with load;
- filesystem fullness combined with read-only state; or
- network errors compared with packet rate

can join values selected at different scrape times. Prometheus's lookback behavior makes many instant queries appear complete, but the latest sample ages can differ by nearly the slow scrape interval.

Record or dashboard the data age where alignment matters:

```promql
time() - timestamp(node_filesystem_avail_bytes{job="node-slow"})
```

Use the same interval for tightly coupled metric families. For example, keep `filesystem` metrics together rather than attempting to scrape `node_filesystem_avail_bytes` at one cadence and `node_filesystem_readonly` at another; they come from one collector.

## Measure Before Splitting

Prometheus generates:

```promql
scrape_duration_seconds{job=~"node-fast|node-slow"}
scrape_samples_scraped{job=~"node-fast|node-slow"}
scrape_samples_post_metric_relabeling{job=~"node-fast|node-slow"}
```

Node Exporter exposes per-collector metrics including:

```promql
node_scrape_collector_duration_seconds
node_scrape_collector_success
```

Inspect them on the raw endpoint and in each filtered job for the Node Exporter version deployed. Test newly enabled collectors one at a time on representative hosts. Upstream warns that disabled-by-default collectors may have high cardinality, run too long, or consume significant host resources.

Splitting jobs is justified when measurements show:

- one expensive collector pushes the full scrape near its timeout;
- high-resolution CPU data is operationally useful while another family can be slower;
- a high-cardinality collector is routed to a separate Prometheus server with a different retention or forwarding policy; or
- different trusted Prometheus servers are intentionally allowed to collect specific families.

It is not justified merely because disk metrics “change slowly.” Disk counters can change quickly, and a slower scrape reduces burst and saturation visibility.

## Avoid Two Misleading Alternatives

### A recording rule is not a scrape interval

Evaluating a recording rule every five minutes reduces query work for consumers, but Prometheus still scrapes the source at its configured interval. This can be useful for downsampled views, not exporter load reduction.

### Dropping metrics is not disabling a collector

`metric_relabel_configs` can reduce storage and remote-write volume. The exporter has already executed the collector and sent its samples. Use startup flags or `collect[]` to avoid that work.

## Handle Failures Per Collector Set

Each scrape job has its own `up` series:

```promql
up{job="node-fast"} == 0
up{job="node-slow"} == 0
```

One can succeed while the other times out. Alert on both, but route slow-collector failures with enough context:

```yaml
- alert: NodeSlowCollectorScrapeFailed
  expr: up{job="node-slow"} == 0
  for: 5m
  annotations:
    summary: "Slow Node Exporter collector set failing on {{ $labels.instance }}"
```

If the same exporter process is down, both jobs fire. Use Alertmanager grouping or inhibition to prevent duplicate pages while preserving which collector set first showed trouble.

## A Safe Rollout

1. Inventory enabled collectors and current scrape cost.
2. Identify a measured requirement for a different cadence.
3. Keep collector sets disjoint unless overlap is intentional.
4. Keep job labels distinct.
5. Set every scrape timeout below its scrape interval.
6. Update PromQL ranges and job selectors.
7. Review dashboards and alerts for exporter-self-metric double counting.
8. Test one host class before fleet rollout.
9. Compare missing series, scrape duration, samples, and host load.
10. Document which job owns every enabled collector.

Different intervals are an advanced optimization. The default single scrape remains easier to query, alert on, and troubleshoot.

## Official Documentation

- [Node Exporter filtering enabled collectors with `collect[]` and `exclude[]`](https://github.com/prometheus/node_exporter#filtering-enabled-collectors)
- [Node Exporter collector defaults and performance guidance](https://github.com/prometheus/node_exporter#collectors)
- [Prometheus scrape configuration and per-job interval](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#scrape_config)
- [Prometheus automatically generated scrape metrics](https://prometheus.io/docs/concepts/jobs_instances/#automatically-generated-labels-and-time-series)
- [Prometheus `rate()` function](https://prometheus.io/docs/prometheus/latest/querying/functions/#rate)
- [Prometheus staleness and lookback behavior](https://prometheus.io/docs/prometheus/latest/querying/basics/#staleness)
- [Prometheus metric relabeling configuration](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#relabel_config)
- [Prometheus alerting rule guidance](https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/)
