# How to Send Only Selected Metrics with `write_relabel_configs`

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Remote Write, Relabeling, write_relabel_configs, Metrics Filtering, Cardinality

Description: Filter outbound Prometheus samples by metric name and labels while preserving local data, source identity, and valid unique series.

---

Prometheus Remote Write sends every ingested series to each configured destination unless that destination has `write_relabel_configs`. Write relabeling runs after external labels are added and immediately before samples enter that Remote Write path. A dropped series remains in the local Prometheus TSDB; it is only excluded from that destination.

This makes write relabeling the right control when local dashboards need detailed data but a central backend should receive a smaller, intentional set.

## Keep an Allowlist of Metric Names

The metric name is available as the special `__name__` label. To send only a few metric families:

```yaml
remote_write:
  - name: central
    url: https://metrics.example.net/api/v1/write
    write_relabel_configs:
      - source_labels: [__name__]
        regex: 'up|node_cpu_seconds_total|node_memory_.*'
        action: keep
```

`keep` discards every series that does not match. Prometheus relabel regular expressions are anchored, so this pattern matches the complete metric name. `node_memory_.*` is needed for a prefix; `node_memory_` alone matches only that exact name.

An allowlist is usually safer for a cost-controlled destination because new exporter metrics do not begin flowing automatically. Its operational cost is maintenance: when a new metric is needed for a dashboard or alert, update the allowlist deliberately.

## Drop Known Expensive Metrics

If almost everything should be sent, a denylist is shorter:

```yaml
remote_write:
  - name: central
    url: https://metrics.example.net/api/v1/write
    write_relabel_configs:
      - source_labels: [__name__]
        regex: 'http_request_debug_.*|container_tasks_state|go_memstats_.*'
        action: drop
```

`drop` excludes matching series and keeps all others. This is convenient, but newly introduced high-cardinality metrics flow by default. Pair it with receiver limits and cardinality monitoring.

Do not drop a metric merely because its name looks expensive. Measure its active series, sample rate, and whether rules depend on it.

## Filter by Ordinary Labels

Select only production samples:

```yaml
write_relabel_configs:
  - source_labels: [environment]
    regex: production
    action: keep
```

Select a team and a bounded set of jobs:

```yaml
write_relabel_configs:
  - source_labels: [team]
    regex: payments
    action: keep
  - source_labels: [job]
    regex: 'api|worker|postgres'
    action: keep
```

Rules run in order. Two `keep` rules act like an AND here: a sample must survive the `team` rule and then the `job` rule.

When a source label is missing, its value is the empty string. Make missing-label behavior explicit. This pattern keeps production plus series without an `environment` label:

```yaml
write_relabel_configs:
  - source_labels: [environment]
    regex: 'production|'
    action: keep
```

Only do that when unlabeled series are intentionally in scope. Otherwise require the label so an instrumentation mistake fails closed.

## Combine Metric Name and Labels

Multiple source labels are concatenated with `;` by default:

```yaml
write_relabel_configs:
  - source_labels: [__name__, environment]
    separator: ';'
    regex: 'http_requests_total;production'
    action: keep
```

This sends only `http_requests_total` from production. The delimiter is part of the matched string. Choose a separator that cannot be confused with expected values when writing more complex rules.

For readability, separate rules are often clearer than a large combined regex:

```yaml
write_relabel_configs:
  - source_labels: [environment]
    regex: production
    action: keep
  - source_labels: [__name__]
    regex: 'http_requests_total|http_request_duration_seconds_.*'
    action: keep
```

## Filter Using External Labels

Because write relabeling runs after external labels, a label defined globally is available:

```yaml
global:
  external_labels:
    cluster: eu-west-production

remote_write:
  - name: central
    url: https://metrics.example.net/api/v1/write
    write_relabel_configs:
      - source_labels: [cluster]
        regex: eu-west-production
        action: keep
```

External labels are added only when the series does not already have that label. Avoid reusing `cluster` in scrape targets with a different meaning, or the existing series value wins.

## Keep Recording-Rule Outputs

A common architecture keeps detailed raw metrics locally and sends aggregates whose names follow a recording-rule convention:

