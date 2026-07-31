# How to Alert When an Expected Host Metric Disappears Without Treating No Data as Zero

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, PromQL, Alerting, Node Exporter, Missing Metrics, Observability

Description: Alert on missing per-host metrics by comparing an expected target set with observed series while keeping zero, scrape failure, and absence distinct.

---

Zero and no data are different states. A zero-valued host metric says the exporter observed a value of zero. An absent series says Prometheus has no current observation with that label set. Converting absence to zero hides collector failures, relabeling mistakes, deployment changes, and vanished targets.

The reliable pattern is:

```text
expected series set
unless
observed series set
```

The difficult part is choosing an expectation source that remains present when the monitored metric disappears.

## Know Why a Series Disappears

A host metric can be absent because:

- the exporter stopped exposing one collector;
- request-time collector filtering omitted it;
- the collector failed or lacks permission;
- a metric or label changed during an upgrade;
- metric relabeling dropped it;
- the whole scrape failed;
- service discovery removed the target; or
- Prometheus or its rule evaluator is unavailable.

Those causes need different alerts. One `or vector(0)` expression cannot distinguish them.

Prometheus marks a time series stale when a successful scrape stops returning it or when its target is removed. After the stale marker, an instant selector does not return that series. The default lookback behavior is not a promise that a missing metric will retain its last value for five minutes; normal Prometheus-generated staleness markers end the series sooner.

## Alert on One Fixed Label Set

For one explicitly named target and metric, `absent_over_time()` is concise:

```promql
absent_over_time(
  node_time_seconds{
    job="node",
    instance="db-01.example:9100"
  }[10m]
)
```

It returns a one-element vector with value `1` when the range contains no samples. It returns an empty vector when at least one sample exists.

This is appropriate for a fixed singleton. It does not enumerate every missing instance from a dynamic fleet. A regex such as `instance=~".*"` still produces at most one absence result and cannot invent the labels of each host that is gone.

It also does not distinguish a missing metric from a down target. Add separate target-health alerts when that distinction matters.

## Use `up` as the Expected Set for a Per-Target Collector Metric

Prometheus creates an `up` series for every active scrape target. If a target is currently scrapeable but one expected metric is absent, this rule returns that target:

```yaml
groups:
  - name: node-metric-presence
    rules:
      - alert: NodeTimeMetricMissing
        expr: |
          up{job="node"} == 1
          unless on (job, instance)
          node_time_seconds{job="node"}
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Expected host metric missing on {{ $labels.instance }}"
          description: "The node target is scrapeable but node_time_seconds has been absent for 10 minutes."
```

The comparison `up == 1` filters out failed targets. The `unless` operator returns each left-hand series for which no right-hand series has matching `job` and `instance` labels. The `for` clause requires the same per-target condition to remain active through rule evaluations before it fires.

This produces a clean separation:

```promql
# Endpoint scrape failed
up{job="node"} == 0

# Endpoint scrape succeeds, but the expected metric is absent
up{job="node"} == 1
unless on (job, instance)
node_time_seconds{job="node"}
```

If the metric legitimately has several series per target, matching only on `job, instance` asks whether at least one exists. Match additional labels only when each specific series is part of the contract.

## Delay With a Range When Samples Can Be Intermittent

For a metric that should appear frequently but may miss an occasional scrape, retain a recent-presence set:

```promql
up{job="node"} == 1
unless on (job, instance)
present_over_time(node_time_seconds{job="node"}[10m])
```

`present_over_time()` returns `1` for each series that had any sample in the range. This makes the detection window explicit. Do not combine a ten-minute range with another ten-minute `for` unless a roughly twenty-minute delay is intentional.

This technique is still inappropriate for a metric designed to update once per day. Sparse jobs should persist a last-success timestamp and alert on its age.

## Model Expectations for Specific Mounts or Devices

`up` can say a host is expected, but it cannot say that `/data` is expected on that host. Create an independent inventory metric:

```text
expected_node_filesystem{instance="db-01.example:9100",mountpoint="/data"} 1
expected_node_filesystem{instance="db-02.example:9100",mountpoint="/data"} 1
```

Then compare it with successfully collected capacity metrics:

```promql
expected_node_filesystem == 1
unless on (instance, mountpoint)
node_filesystem_avail_bytes{
  job="node",
  device_error=""
}
```

Not every Node Exporter release has a `device_error` label on capacity metrics, so adapt that optional matcher to the release actually deployed. A version-independent form is:

```promql
expected_node_filesystem == 1
unless on (instance, mountpoint)
node_filesystem_avail_bytes{job="node"}
```

Keep an explicit error alert too:

```promql
node_filesystem_device_error{job="node"} == 1
```

The expectation source must have an independent failure domain. If `expected_node_filesystem` is generated by transforming `node_filesystem_avail_bytes`, both disappear together and the comparison has no left-hand series to alert from.

## Do Not Use `or vector(0)` for Fleet Absence

This expression is a common trap:

```promql
node_time_seconds{job="node"} or vector(0)
```

If all selected series are absent, it creates one unlabeled zero. It does not create a zero for every missing instance. If some series exist, it adds an unrelated zero-valued series. Dashboards can look populated while target identity has been lost.

This alternative creates a zero for each active target:

```promql
node_time_seconds{job="node"}
or on (job, instance)
(up{job="node"} * 0)
```

It can be useful for a deliberately labeled visualization, but it still collapses “missing” into the numeric value zero. Do not use the filled value for alerts or SLO calculations. Expose a separate presence state instead:

```promql
up{job="node"} == 1
and on (job, instance)
node_time_seconds{job="node"}
```

## Cover the Cases This Rule Cannot See

An `up`-based expectation cannot detect a target removed from service discovery because its `up` series also becomes stale. Use an independent desired-target inventory for that case.

Also monitor:

- `up{job="node"} == 0` for failed scrapes;
- Prometheus and rule-evaluation health;
- service-discovery refresh failures;
- collector self-metrics such as `node_scrape_collector_success`;
- expected target count or identity from authoritative inventory; and
- remote-write delay if rules query data after transport to another Prometheus-compatible system.

Prometheus supports a rule query offset when distributed ingestion delay is expected. Prefer evaluating host-presence rules close to the scraper when possible; this removes transport delay and a central-link outage from the decision.

## Test Absence as a First-Class State

For each rule, test at least:

1. metric present with a positive value;
2. metric present with value zero;
3. one metric family removed while the scrape succeeds;
4. collector failure;
5. target scrape failure;
6. target removal from discovery; and
7. metric label change during an exporter upgrade.

The alert should preserve the expected target labels, remain silent for a legitimate zero, and route each observation failure to the right runbook.

## Official Documentation

- [Prometheus `absent()` and `absent_over_time()`](https://prometheus.io/docs/prometheus/latest/querying/functions/#absent)
- [Prometheus range-vector aggregation functions and `present_over_time()`](https://prometheus.io/docs/prometheus/latest/querying/functions/#aggregation_over_time)
- [Prometheus logical/set operators and `unless`](https://prometheus.io/docs/prometheus/latest/querying/operators/#logical-set-binary-operators)
- [Prometheus staleness and lookback behavior](https://prometheus.io/docs/prometheus/latest/querying/basics/#staleness)
- [Prometheus automatically generated `up` series](https://prometheus.io/docs/concepts/jobs_instances/#automatically-generated-labels-and-time-series)
- [Prometheus alerting rule `for` semantics](https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/)
- [Node Exporter filesystem metric definitions](https://github.com/prometheus/node_exporter/blob/master/collector/filesystem_common.go)
- [Prometheus scrape and metric relabel configuration](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#scrape_config)
