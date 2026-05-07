# Validation Summary: How to Create Custom Prometheus Rules in Rancher

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rancher Manager
- Kubernetes
- Prometheus
- Prometheus Operator
- PromQL
- `kubectl`

## Sources Consulted
- Rancher: Configuring PrometheusRules — https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/monitoring-v2-configuration-guides/advanced-configuration/prometheusrules
- Rancher: Prometheus Configuration — https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/monitoring-v2-configuration-guides/advanced-configuration/prometheus
- Rancher: How Monitoring Works — https://ranchermanager.docs.rancher.com/integrations-in-rancher/monitoring-and-alerting/how-monitoring-works
- Rancher chart: `rancher-monitoring` values (`ruleSelector`, `ruleNamespaceSelector`) — https://raw.githubusercontent.com/rancher/charts/main/charts/rancher-monitoring/values.yaml
- Rancher chart: Prometheus template (`ruleSelector`, `ruleNamespaceSelector`) — https://raw.githubusercontent.com/rancher/charts/main/charts/rancher-monitoring/templates/prometheus/prometheus.yaml
- Rancher chart: Prometheus service template — https://raw.githubusercontent.com/rancher/charts/main/charts/rancher-monitoring/templates/prometheus/service.yaml
- Prometheus: Alerting rules — https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus: Recording rules — https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- Prometheus: Template reference — https://prometheus.io/docs/prometheus/latest/configuration/template_reference/
- Prometheus: Operators — https://prometheus.io/docs/prometheus/latest/querying/operators/
- Prometheus Operator API reference — https://prometheus-operator.dev/docs/api-reference/api/
- Kubernetes: `kubectl port-forward` — https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward
- Kubernetes: `kubectl logs` — https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
1. **The post incorrectly claimed Rancher requires `app: rancher-monitoring` and `release: rancher-monitoring` labels on custom `PrometheusRule` resources.** Current `rancher-monitoring` chart defaults use `ruleSelector: {}` with `ruleNamespaceSelector: {}`, so custom rules are selected without extra labels unless the selector has been customized. I replaced that explanation and removed the hard-coded labels from the YAML examples.

2. **The `DeploymentReplicasMismatch` alert description misused `$value`.** In Prometheus comparison expressions without the `bool` modifier, the surviving sample keeps the left-hand-side value, so `$value` in `kube_deployment_spec_replicas != kube_deployment_status_replicas_available` is not the available replica count. I rewrote the annotation so it no longer states the wrong replica value.

3. **The Rancher UI workflow was outdated/inaccurate.** Rancher’s current docs use **Monitoring > Advanced > Prometheus Rules** and the UI asks for a **Group Name**; it also expects a rule group to contain either alerting rules or recording rules. I updated the UI steps accordingly.

4. **One recording-rule example had a metric name that did not match its query semantics.** `namespace:container_restarts:rate1h` used `increase(...)`, which returns a count increase over the hour rather than a per-second rate. I renamed the example to `namespace:container_restarts:increase1h` and updated the accompanying comment.

## Review Notes
- Rancher `v2.6` documentation is archived, and customized monitoring installs can override `ruleSelector` and `ruleNamespaceSelector`. The updated post now reflects current Rancher defaults while still warning readers to match custom selectors when they exist.
- Several PromQL examples depend on application-specific metrics and labels such as `http_request_duration_seconds_bucket`, `http_requests_total`, and `service`. Those examples are technically valid, but readers still need to adapt them to the metrics exposed in their own clusters.
