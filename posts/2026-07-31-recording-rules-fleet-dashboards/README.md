# How to Build Recording Rules for Fleet-Wide Infrastructure Dashboards Without Expensive Live Queries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Recording Rules, PromQL, Node Exporter, Dashboards, Performance

Description: Precompute reusable, capacity-correct infrastructure rollups with bounded labels so fleet dashboards stay fast as host and metric counts grow.

---

A fleet dashboard can return only a dozen lines while scanning millions of raw series on every refresh. The output is small; the work is not.

Prometheus recording rules evaluate an expression at a regular interval and store the result as a new time series. Dashboards query that recorded series instead of repeatedly calculating the same rates, joins, and aggregations across every host.

## Choose Rules from Measured Query Cost

Good candidates are expressions that are:

- used by several panels, alerts, or teams;
- expensive over high-cardinality inputs;
- stable enough to define centrally;
- evaluated repeatedly with the same label boundary;
- meaningful as a time series after precomputation.

Do not record every dashboard expression. Each rule creates stored series and another maintained interface.

Use the Prometheus query log and query timing to find repeated expensive expressions. Start PromQL exploration in the table view, narrow the result, and record only the stable shared calculation.

## Design the Output Contract First

For every rule, define:

```text
Decision: fleet CPU headroom by cluster
Input: node_cpu_seconds_total{mode="idle"}
Window: 5 minutes
Output labels: cluster
Unit: ratio from 0 to 1
Freshness: evaluated every minute
Owner: infrastructure observability
```

Output labels are the cardinality budget. A fleet rule that accidentally preserves `cpu`, `device`, `mountpoint`, or `pod` may be almost as expensive as the source.

## Rate Before You Aggregate

For counters, calculate the rate while each target series is still separate:

```promql
sum by (cluster) (
  rate(node_network_receive_bytes_total{device="bond0"}[5m])
)
```

Do not sum raw counters and then rate the result. Prometheus cannot reliably detect a reset from one target after its counter has been mixed with counters that continued increasing.

## Aggregate Ratios from Components

Do not average host utilization percentages for fleet capacity. Store numerators and denominators, aggregate them, and divide.

CPU idle capacity:

```promql
sum by (cluster) (
  rate(node_cpu_seconds_total{mode="idle"}[5m])
)
```

Logical CPUs contributing to the idle-rate calculation:

```promql
count by (cluster) (
  rate(node_cpu_seconds_total{mode="idle"}[5m])
)
```

Count the same rate vector used by the numerator so newly appearing or stale CPU series cannot affect only one side of the ratio.

Fleet utilization:

```promql
1
-
(
  cluster:node_cpu_idle_seconds:rate5m
  /
  cluster:node_cpu_logical:count_rate5m
)
```

Memory:

```promql
1
-
(
  sum by (cluster) (node_memory_MemAvailable_bytes)
  /
  sum by (cluster) (node_memory_MemTotal_bytes)
)
```

Prometheus's recording-rule practices explicitly say to aggregate numerator and denominator separately and not average a ratio.

## A Practical Rule File

```yaml
groups:
  - name: node-fleet-rollups
    interval: 1m
    limit: 10000
    rules:
      - record: cluster:node_cpu_idle_seconds:rate5m
        expr: |
          sum by (cluster) (
            rate(node_cpu_seconds_total{mode="idle"}[5m])
          )

      - record: cluster:node_cpu_logical:count_rate5m
        expr: |
          count by (cluster) (
            rate(node_cpu_seconds_total{mode="idle"}[5m])
          )

      - record: cluster:node_cpu_utilization:ratio
        expr: |
          1
          -
          (
            cluster:node_cpu_idle_seconds:rate5m
            /
            cluster:node_cpu_logical:count_rate5m
          )

      - record: cluster:node_memory_available_bytes:sum
        expr: |
          sum by (cluster) (
            node_memory_MemAvailable_bytes
          )

      - record: cluster:node_memory_total_bytes:sum
        expr: |
          sum by (cluster) (
            node_memory_MemTotal_bytes
          )

      - record: cluster:node_memory_utilization:ratio
        expr: |
          1
          -
          (
            cluster:node_memory_available_bytes:sum
            /
            cluster:node_memory_total_bytes:sum
          )

      - record: cluster:node_network_receive_bytes:rate5m
        expr: |
          sum by (cluster) (
            rate(
              node_network_receive_bytes_total{
                device="bond0"
              }[5m]
            )
          )

      - record: cluster:node_up:count
        expr: |
          count by (cluster) (
            up{job="node"} == 1
          )
```

