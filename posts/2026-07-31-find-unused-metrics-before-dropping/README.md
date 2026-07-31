# Find Unused Metrics Before Adding `metric_relabel_configs` Drop Rules

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Metric Relabeling, Infrastructure Metrics, Cardinality, PromQL, Governance

Description: Build an evidence-based metric usage inventory across rules, dashboards, APIs, and query logs before irreversibly dropping infrastructure series at ingestion.

---

An expensive metric is not necessarily unused, and a metric absent from dashboards may still power an alert or recording rule. Conversely, a metric queried once during last week's audit may not justify millions of continuously ingested series.

Before adding a `metric_relabel_configs` drop rule, answer two separate questions:

1. What does the metric cost?
2. Which decisions or products consume it?

Only then can an owner make the tradeoff.

## Understand Where Metric Relabeling Happens

Prometheus applies metric relabeling to samples as the last step before ingestion. It is commonly used to exclude expensive time series. It does not apply to automatically generated series such as `up`.

A dropped sample is unavailable to:

- local PromQL;
- alerting and recording rules;
- dashboards querying this Prometheus;
- remote write fed from this Prometheus;
- later incident investigations within this data path.

That makes the change more consequential than hiding a panel.

## Build the Candidate List from Cost

Use the TSDB status endpoint:

```bash
curl -s \
  'http://prometheus.example.net:9090/api/v1/status/tsdb?limit=100'
```

Review `seriesCountByMetricName` and `labelValueCountByLabelName` for labels with many distinct values. Add per-job scrape data:

```promql
sum by (job) (scrape_samples_scraped)
```

```promql
sum by (job) (scrape_samples_post_metric_relabeling)
```

```promql
sum by (job) (
  sum_over_time(scrape_series_added[1h])
)
```

The first two queries aggregate each target's latest scrape sample count. The third sums the approximate number of new series reported by scrapes during the last hour.

Create a candidate table:

| Metric family | Head series | Churn | Job | Suspected dimension | Owner |
| --- | ---: | ---: | --- | --- | --- |
| `example_process_io_bytes_total` | 850,000 | high | node | PID/process | compute |
| `example_device_sensor_info` | 220,000 | low | node | sensor label | hardware |

Do not begin with a regex copied from another environment.

## Search Version-Controlled Consumers

Search all places that can contain PromQL:

- alerting rules;
- recording rules;
- Grafana or other dashboard definitions;
- SLO and capacity configuration;
- runbooks and operational scripts;
- autoscaling policies;
- notebooks and reports;
- API clients and scheduled queries;
- downstream query repositories.

Search for both raw and derived names. A raw metric may be queried only by a recording rule, while every dashboard uses the recorded result.

Simple text search is a first pass:

```bash
rg 'example_process_io_bytes_total|instance:example_process_io_bytes:rate5m' \
  dashboards/ rules/ runbooks/ scripts/
```

It is not a complete PromQL parser. Templated metric names, variables, generated dashboards, and remote clients can evade it.

## Observe Runtime Queries

Prometheus can log queries from API requests, consoles, recording rules, and alerts. Enable it for a bounded audit window:

```yaml
global:
  query_log_file: /prometheus/query.log
```

Reload the Prometheus configuration through the approved mechanism, then verify:

```promql
prometheus_engine_query_log_enabled == 1
```

and monitor:

```promql
rate(prometheus_engine_query_log_failures_total[5m])
```

The log is JSON lines. API entries include the query and request path; rule evaluations include rule-group file and name. Prometheus does not rotate this log itself, so configure rotation and access controls before leaving it enabled.

Choose an observation window that covers:

- daily operations;
- weekly reports;
- on-call shifts;
- month- or quarter-end jobs;
- maintenance and capacity reviews;
- at least one representative incident exercise if practical.

No query during a seven-day window does not prove a quarterly disaster-recovery metric is unused.

## Inventory Remote Consumers

If other systems read from or receive data from this Prometheus, involve their owners:

- remote-write storage;
- federating Prometheus servers;
- remote-read clients;
- managed query frontends;
- billing or capacity exports;
- machine-learning and anomaly jobs.

