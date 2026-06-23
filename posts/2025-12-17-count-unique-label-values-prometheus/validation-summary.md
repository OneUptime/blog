# Validation Summary: How to Count Unique Label Values in Prometheus

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Prometheus
- PromQL
- Grafana Prometheus template variables
- Prometheus recording and alerting rules
- Kubernetes metrics from kube-state-metrics

## Sources Consulted
- Prometheus aggregation operators documentation: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Prometheus querying basics and subquery syntax: https://prometheus.io/docs/prometheus/latest/querying/basics/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus recording rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Grafana Prometheus template variables documentation: https://grafana.com/docs/grafana/latest/datasources/prometheus/template-variables/
- Prometheus TSDB metric source definition for `prometheus_tsdb_head_series_created_total`: https://github.com/prometheus/prometheus/blob/main/tsdb/head.go

## Issues Found
- The post described `count`, `group`, and `label_values()` as PromQL functions. Prometheus documents `count` and `group` as aggregation operators, while `label_values()` is a Grafana Prometheus variable query helper rather than PromQL. Updated the description and explanatory text to use the correct terminology.
- Several examples counted "per job", "per endpoint", or "per namespace" after an inner `group by` had already dropped the outer grouping label. Updated those examples to keep the outer label in the inner `group by`, then aggregate with `count by (...)`.
- The CPU condition example grouped raw per-CPU idle rates by instance, which could count an instance if any individual CPU had low idle time. Updated it to average idle rate by instance before counting matching instances.
- The service error-rate example divided matching 5xx series by all request series without first aggregating by service, which would not calculate a service-level error ratio correctly. Updated it to use `sum by (service)` for numerator and denominator.
- The `count_over_time(count(...)[1h:5m])` example counted subquery samples, not instances that reported during the hour. Replaced it with `count(group by (instance) (max_over_time(up[1h])))`.
- The "maximum unique pods seen in 24 hours" example grouped only by pod name, which can undercount when pod names collide across namespaces. Updated it to group by both `namespace` and `pod`.
- The TSDB churn example described `rate(prometheus_tsdb_head_series_created_total[5m])` as "series created per scrape"; because `rate()` returns a per-second average rate for counters, updated the comment to "series created per second."

## Review Notes
The corrected PromQL and rule snippets were checked against official Prometheus and Grafana documentation. Local `promtool` was not available in the workspace, so snippets were reviewed manually against the documented PromQL grammar and rule formats.
