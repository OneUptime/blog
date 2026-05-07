# Validation Summary: How to Configure ServiceMonitors in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Monitoring
- Kubernetes
- Prometheus
- Prometheus Operator
- ServiceMonitor CRDs
- `kubectl`

## Sources Consulted
- Rancher: ServiceMonitor and PodMonitor Configuration: https://ranchermanager.docs.rancher.com/v2.14/reference-guides/monitoring-v2-configuration/servicemonitors-and-podmonitors
- Rancher: How Monitoring Works: https://ranchermanager.docs.rancher.com/integrations-in-rancher/monitoring-and-alerting/how-monitoring-works
- Rancher: Enable Prometheus Federator: https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/monitoring-alerting-guides/prometheus-federator-guides/enable-prometheus-federator
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus Community `kube-prometheus-stack` values: https://github.com/prometheus-community/helm-charts/blob/main/charts/kube-prometheus-stack/values.yaml
- Prometheus Community `kube-prometheus-stack` Prometheus template: https://github.com/prometheus-community/helm-charts/blob/main/charts/kube-prometheus-stack/templates/prometheus/prometheus.yaml
- Prometheus Community `kube-prometheus-stack` Prometheus service template: https://github.com/prometheus-community/helm-charts/blob/main/charts/kube-prometheus-stack/templates/prometheus/service.yaml
- Prometheus Community `kube-prometheus-stack` Prometheus Operator deployment template: https://github.com/prometheus-community/helm-charts/blob/main/charts/kube-prometheus-stack/templates/prometheus-operator/deployment.yaml
- Kubernetes `kubectl` command reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands/
- Kubernetes `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
- The post stated that `labels.release: rancher-monitoring` is required for Prometheus discovery in all cases. I changed this to the technically correct default-install behavior: Rancher Monitoring typically selects ServiceMonitors by the Helm release label, but a different release name or a customized `serviceMonitorSelector` changes that requirement.
- The bearer token example used `bearerTokenSecret`, which the current Prometheus Operator API marks as deprecated. I replaced it with the supported `authorization.credentials` form.
- The troubleshooting section only told readers to check `serviceMonitorNamespaceSelector`. I corrected it to also check the ServiceMonitor's own `namespaceSelector`, which controls cross-namespace Service discovery.
- The port guidance implied ServiceMonitors always reference Service ports by name. I narrowed that wording so it accurately describes the examples in the post rather than presenting it as a universal rule.

## Review Notes
- The post is technically sound after the above fixes.
- The examples assume the default Rancher Monitoring Helm release name of `rancher-monitoring`. Clusters installed with a different release name or custom Prometheus selectors need matching labels and resource names.
