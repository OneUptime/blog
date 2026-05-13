# Validation Summary: How to Monitor Calico Label-Based Network Policy Impact

## Status
validated

## Post Type
Tutorial / monitoring guide

## Technologies Covered
- Calico Open Source / Felix
- Kubernetes
- Kubernetes labels and label selectors
- kube-state-metrics
- Prometheus and PromQL
- Prometheus Operator PrometheusRule
- Grafana
- kubectl, calicoctl, jq

## Sources Consulted
- Calico Open Source documentation: Monitor Calico component metrics, https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico Open Source documentation: Monitoring Felix with Prometheus, https://docs.tigera.io/calico/latest/reference/felix/prometheus
- kube-state-metrics pod metrics reference, https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- Kubernetes documentation: Metrics for Kubernetes Object States, https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics/
- Kubernetes documentation: Labels and Selectors, https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- Kubernetes documentation: kubectl get, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Prometheus documentation: Query functions, https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus documentation: Alerting rules, https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus Operator API reference for PrometheusRule, https://docs.redhat.com/en/documentation/openshift_container_platform/4.21/html/monitoring_apis/prometheusrule-monitoring-coreos-com-v1
- Grafana documentation: Time series visualization, https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/visualizations/time-series/

## Issues Found
- The post used undocumented/nonexistent Calico OSS Felix metrics: `felix_policy_evaluation_total`, `felix_denied_packets_total`, and `felix_active_network_policies`. Replaced them with documented Felix metrics: `felix_active_local_policies`, `felix_active_local_selectors`, and `felix_label_index_selector_evals`.
- The post described `rate(felix_active_network_policies[5m])` as an allow-vs-deny policy match rate. This was incorrect because the metric name is not documented and active policy counts are gauges, while Prometheus documents `rate()` for counters. Replaced the example with a selector match-rate query based on the documented `felix_label_index_selector_evals` counter.
- The Grafana dashboard and PrometheusRule examples referenced the incorrect denied-packet metric. Replaced those panels and alerts with selector match/no-match queries that align with Calico OSS Felix metrics.
- The description, introduction, and conclusion overstated Calico OSS Felix metrics as direct traffic-decision analytics. Updated the wording to refer to active policy and selector evaluation data.
- The prerequisites did not mention that kube-state-metrics must be configured to expose custom pod labels. Added an example `--metric-labels-allowlist` setting for the `tier` and `environment` labels used in the PromQL examples.
- The Grafana dashboard used the legacy `graph` panel type. Updated it to the current `timeseries` panel type.

## Review Notes
- The `kube_pod_labels` examples are technically valid with the added kube-state-metrics label allowlist prerequisite.
- Calico Enterprise has separate policy metrics such as denied-packet counters, but those are not part of the Calico Open Source Felix metric reference used by this post's prerequisites.
