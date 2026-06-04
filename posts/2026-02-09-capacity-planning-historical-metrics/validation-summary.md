# Validation Summary: How to Perform Capacity Planning for Kubernetes Clusters

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kubernetes
- Prometheus
- PromQL
- kube-state-metrics
- Node Exporter metrics
- Python
- scikit-learn
- NumPy
- Matplotlib
- AWS instance cost modeling

## Sources Consulted
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus remote write tuning documentation: https://prometheus.io/docs/practices/remote_write/
- Prometheus querying basics and subquery syntax: https://prometheus.io/docs/prometheus/latest/querying/basics/
- Prometheus operators documentation: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Prometheus functions documentation, including `predict_linear` and `_over_time` functions: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus HTTP API documentation: https://prometheus.io/docs/prometheus/latest/querying/api/
- Kubernetes kubelet reference for `max-pods`: https://kubernetes.io/docs/reference/command-line-tools-reference/kubelet/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes kube-state-metrics overview: https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics/
- kube-state-metrics project documentation: https://github.com/kubernetes/kube-state-metrics

## Issues Found
- The node resource usage snippet used assignment-like YAML syntax for PromQL expressions. I changed it to a valid Prometheus recording rules file using `record` and `expr`.
- Several PromQL examples were shown as YAML variables with `name = |`, which is not valid YAML or PromQL. I changed those snippets to `promql` fenced blocks containing executable PromQL expressions.
- The seasonal pattern queries used invalid `by (hour, weekday)` and `by (day)` clauses after `avg_over_time`; PromQL grouping applies to aggregation operators, not range-vector functions, and those labels are not automatically present. I replaced them with valid weekly and monthly peak subquery examples.
- The Kubernetes pod capacity example said the default max pods per node was 100. The kubelet default `--max-pods` value is 110, so I corrected the value and comment.
- The standalone node-requirement Python snippet used `np.ceil` without importing NumPy. I added `import numpy as np`.
- The capacity alert expressions placed range selectors directly after aggregated expressions, which is invalid PromQL. I changed them to subqueries such as `avg(node_cpu_usage_percent)[7d:1h]`.

## Review Notes
The examples are technically valid as planning guidance, but real clusters should tune the PromQL filters for their exporters and managed Kubernetes provider. In particular, filesystem metrics often need mountpoint and filesystem filters, and pod-per-node limits can differ from the kubelet default when a cloud provider or CNI imposes lower limits.
