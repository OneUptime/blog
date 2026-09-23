# How to Build Hierarchical Prometheus Rollups Without Mixing Raw and Pre-Aggregated Series

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, PromQL, Monitoring

Description: Create explicit recording-rule layers with disjoint inputs, preserved identities, and accounting checks between raw and aggregated metrics.

---

A hierarchical rollup should read exactly one preceding layer. When a dashboard selects both raw series and their aggregates, the numbers can look plausible while counting the same observations twice. Prevent that by giving every layer a distinct metric name and a documented input population.

Design the hierarchy as an accounting relationship: instance rates combine into cluster rates, cluster rates combine into region rates, and region rates combine into a global rate. Every original observation should have one path to the final result.

## Define the retained dimensions

Assume every raw request counter carries `cluster`, `region`, `service`, `status`, and instance identity. The first layer removes instance identity after counter reset handling. Later layers deliberately remove cluster and then region.

Put dependent rules in one group so they evaluate sequentially at the same timestamp:

```yaml
groups:
  - name: request-rollups
    interval: 30s
    rules:
      - record: cluster_service_status:http_requests:rate5m
        expr: |
          sum by (cluster, region, service, status) (
            rate(http_requests_total{job="api"}[5m])
          )

      - record: region_service_status:http_requests:rate5m
        expr: |
          sum by (region, service, status) (
            cluster_service_status:http_requests:rate5m
          )

      - record: service_status:http_requests:rate5m
        expr: |
          sum by (service, status) (
            region_service_status:http_requests:rate5m
          )
```

The [recording-rule configuration](https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/) defines sequential evaluation within a group. Independent groups do not provide that same dependency ordering, so splitting these rules requires considering how older recorded values will be selected.

Load the file through `rule_files` in Prometheus and check its syntax before deployment:

```bash
promtool check rules request-rollups.yml
```

## Keep the units visible

The first layer calculates requests per second. Every subsequent layer also contains requests per second. These recorded values are no longer cumulative request counters, so do not call `rate()` or `increase()` on them.

The [recording-rule naming guidance](https://prometheus.io/docs/practices/rules/) recommends names that identify the aggregation level and operation. The names above also retain the five-minute rate window, helping reviewers distinguish them from counters or differently smoothed rates.

For a service's global request rate, query exactly the final metric:

```promql
sum by (service) (
  service_status:http_requests:rate5m
)
```

Avoid a selector such as `{__name__=~".*http_requests.*"}`. That can select raw counters and all three derived layers, mixing units as well as duplicating populations.

## Keep inputs disjoint across collection paths

Distinct metric names prevent one class of error, but a cluster rollup can still be collected twice. If two HA Prometheus replicas remote-write equivalent cluster rules, the central backend must deduplicate those replicas or query one authoritative copy.

Likewise, do not combine a region rollup with a cluster rollup from a cluster already represented inside that region. During migrations, record which clusters contribute to each layer and enforce that coverage in selectors or routing configuration.

A useful operational contract states the owner of every rollup, its original producers, the labels retained, and the layer permitted to consume it. Treat a change in contributor ownership like a schema change, because it can change totals without changing metric names.

## Verify conservation at a fixed timestamp

Compare the final rollup with a direct raw calculation:

```promql
sum by (service, status) (
  rate(http_requests_total{job="api"}[5m])
)
-
service_status:http_requests:rate5m
```

Evaluate at a timestamp where the relevant rule cycle has completed and all inputs are available. Near-zero differences are expected apart from numeric effects when both paths use the same data. A mismatch may reveal a missing cluster, duplicate replica, different selector, or delayed recording layer.

An empty subtraction result is not proof of equality: vector matching drops groups missing on one side. Check set differences too:

```promql
sum by (service, status) (
  rate(http_requests_total{job="api"}[5m])
)
unless
service_status:http_requests:rate5m
```

Run the reverse `unless` as well. These checks distinguish equal values from missing coverage.

## Preserve aggregatable components

For error ratios, roll up error and total request rates separately, then divide at the desired level. Averaging cluster error percentages gives equal weight to quiet and busy clusters and generally produces the wrong global ratio.

For classic histogram percentiles, preserve `le` through all bucket-rate layers and calculate `histogram_quantile()` only after selecting the final population. For average latency, retain the sum and count components. A percentile or average usually cannot be rolled up correctly by summing its already reduced values.

## Monitor the hierarchy itself

A recording rule that misses an evaluation creates a gap. A downstream instant selector can also reuse a recent older sample, causing different layers to represent different effective moments. Monitor rule evaluation errors, missed iterations, and expected region and cluster coverage.

Exercise a process restart, an HA failover, a missing cluster, and a rule reload before relying on the global dashboard. The hierarchy is trustworthy when every layer accounts for a known disjoint population, preserves its units, and can be reconciled with an independent calculation from retained raw data.
