# Validation Summary: How to Use PromQL Queries in Amazon Managed Prometheus

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon Managed Service for Prometheus / Amazon Managed Prometheus (AMP)
- PromQL
- Prometheus HTTP API
- awscurl and AWS Signature Version 4
- Amazon Managed Grafana
- Kubernetes metrics from kube-state-metrics
- Prometheus Node Exporter metrics

## Sources Consulted
- AWS documentation: Query using Prometheus-compatible APIs - https://docs.aws.amazon.com/prometheus/latest/userguide/AMP-onboard-query-APIs.html
- AWS documentation: Use awscurl to query with Prometheus-compatible APIs - https://docs.aws.amazon.com/prometheus/latest/userguide/AMP-compatible-APIs.html
- AWS documentation: QueryMetrics API - https://docs.aws.amazon.com/prometheus/latest/userguide/AMP-APIReference-QueryMetrics.html
- AWS documentation: Amazon Managed Service for Prometheus endpoints and quotas - https://docs.aws.amazon.com/general/latest/gr/prometheus-service.html
- Prometheus documentation: Querying basics - https://prometheus.io/docs/prometheus/latest/querying/basics/
- Prometheus documentation: HTTP API - https://prometheus.io/docs/prometheus/latest/querying/api/
- Prometheus documentation: Query functions - https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus documentation: Monitoring Linux host metrics with the Node Exporter - https://prometheus.io/docs/guides/node-exporter/
- Kubernetes documentation: Metrics for Kubernetes Object States - https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics/
- kube-state-metrics documentation: Pod metrics - https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md

## Issues Found
- The post stated that every open-source Prometheus query works with AMP and that authentication is the only difference. I softened this to say AMP supports PromQL through Prometheus-compatible APIs and that queries generally work subject to AWS service quotas and supported API features. This matches AWS's Prometheus-compatible API documentation and avoids an overbroad compatibility claim.
- The awscurl install command used `pip install awscurl`. AWS's current AMP awscurl documentation shows `pip3 install awscurl` for Linux, so I updated the command.
- The node memory query was labeled as returning GB but returned raw bytes. I changed the comment to GiB and divided by 1024 three times.
- The average CPU query averaged all non-idle CPU modes directly, which underreports total CPU usage because CPU usage is distributed across multiple mode series. I changed it to compute usage from the average idle rate.
- The memory aggregation comment said "Max memory usage across pods" while the query grouped by pod and returned the maximum container series for each pod. I clarified the comment to "Max container memory usage per pod."
- The active pod count query used `count(kube_pod_status_phase{phase="Running"}) by (namespace)`, which counts the `phase="Running"` time series even when its gauge value is 0. I changed it to `sum(kube_pod_status_phase{phase="Running"}) by (namespace)` so it counts only pods currently in the Running phase.

## Review Notes
The PromQL examples are syntactically valid patterns for conventional Prometheus metrics, assuming the metric names and labels used in the examples exist in the reader's environment. The kube-state-metrics documentation recommends kube-scheduler's `kube_pod_resource_limit` metric over `kube_pod_container_resource_limits` where available because it is more precise; the existing examples remain usable with kube-state-metrics.
