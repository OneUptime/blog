# Validation Summary: How to Write PromQL Queries for Kubernetes Monitoring

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Prometheus
- PromQL
- Kubernetes monitoring
- kube-state-metrics
- cAdvisor container metrics
- Prometheus Node Exporter
- Grafana dashboards
- Alertmanager alerting

## Sources Consulted
- Prometheus querying basics: https://prometheus.io/docs/prometheus/latest/querying/basics/
- Prometheus query functions: https://prometheus.io/docs/prometheus/3.0/querying/functions/
- Prometheus operators and vector matching: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Kubernetes kube-state-metrics overview: https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics/
- kube-state-metrics pod metric documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- Prometheus Node Exporter guide: https://prometheus.io/docs/guides/node-exporter/

## Issues Found
- The post said counter metrics always go up. I changed this to note that counters monotonically increase except when they reset after a process restart, matching Prometheus counter and `rate()` behavior.
- The `rate()` explanation did not mention counter reset handling. I added that `rate()` adjusts for counter resets.
- The `irate()` guidance recommended it for short-lived jobs. Prometheus documents `irate()` as suitable for graphing volatile, fast-moving counters, so I changed the wording to that narrower use case.
- The aggregation flow showed `sum without namespace` producing total CPU across all namespaces. `sum without(namespace)` preserves all other labels, so I changed the diagram to `sum all series`.
- The Kubernetes CPU and memory request/limit examples filtered only by `resource`. I added `unit="core"` for CPU and `unit="byte"` for memory to match kube-state-metrics resource metric labels and avoid ambiguous joins.
- The vector matching section said matching is required, while its example aggregates both sides to the same label set. I changed the wording to say vector matching can be used, and added the `unit="core"` filter to the request metric.
- The tips said to always use `rate()` on counters and never query raw counter values. I changed this to recommend `rate()` or `increase()` when querying changes over time, which is more accurate for counters.

## Review Notes
PromQL examples were otherwise syntactically consistent with documented selector, aggregation, subquery, function, histogram, and vector matching behavior. `promtool` was not installed in the local environment, so validation was performed against official documentation rather than local parser execution.
