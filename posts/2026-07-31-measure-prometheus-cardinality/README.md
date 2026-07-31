# How to Measure Infrastructure Metric Cardinality Before It Overloads Prometheus

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Cardinality, TSDB, Infrastructure Metrics, Capacity Planning, Observability

Description: Measure active series, high-cardinality metrics and labels, ingestion churn, and per-job impact before infrastructure telemetry exhausts Prometheus resources.

---

Metric count and time-series count are not the same. One metric name with labels for 10,000 hosts, 50 devices, and several states can produce millions of series. Each unique metric name plus label set is a separate Prometheus time series with memory, CPU, disk, and network cost.

Measure four dimensions before changing collection:

- current active series;
- which metric names and labels create them;
- how quickly series are created and removed;
- which scrape jobs contribute the samples.

## Start with Prometheus's TSDB Status API

Prometheus exposes cardinality statistics at:

```bash
curl -s \
  'http://prometheus.example.net:9090/api/v1/status/tsdb?limit=50'
```

The response includes:

- `headStats.numSeries`;
- series count by metric name;
- value count by label name;
- label-value memory estimates;
- series count by label pair.

Inspect it with `jq`:

```bash
curl -s \
  'http://prometheus.example.net:9090/api/v1/status/tsdb?limit=50' \
  | jq '.data.headStats'
```

```bash
curl -s \
  'http://prometheus.example.net:9090/api/v1/status/tsdb?limit=50' \
  | jq '.data.seriesCountByMetricName'
```

```bash
curl -s \
  'http://prometheus.example.net:9090/api/v1/status/tsdb?limit=50' \
  | jq '.data.labelValueCountByLabelName'
```

The status view describes the current head block. It is the best first inventory, but it does not by itself explain historical churn or whether a metric is useful.

## Query Active Series by Metric Name

A PromQL view of currently query-visible series:

```promql
topk(
  25,
  count by (__name__) (
    {__name__!=""}
  )
)
```

Total currently visible series:

```promql
count({__name__!=""})
```

This follows PromQL lookback and staleness semantics. It is not a count of every historical series stored in all retained blocks. Use offline TSDB tools for investigations of retained on-disk blocks.

Drill into a suspicious family:

```promql
count by (cluster) (
  node_network_receive_bytes_total
)
```

```promql
count by (cluster, instance) (
  node_network_receive_bytes_total
)
```

```promql
count by (device) (
  node_network_receive_bytes_total
)
```

Progressively group by candidate labels to find the dimension that fans out.

## Measure Prometheus's Own Head-Series Metrics

Scrape Prometheus itself and graph:

```promql
prometheus_tsdb_head_series
```

Series creation rate:

```promql
rate(prometheus_tsdb_head_series_created_total[15m])
```

Series removal rate:

```promql
rate(prometheus_tsdb_head_series_removed_total[15m])
```

A steady high head count is a capacity issue. High create/remove rates indicate churn, even if the head count looks stable. Common infrastructure churn sources include:

- container or Pod IDs;
- transient veth names;
- process IDs;
- request, trace, or session identifiers;
- timestamps or version hashes in labels;
- autoscaled targets whose identity labels change;
- exporter labels populated from unbounded resource metadata.

Churn repeatedly allocates new series and index entries. A label can be expensive even when only a modest number of its values are active at once.

## Attribute Volume to Scrape Jobs

Prometheus creates scrape instrumentation per target. Useful metrics include:

```promql
sum by (job) (
  scrape_samples_scraped
)
```

```promql
sum by (job) (
  scrape_samples_post_metric_relabeling
)
```

```promql
sum by (job) (
  scrape_series_added
)
```

Compare scraped and post-relabel sample counts to understand existing filtering. Track `scrape_series_added` over deployments and autoscaling events to identify jobs creating new series.

node_exporter's official documentation specifically recommends watching `scrape_samples_post_metric_relabeling` when enabling optional collectors, because some collectors are disabled by default for reasons including high cardinality.

