# How High-Cardinality Host Labels Inflate Metrics Cost—and What to Drop at Ingest

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Cardinality, Labels, Metric Relabeling, Node Exporter, Cost Optimization

Description: Find costly host series and label churn, filter them before ingestion, and avoid relabeling changes that create duplicate or unusable metrics.

---

In Prometheus, every unique metric name plus complete label set is a separate time series. A label is not inexpensive metadata attached once to a host; its value participates in the identity of every series carrying it.

For host metrics, cost grows through two patterns:

1. **multiplication:** an exporter emits a series for every CPU, mode, device, mount, sensor, queue, or service;
2. **churn:** a target or metric label changes, so Prometheus creates a new series while the old one remains queryable for earlier time ranges until retention removes it.

High-cardinality labels are labels with many distinct values. Unbounded labels such as request IDs, process IDs, container IDs, pod UIDs, filenames, or timestamps are the most dangerous. Prometheus's naming guidance explicitly warns against using high-cardinality dimensions such as user IDs or email addresses.

## Understand What Actually Increases Series Count

Suppose one host exposes:

```text
1,000 distinct metric label sets
```

Adding a stable `host_id` with one value to every series does not necessarily turn 1,000 concurrent series into 2,000; it changes and enlarges the identity of those 1,000 series.

But if `host_id` changes during reprovisioning, a second population is created over time. If a metric has 100 process IDs, 20 devices, and 5 states in independent combinations, it can produce up to:

```text
100 × 20 × 5 = 10,000 series
```

The practical costs include:

- head memory for active series;
- index and symbol-table data;
- chunks and WAL traffic;
- compaction;
- remote-write bandwidth;
- query fan-out;
- slow dashboards and rules;
- alert instances for every retained label.

Long label values can increase label and index memory even when they do not multiply the number of series. Cardinality and label-byte cost are related but not identical.

## Audit Before Dropping Anything

Prometheus exposes TSDB cardinality statistics at:

```text
GET /api/v1/status/tsdb
```

The official API returns:

- head series count;
- series count by metric name;
- value count by label name;
- memory in label values by label name.

Inspect the API on the Prometheus instance that ingests the target. Its default top lists are a starting point; use the documented `limit` parameter when more entries are needed.

Useful PromQL:

```promql
topk(
  20,
  count by (__name__) (
    {job="node", __name__=~".+"}
  )
)
```

This finds metric names with many currently selectable series for the node job.

Per-target scrape size:

```promql
topk(
  20,
  scrape_samples_post_metric_relabeling{job="node"}
)
```

Approximate new series per scrape:

```promql
topk(
  20,
  scrape_series_added{job="node"}
)
```

Sustained or unexpected increases in `scrape_series_added` are a strong churn clue. The metric is approximate and can also spike after a Prometheus restart while its per-target scrape caches are rebuilt. Increases can come from service discovery, a changed target label, new devices or mounts, a collector rollout, or an exporter adding a volatile label.

Compare:

```promql
scrape_samples_scraped{job="node"}
-
scrape_samples_post_metric_relabeling{job="node"}
```

This shows how many samples metric relabeling drops from each scrape. It does not include target relabeling because targets dropped before scraping produce no scrape.

## Remove the Dimension at Its Earliest Safe Point

The cheapest series is one the exporter never builds and Prometheus never transfers.

For node exporter, prefer collector-level controls when they express the intent:

```text
--collector.filesystem.mount-points-exclude
--collector.filesystem.fs-types-exclude
--collector.diskstats.device-exclude
--collector.netdev.device-exclude
```

For example, excluding ephemeral container mounts in the filesystem collector prevents all filesystem metric families for those mounts, rather than dropping them one metric at a time later.

Node exporter also supports `collect[]` and `exclude[]` scrape parameters. Test any collector reduction against dashboards, alerts, and runbooks. The project notes that collecting all metrics from enabled collectors is normally recommended to avoid inconsistent metric-family assumptions.

## Drop Unneeded Metric Families Before Ingestion

Prometheus applies `metric_relabel_configs` to samples as the final step before ingestion. It is the correct Prometheus-side control when a series should be absent from local TSDB:

```yaml
scrape_configs:
  - job_name: node
    static_configs:
      - targets:
          - node-a.example.com:9100
    metric_relabel_configs:
      - source_labels: [__name__]
        regex: 'node_network_(receive|transmit)_compressed_total'
        action: drop
```

Prometheus relabel regexes are anchored at both ends, so that expression matches only the two complete metric names.

Drop a metric family only after proving it has no:

- alert;
- recording rule;
- dashboard;
- capacity report;
- incident runbook;
- remote consumer.

A “never queried in 30 days” report helps, but rare incident metrics may be intentionally dormant.

## Drop Ephemeral Mount Series

If exporter-side filtering cannot be changed, metric relabeling can reject filesystem samples for ephemeral paths:

```yaml
metric_relabel_configs:
  - source_labels: [__name__, mountpoint]
    separator: ';'
    regex: 'node_filesystem_.*;/var/lib/kubelet/pods/.*'
    action: drop
```