Rules in one group run sequentially at the same evaluation timestamp, so the ratio rules can consume component rules above them.

The `limit` caps the number of series the group may produce per rule. If exceeded, Prometheus discards all output for that rule evaluation and records an error. Treat it as a guardrail and alert on rule failures; do not set it below legitimate fleet growth.

## Follow a Naming Scheme

Prometheus recommends:

```text
level:metric:operations
```

Examples:

```text
cluster:node_network_receive_bytes:rate5m
cluster:node_memory_available_bytes:sum
instance_device:node_network_transmit_bytes:rate5m
```

The level describes the output labels. The metric remains recognizable, and operations describe the transformation. Consistent names make incorrect aggregation easier to spot.

## Preserve Useful Boundaries

Fleet dashboards usually need:

- `cluster`;
- environment;
- region or availability zone when comparing failure domains;
- storage class for disk-capacity views;
- a stable team or tenancy boundary where required.

They usually do not need:

- CPU number;
- individual device on a fleet total;
- ephemeral Pod or container ID;
- full cloud tag sets;
- scrape replica when querying a deduplicated backend.

Use `by` or `without` explicitly. A bare `sum()` can silently combine production and staging.

## Keep Drill-Down Separate

Recording a cluster rollup does not replace raw host metrics. Use two levels:

1. low-cardinality fleet rules for overview and alert thresholds;
2. raw or per-instance rules for drill-down.

A dashboard can start with:

```promql
cluster:node_cpu_utilization:ratio
```

and link to a host view using:

```promql
1
-
avg by (cluster, instance) (
  rate(node_cpu_seconds_total{mode="idle"}[5m])
)
```

Do not add `instance` to every fleet rule merely to make drilling possible; that defeats the main cardinality reduction.

## Choose Rule Interval and Offset

The rule-group interval controls result resolution and evaluation cost. It need not be shorter than the source scrape interval.

For 30-second node scrapes, a one-minute fleet rollup is often a reasonable starting point. Verify it against dashboard refresh and alert needs.

Prometheus supports `query_offset` for rule groups when source samples arrive late, including when Prometheus is acting as a remote-write receiver. Use it only after measuring ingestion delay; an offset deliberately makes the rule evaluate older data.

Monitor:

```promql
increase(prometheus_rule_group_iterations_missed_total[10m]) > 0
```

If a rule group has not finished by its next scheduled evaluation, Prometheus skips iterations and the recorded series develops gaps.

## Validate Syntax, Semantics, and Cardinality

Prometheus ships `promtool`:

```bash
promtool check rules node-fleet.rules.yml
```

Unit-test expressions:

```bash
promtool test rules node-fleet.test.yml
```

Tests should include:

- heterogeneous CPU and memory sizes;
- counter reset on one host;
- one missing host;
- duplicate replica labels;
- zero or absent denominator;
- a new cluster;
- expected output labels and values.

After staging, compare the recorded result with the original live expression at the same evaluation time.

## Migrate Dashboards Safely

1. Measure current query duration and samples scanned.
2. Add and test the recording rule.
3. Let it accumulate enough history for the dashboard time range.
4. Compare old and new panels side by side.
5. Switch dashboard and alert consumers.
6. Keep the source expression documented.
7. Monitor rule failures, output cardinality, and evaluation time.

New recording rules do not automatically have historical data. Until enough time passes—or a carefully managed backfill is performed—the recorded series has a shorter history than the raw inputs.

## Common Mistakes

- Recording an incorrect percentage faster.
- Applying `rate()` after aggregation.
- Preserving high-cardinality labels accidentally.
- Mixing clusters because an external label was absent.
- Averaging host ratios for capacity.
- Choosing a rule interval shorter than the rule can evaluate.
- Ignoring output-series cost.
- Migrating a long-range dashboard before history exists.
- Deleting raw inputs before every consumer is migrated.

Recording rules are a data contract, not just a cache. Define their math, labels, ownership, and freshness explicitly, and they can keep fleet dashboards fast without hiding what the numbers mean.

## Official Documentation

- [Prometheus: Defining recording rules](https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/)
- [Prometheus: Recording rule best practices](https://prometheus.io/docs/practices/rules/)
- [Prometheus: Unit testing rules](https://prometheus.io/docs/prometheus/latest/configuration/unit_testing_rules/)
- [Prometheus: Query functions](https://prometheus.io/docs/prometheus/latest/querying/functions/)
- [Prometheus: Querying basics and expensive queries](https://prometheus.io/docs/prometheus/latest/querying/basics/)