Local query logs do not necessarily show queries executed against a remote destination. Dropping before remote write affects those consumers even when this server never queries the metric.

## Classify Usage, Not Just Presence

For each candidate, record:

| Classification | Meaning |
| --- | --- |
| critical | pages, safety automation, or regulatory evidence |
| operational | active dashboard or incident diagnosis |
| planning | capacity, cost, or periodic review |
| derivative-only | consumed through a recording rule |
| ad hoc | occasional exploration |
| unknown | no owner or incomplete evidence |
| unused | no identified consumer after agreed review |

“Unknown” is not automatically “unused.” It is a governance problem that needs an owner and a deadline.

## Check Alternatives and Granularity

The choice is not always keep everything or drop everything. Consider:

- disable one high-cardinality exporter collector;
- keep totals but drop per-process or per-device detail;
- allowlist useful devices or mount points;
- drop one unbounded label at instrumentation time;
- pre-aggregate before the data reaches this Prometheus when local ingestion savings are required;
- scrape expensive diagnostics in a separate job or Prometheus;
- retain a metric for a smaller subset of hosts;
- retain the raw metric locally and remote-write only a recording-rule aggregate when only downstream cost needs reduction.

Prefer fixing instrumentation when a label is fundamentally unbounded. Relabeling can hide the cost from one Prometheus, but the exporter still creates and transfers the payload.

## Stage the Drop

Use an exact, narrow rule:

```yaml
scrape_configs:
  - job_name: node
    # ...
    metric_relabel_configs:
      - source_labels: [__name__]
        regex: 'example_process_io_bytes_total'
        action: drop
```

For a label-bounded subset:

```yaml
metric_relabel_configs:
  - source_labels: [__name__, device]
    separator: ';'
    regex: 'example_device_metric;(loop.*|veth.*)'
    action: drop
```

Test the regex against real label sets. Prometheus regular expressions are fully anchored, so write the intended match explicitly.

Roll out to:

1. a non-production Prometheus;
2. one representative scrape job or shard;
3. a limited production cohort;
4. the remaining fleet after the observation period.

At each stage compare:

- post-relabel sample count;
- head series and churn;
- scrape health;
- rule evaluation errors and empty outputs;
- dashboard panels;
- alert behavior;
- remote consumer checks.

## Preserve a Reversible Decision

Record:

```text
metric family
labels or targets affected
measured series and sample savings
usage evidence and audit dates
owners who approved
replacement signal, if any
rollout stages
rollback trigger
review or expiry date
```

Keep the configuration change easy to revert. Existing historical samples remain until retention removes them, but new samples are not backfilled merely by deleting the drop rule later.

## Common Failure Modes

- Searching dashboards but not rules.
- Searching raw names but not recording-rule dependencies.
- Ignoring remote-write consumers.
- Observing only a quiet week.
- Treating no query-log match as proof of no value.
- Dropping an entire family to remove one bad label.
- Using a broad regex without inspecting real label sets.
- Rolling out globally before measuring savings on one target.
- Failing to monitor the query log's own disk and rotation.

## Decision Checklist

- Is the metric materially expensive?
- Is its cost steady or caused by churn?
- Did the audit cover every query surface and an adequate time window?
- Does an accountable owner agree it is unused or replaceable?
- Can a smaller granularity preserve the real use?
- Has the exact relabel rule been tested?
- Are alerts, rules, dashboards, and remote consumers checked?
- Is rollback documented?

Metric reduction should be evidence-based observability design, not spring cleaning. Measure cost, map consumers, stage the change, and preserve the ability to reverse it.

## Official Documentation

- [Prometheus: Configuration and metric relabeling](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#metric_relabel_configs)
- [Prometheus: Using the query log](https://prometheus.io/docs/guides/query-log/)
- [Prometheus HTTP API: TSDB stats and metric metadata](https://prometheus.io/docs/prometheus/latest/querying/api/)
- [Prometheus: Instrumentation and label cardinality](https://prometheus.io/docs/practices/instrumentation/)
- [Prometheus: Querying basics](https://prometheus.io/docs/prometheus/latest/querying/basics/)