Because Prometheus regexes are fully anchored, the trailing `.*` is needed to match mountpoints below that prefix.

This drops every `node_filesystem_*` sample with a matching mountpoint before local ingestion. Verify the actual paths: Kubernetes runtime and mount layouts vary, and a broad expression can discard a persistent volume that needs monitoring.

## Drop Labels Only When Series Stay Unique

`labeldrop` removes label names matching its regex:

```yaml
metric_relabel_configs:
  - regex: 'pod_uid|container_id|image_id'
    action: labeldrop
```

This example is suitable only for an endpoint where those labels are confirmed to be irrelevant and non-identifying.

Prometheus documentation warns that `labeldrop` and `labelkeep` must leave metrics uniquely labeled. Consider:

```text
host_process_cpu_seconds_total{pid="101",name="worker"}
host_process_cpu_seconds_total{pid="102",name="worker"}
```

Dropping `pid` makes both samples identical in the same scrape:

```text
host_process_cpu_seconds_total{name="worker"}
```

Prometheus cannot safely ingest two samples with the same label set at the same timestamp. Aggregate at the exporter or keep the distinguishing label; relabeling does not sum them.

Also distinguish **series reduction** from **label-byte reduction**. Dropping one label from a metric that already has exactly one series per host may shorten labels but leave the series count unchanged.

## Do Not Promote Every Discovery Label

Service discovery provides temporary labels prefixed with `__meta_`. They disappear after target relabeling unless a `relabel_configs` rule copies them to a persistent target label.

Promote only dimensions needed for:

- query grouping;
- alert ownership and routing;
- access or tenancy boundaries;
- stable resource identity.

Avoid promoting:

- every cloud tag;
- deployment or controller hashes;
- full image digests;
- annotations with arbitrary user content;
- timestamps;
- rapidly changing status;
- long resource URLs when a stable short ID is sufficient.

Because target labels are attached to all scraped samples, one unnecessary changing label can churn the host's entire metric population.

## Know Which Relabel Stage Saves Which Cost

| Stage | Configuration | Effect |
| --- | --- | --- |
| Target selection and labels | `relabel_configs` | Runs before scraping; can drop a target or control promoted discovery labels |
| Local sample ingestion | `metric_relabel_configs` | Runs after scrape, immediately before local ingestion |
| Remote-write output | `write_relabel_configs` | Filters what is sent to one remote endpoint after local ingestion |

Using only `write_relabel_configs` saves remote bandwidth and remote storage, but not local scrape parsing, head memory, WAL, or TSDB storage.

Metric relabeling does not apply to automatically generated series such as `up`. This is intentional: scrape health remains available even when exported samples are filtered.

## Limits Are Guardrails, Not Truncation

Prometheus scrape configuration supports:

```yaml
sample_limit: 5000
label_limit: 30
label_name_length_limit: 100
label_value_length_limit: 500
```

If a scrape exceeds these post-relabel limits, Prometheus treats the **entire scrape as failed**. It does not keep the first 5,000 samples or trim extra labels.

Use limits as protection against an unexpected exporter explosion, with alerts on `up == 0` and a tested threshold above normal peaks. They are not a substitute for designing bounded metrics and explicit filters.

## Establish a Cardinality Budget

For each host scrape job, define:

- expected series per target;
- maximum series per target;
- expected new-series rate;
- allowed persistent target labels;
- enabled collectors;
- allowed device and mount populations;
- an owner for every exception.

During a rollout:

1. scrape a representative target;
2. inspect metric names and labels;
3. compare pre- and post-relabel sample counts;
4. syntax-check and reload configuration;
5. canary one Prometheus or target group;
6. watch `up`, scrape duration, sample count, series added, head series, and rule failures;
7. verify dashboards and alerts before expanding.

Cardinality control is easiest before a volatile label has already created millions of historical series.

## Summary

Every unique metric-and-label combination is a time series. Find expensive metric names, high-value-count labels, and churn with the TSDB stats API plus scrape metrics. Filter ephemeral devices and mounts at the exporter when possible, use `metric_relabel_configs` to keep unwanted samples out of local TSDB, and use `write_relabel_configs` only for remote-output policy. Never drop a distinguishing label unless the remaining label set stays unique.

## Official Documentation

- [Prometheus data model and time-series identity](https://prometheus.io/docs/concepts/data_model/)
- [Prometheus metric and label naming guidance](https://prometheus.io/docs/practices/naming/)
- [Prometheus TSDB cardinality statistics API](https://prometheus.io/docs/prometheus/latest/querying/api/#tsdb-stats)
- [Prometheus metric relabeling and scrape limits](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#scrape_config)
- [Prometheus relabel actions and uniqueness warning](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#relabel_config)
- [Prometheus remote-write relabeling](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#remote_write)
- [Prometheus node exporter collector filters](https://github.com/prometheus/node_exporter#include--exclude-flags)