```yaml
write_relabel_configs:
  - source_labels: [__name__]
    regex: 'job:.*|cluster:.*|up'
    action: keep
```

For example, a local rule might create:

```yaml
groups:
  - name: remote-write-aggregates
    rules:
      - record: job:http_requests:rate5m
        expr: sum by (job) (rate(http_requests_total[5m]))
```

The full Prometheus evaluates the rule and Remote Writes its resulting samples. Prometheus Agent mode cannot evaluate recording rules, so pre-aggregation must happen elsewhere if the edge runs as an Agent.

## Drop or Rewrite Labels Carefully

Write relabeling supports label actions as well as sample filtering. For example, remove temporary outbound-only labels:

```yaml
write_relabel_configs:
  - regex: 'debug_.*'
    action: labeldrop
```

This does not alter the locally stored series. However, removing a label can make two previously distinct series have the same final label set. The official configuration reference explicitly warns that `labeldrop` and `labelkeep` must preserve uniqueness.

Suppose these local series exist:

```text
request_total{instance="api-1",pod="api-a"}
request_total{instance="api-1",pod="api-b"}
```

Dropping `pod` makes both become `request_total{instance="api-1"}` at the receiver. Their timestamps and values can interleave, producing duplicate or out-of-order errors. Drop an entire unneeded series family instead of deleting an identifying label unless you have proved the resulting label set remains unique.

Do not drop `__name__`; a valid Prometheus metric series should retain its metric name.

## Know Which Relabel Stage You Need

Prometheus has several similarly named stages:

| Stage | Scope | Does dropped data enter local TSDB? |
| --- | --- | --- |
| `relabel_configs` | Discovered scrape targets | No scrape occurs for dropped targets |
| `metric_relabel_configs` | Samples from one scrape job before ingestion | No |
| `write_relabel_configs` | One Remote Write destination after ingestion and external labels | Yes |

Use `metric_relabel_configs` when a scraped metric should never consume local storage. Metric relabeling does not apply to automatically generated series such as `up`. Use `write_relabel_configs` when local retention is wanted but outbound transfer is not. Use target relabeling to select or transform scrape targets, not metric families.

## Validate the Filter

First check syntax:

```bash
promtool check config /etc/prometheus/prometheus.yml
```

Then verify the loaded configuration through `/api/v1/status/config` and compare rates:

```promql
rate(prometheus_tsdb_head_samples_appended_total[5m])
```

```promql
rate(prometheus_remote_storage_samples_total{remote_name="central"}[5m])
```

The first is local ingestion. The second counts samples included in outbound send attempts after filtering, and retries can count the same sample again. They are not expected to be identical, and a receiver query is still required to prove successful ingestion.

Prometheus also exposes dropped Remote Write samples by reason:

```promql
rate(
  prometheus_remote_storage_samples_dropped_total{
    remote_name="central",
    reason="dropped_series"
  }[5m]
)
```

Finally, query representative included and excluded series at the receiver. Test missing labels, recording-rule outputs, stale series, and newly deployed exporter versions. A regex that parses correctly can still select the wrong business data.

## A Safe Rollout

1. Inventory remote dashboards, alerts, SLOs, and recording rules.
2. Build an allowlist from those dependencies.
3. Apply the filter to a canary Remote Write destination or one source.
4. Compare sent sample rate, active series, and receiver query results.
5. Alert on unexpected non-recoverable failures and queue lag.
6. Document who owns updates to the allowlist.

The goal is not the smallest possible metric set. It is the smallest set that still supports every promised remote use case.

## Official Documentation

- [Prometheus Remote Write and write relabel configuration](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#remote_write)
- [Prometheus relabel configuration](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#relabel_config)
- [Prometheus global external labels](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#configuration-file)
- [Prometheus recording rules](https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/)
- [Prometheus Agent mode limitations](https://prometheus.io/docs/prometheus/latest/prometheus_agent/)
- [Prometheus write relabel demo](https://github.com/prometheus/prometheus/tree/main/documentation/examples/remote_storage)
- [Prometheus Remote Write queue metrics source](https://github.com/prometheus/prometheus/blob/main/storage/remote/queue_manager.go)
