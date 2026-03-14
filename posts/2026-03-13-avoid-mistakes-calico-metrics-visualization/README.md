# How to Avoid Common Mistakes with Calico Metrics Visualization

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Metrics, Grafana, Best Practices

Description: Avoid common Calico Grafana dashboard mistakes including misleading aggregations, incorrect units, missing per-node breakdown, and alert threshold misconfigurations.

---

## Introduction

Calico visualization mistakes can lead to false confidence (dashboard looks healthy when it isn't) or false alarms (dashboard looks bad when everything is fine). Understanding common PromQL and Grafana configuration mistakes helps you build dashboards that accurately reflect cluster state.

## Mistake 1: Using `sum()` Without `by()` for Per-Node Metrics

```promql
# WRONG - shows a single number, hides per-node variation
sum(felix_active_local_policies)

# CORRECT - shows per-node breakdown (critical for identifying outliers)
sum(felix_active_local_policies) by (node)

# Even better - ratio to show relative policy density
felix_active_local_policies / on(node) kube_node_info
```

## Mistake 2: Wrong Units for Latency Metrics

```promql
# WRONG - Felix latency is in seconds, not milliseconds
# Panel unit set to "ms" with raw seconds value → shows 1000x too high
felix_int_dataplane_apply_time_seconds_sum / felix_int_dataplane_apply_time_seconds_count
# Panel unit: "milliseconds (ms)" → shows 0.05s as 0.05ms (WRONG)

# CORRECT - either use proper unit OR convert the metric
felix_int_dataplane_apply_time_seconds_sum / felix_int_dataplane_apply_time_seconds_count * 1000
# Then set panel unit to "milliseconds (ms)"

# OR: use the histogram quantile directly (more accurate)
histogram_quantile(0.99, rate(felix_int_dataplane_apply_time_seconds_bucket[5m]))
# Set panel unit to "seconds (s)"
```

## Mistake 3: Alert Thresholds Based on Single-Day Baselines

```bash
# WRONG - setting alert threshold based on current value
# On a quiet Sunday, latency is 5ms
# Setting threshold at 50ms (10x current) seems reasonable
# But on a busy Monday with 100 new pods, latency hits 60ms
# causing false alarms

# CORRECT - establish baselines over 1-2 weeks including peak days
# Use Prometheus quantile_over_time:
quantile_over_time(0.99, felix_int_dataplane_apply_time_seconds_sum[14d])
# Set threshold at 3x this value for alerting
```

## Mistake 4: Hardcoding Node Names in Dashboard Queries

```promql
# WRONG - hardcoded node name breaks when nodes are replaced
felix_active_local_policies{node="ip-10-0-1-100.us-east-1.compute.internal"}

# CORRECT - use a Grafana variable
felix_active_local_policies{node="$node"}
# With variable definition: label_values(kube_node_info, node)
```

## Mistake 5: Not Using `rate()` for Counters

```promql
# WRONG - using counter directly for "rate" panel
felix_int_dataplane_apply_time_seconds_count
# Shows ever-increasing number, not useful

# CORRECT - use rate() for per-second calculations
rate(felix_int_dataplane_apply_time_seconds_count[5m])
# Shows operations per second (useful for capacity planning)
```

## Conclusion

The most impactful Calico visualization mistakes involve missing per-node breakdowns (hiding node-specific issues behind aggregates), wrong units (making latency appear 1000x better or worse than reality), and hardcoded values (queries breaking after cluster changes). Build peer review into your dashboard development process so these mistakes are caught before dashboards go to production. A dashboard that misleads is worse than no dashboard at all.
