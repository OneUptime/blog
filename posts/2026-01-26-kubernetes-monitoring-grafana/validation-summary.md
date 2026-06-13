# Validation Summary: How to Configure Kubernetes Monitoring in Grafana

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Grafana
- Prometheus
- PromQL
- Helm
- kube-prometheus-stack
- kube-state-metrics
- node-exporter
- cAdvisor
- Alertmanager / Prometheus alerting rules

## Sources Consulted
- Helm install command documentation: https://helm.sh/docs/helm/helm_install/
- Kubernetes kubectl port-forward reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/
- Kubernetes kube-state-metrics overview: https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics/
- kube-prometheus-stack chart and values: https://github.com/prometheus-community/helm-charts/tree/main/charts/kube-prometheus-stack
- kube-state-metrics pod metrics reference: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- kube-state-metrics deployment metrics reference: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/deployment-metrics.md
- Grafana Prometheus template variables documentation: https://grafana.com/docs/grafana/latest/datasources/prometheus/template-variables/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus recording rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- Prometheus querying basics: https://prometheus.io/docs/prometheus/latest/querying/basics/
- Prometheus node_exporter project documentation: https://github.com/prometheus/node_exporter
- cAdvisor Prometheus metrics documentation: https://github.com/google/cadvisor/blob/master/docs/storage/prometheus.md

## Issues Found
- The Grafana variable examples used the deprecated classic `label_values(metric, label)` syntax. Updated them to the current Prometheus query variable style with `Query type: Label values`, `Metric`, `Label`, and label filters where needed.
- The node status table query matched all `Ready` condition status series, which would include true, false, and unknown condition rows. Added `status="true"` to return only the ready status series.
- The workload pod details query joined pod info with every phase series, including zero-valued phases. Changed it to join only active phase series with `(kube_pod_status_phase == 1)` and carry the `phase` label.
- The node dashboard selected Kubernetes node names but filtered node-exporter metrics by the `instance` label using a node-name regex. Added a separate `instance` variable sourced from `node_uname_info` and updated node-exporter queries to filter on `instance="$instance"`.
- The pod and deployment alert examples were YAML fragments rather than complete Prometheus rule files. Wrapped them in `groups` and `rules` blocks.
- The crash-loop alert estimated restarts with `rate(...) * 60 * 15`. Replaced it with the clearer and equivalent `increase(...[15m]) > 3`.
- The pod readiness alert checked the zero value of the `condition="true"` series. Updated it to the more direct kube-state-metrics pattern `kube_pod_status_ready{condition="false"} == 1`.
- The deployment mismatch alert used `!=`, which would make `$value` represent the desired replica count rather than unavailable replicas. Changed the expression to subtract available replicas from desired replicas and alert when the difference is greater than zero.
- The label filtering example used a bare selector `{namespace!~"kube-system|monitoring"}`. This is invalid PromQL because a vector selector needs a metric name or at least one matcher that cannot match the empty string. Updated it to a concrete metric selector.

## Review Notes
- The Helm install and kubectl port-forward commands are current and match official command references.
- The kube-state-metrics resource request and limit metrics used in the post are still documented as stable, but kube-state-metrics recommends scheduler-provided pod resource metrics where available for more precise request and limit data.
- The deployment health ratio can divide by zero for deployments intentionally scaled to zero; future dashboard work could handle that display case explicitly.
