# Validation Summary: How to Monitor Calico Node CrashLoopBackOff

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Calico
- Kubernetes
- kube-state-metrics
- Prometheus
- Prometheus Operator
- Kubernetes CronJob
- Kubernetes events

## Sources Consulted
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes field selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes kubectl events reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/
- kube-state-metrics pod metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Calico calico/node configuration documentation: https://docs.tigera.io/calico/latest/reference/configure-calico-node
- Calico Felix configuration documentation: https://docs.tigera.io/calico/latest/reference/resources/felixconfig

## Issues Found
- The post claimed the monitoring setup included log-based detection and Felix structured log patterns, but the implementation monitors Kubernetes BackOff events rather than calico-node log content. Updated the description, introduction, and root-cause wording to accurately describe Prometheus metrics and Kubernetes event monitoring.
- The post stated that kube-state-metrics might not be "scraping kube-system namespace." kube-state-metrics exposes object-state metrics from the Kubernetes API, while Prometheus scrapes kube-state-metrics. Updated the wording to distinguish kube-state-metrics deployment, Prometheus scraping, and kube-state-metrics permissions to watch pods in kube-system.
- The opening explanation said each crash cycle withdraws BGP routes. Calico can run in modes where BGP is not the active routing mechanism, and route impact depends on the deployment. Updated the wording to say crashes can disrupt node networking and, in BGP-backed Calico deployments, route advertisement from the affected node.

## Review Notes
The PrometheusRule shape, PromQL metric names, Kubernetes event field selector, and batch/v1 CronJob structure are consistent with the consulted documentation. The CronJob example uses a broad existing service account and a floating `latest` image tag; these are operational hardening concerns rather than syntax or correctness errors.
