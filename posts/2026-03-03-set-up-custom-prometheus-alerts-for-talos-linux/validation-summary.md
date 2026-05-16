# Validation Summary: How to Set Up Custom Prometheus Alerts for Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes
- Prometheus and PromQL
- Prometheus Operator `PrometheusRule` resources
- kube-prometheus-stack
- Alertmanager
- kube-state-metrics and node exporter metrics
- `kubectl` and `amtool`
- Slack, email, and PagerDuty notification integrations

## Sources Consulted
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus PromQL operators and vector matching documentation: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Prometheus Alertmanager configuration documentation: https://prometheus.io/docs/alerting/latest/configuration/
- Prometheus Operator API reference for `PrometheusRule` and `AlertmanagerConfig`: https://prometheus-operator.dev/docs/api-reference/api/
- Kubernetes `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kube-state-metrics overview: https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics/
- Google Cloud kube-state-metrics deployment metric reference: https://cloud.google.com/kubernetes-engine/docs/how-to/kube-state-metrics
- Talos Linux FAQ and philosophy documentation: https://www.talos.dev/v1.11/learn-more/faqs/ and https://www.talos.dev/v1.10/learn-more/philosophy/

## Issues Found
- The deployment replica alert used `kube_deployment_status_replicas_available != kube_deployment_spec_replicas` but the annotation referenced `{{ $labels.replicas }}`, which is not produced by those metrics. Changed the expression to calculate missing available replicas and updated the annotation to use `{{ $value }}` correctly.
- The container CPU throttling alert used `rate(container_cpu_cfs_throttled_seconds_total[5m]) > 0.25`, which measures throttled seconds per second rather than the fraction of throttled scheduling periods. Changed it to compare throttled CFS periods against total CFS periods.
- The Alertmanager route example used deprecated `match` fields. Replaced them with current `matchers` syntax.
- The text said notifications were configured for Slack, email, and PagerDuty, but the receiver config only included Slack and PagerDuty. Added an `email_configs` entry using the SMTP globals already shown.
- The PagerDuty receiver used `service_key`, which is for the older Prometheus integration type. Updated it to `routing_key` for PagerDuty Events API v2.
- The inhibition example used deprecated `source_match`, `target_match`, and `target_match_re` fields. Replaced them with `source_matchers` and `target_matchers`, and clarified that node-level inhibition only applies to pod alerts carrying the same `node` label.

## Review Notes
The PrometheusRule examples are valid for Prometheus Operator installations that select rules using the shown `release` label. In real kube-prometheus-stack deployments, the Helm release name, rule selectors, Alertmanager secret name, and node exporter job label can differ, so users should verify those names in their own cluster.