## Measure the Change, Not Just the Snapshot

Before enabling an exporter, collector, or label:

1. capture TSDB head series and ingestion samples per second;
2. capture top metric names and labels;
3. enable the change on one representative target;
4. measure series added per target;
5. multiply by the planned fleet size and growth;
6. observe churn through a full workload lifecycle;
7. extrapolate retention and remote-write impact;
8. define a rollback threshold.

Example:

```text
1,800 added active series per host
× 4,000 hosts
= 7.2 million active series
```

Do this arithmetic before fleet rollout, not after Prometheus begins missing rule evaluations.

## Estimate Storage Separately

Prometheus's storage documentation gives a rough disk formula:

```text
needed disk space
  =
retention seconds
× ingested samples per second
× bytes per sample
```

It cites an average of roughly one to two bytes per sample for local blocks, but real capacity must also account for:

- the write-ahead log and head chunks;
- index and label overhead;
- filesystem free-space margin;
- compaction;
- queries and recording-rule outputs;
- remote-write queues;
- replicas;
- actual data compression.

Series cardinality strongly affects memory and index work, while scrape interval strongly affects sample rate. Reducing series is often more effective than merely scraping the same high-cardinality set less often.

## Set Budgets by Ownership and Value

Create budgets such as:

| Scope | Budget | Owner | Action |
| --- | ---: | --- | --- |
| node job per target | active series | infrastructure observability | review new collectors |
| cluster | active series and churn | platform team | investigate top labels |
| Prometheus shard | head series | telemetry team | scale or reduce |
| remote-write tenant | samples/s | service owner | enforce ingest contract |

A budget needs a response. Decide whether exceeding it blocks rollout, triggers filtering, or requires a capacity change.

## Add Guardrails

Prometheus scrape configuration supports:

- `sample_limit`;
- label count and length limits;
- body size limits;
- metric relabeling before ingestion.

Limits can protect the server, but a limit breach can fail an entire scrape. Monitor `up` and scrape errors after introducing them. A hard limit is not a substitute for measuring normal cardinality.

Metric relabeling can drop expensive series:

```yaml
metric_relabel_configs:
  - source_labels: [__name__]
    regex: 'example_unbounded_metric_.*'
    action: drop
```

Do not drop a metric merely because it is large. First prove which dashboards, recording rules, alerts, APIs, and remote consumers use it.

## Do Not Use Dangerous Labels

Prometheus's instrumentation guidance warns that each label set creates another series. Avoid unbounded labels such as:

- user or customer ID;
- request or trace ID;
- full URL;
- error message;
- process ID when fleet-wide process detail is not required;
- arbitrary cloud tags;
- container image digest on every broad host metric.

Keep diagnostic detail in logs or traces when it does not need numeric aggregation.

## Operational Checklist

- Record `prometheus_tsdb_head_series` and series churn continuously.
- Query `/api/v1/status/tsdb` for top metrics and labels.
- Attribute samples and new series by job.
- Test changes on one representative target.
- Project per-target series across fleet growth and replicas.
- Observe at least one create/delete lifecycle.
- Include recording-rule outputs and remote-write cost.
- Assign a cardinality budget and rollback owner.
- Audit consumers before dropping metrics.

Prometheus usually gives warning before a cardinality incident: rising head series, churn, scrape samples, memory, and query time. The safest time to measure those signals is before a new dimension reaches every host.

## Official Documentation

- [Prometheus HTTP API: TSDB cardinality statistics](https://prometheus.io/docs/prometheus/latest/querying/api/#tsdb-stats)
- [Prometheus: Storage and capacity planning](https://prometheus.io/docs/prometheus/latest/storage/)
- [Prometheus: Instrumentation and label cardinality](https://prometheus.io/docs/practices/instrumentation/)
- [Prometheus: Configuration limits and metric relabeling](https://prometheus.io/docs/prometheus/latest/configuration/configuration/)
- [node_exporter: Collector guidance](https://github.com/prometheus/node_exporter)
