# Validation Summary: How to Configure Alert Notifications via Webhook in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Monitoring
- Prometheus Alertmanager
- Kubernetes
- Helm chart values configuration
- Webhooks
- Python
- Flask

## Sources Consulted
- Rancher receiver configuration docs: https://ranchermanager.docs.rancher.com/v2.13/reference-guides/monitoring-v2-configuration/receivers
- Rancher monitoring Helm chart options: https://ranchermanager.docs.rancher.com/v2.14/reference-guides/monitoring-v2-configuration/helm-chart-options
- Prometheus Alertmanager configuration reference, latest: https://prometheus.io/docs/alerting/latest/configuration/
- Prometheus Alertmanager configuration reference, v0.28: https://prometheus.io/docs/alerting/0.28/configuration/
- Prometheus Alertmanager configuration reference, v0.21: https://prometheus.io/docs/alerting/0.21/configuration/
- Prometheus Alertmanager clients/API guidance: https://prometheus.io/docs/alerting/latest/clients/
- Prometheus Operator API reference for `AlertmanagerSpec.secrets`: https://prometheus-operator.dev/docs/api-reference/api/
- Rancher monitoring chart values for older branches (`dev-v2.6` through `dev-v2.9`) showing Alertmanager `v0.21.0`: https://raw.githubusercontent.com/rancher/charts/dev-v2.6/charts/rancher-monitoring/9.4.203/values.yaml
- Rancher monitoring chart values for `dev-v2.11` showing Alertmanager `v0.28.1`: https://raw.githubusercontent.com/rancher/charts/dev-v2.11/charts/rancher-monitoring/106.1.4+up69.8.2-rancher.23/values.yaml
- Kubernetes `kubectl create secret generic` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic/
- Kubernetes `kubectl port-forward` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/
- Kubernetes `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
- The original prerequisite said Rancher `v2.6 or later`, but the post uses Alertmanager features such as `authorization`, `matchers`, and `http_headers` that are not available in the older Alertmanager `v0.21.0` bundled with Rancher monitoring in the `dev-v2.6` through `dev-v2.9` chart branches. I updated the prerequisite to Rancher `v2.11 or later`, which aligns with Rancher chart branches that bundle Alertmanager `v0.28.1`.
- The webhook payload example omitted fields documented in the current Alertmanager webhook payload schema. I added `truncatedAlerts` and `fingerprint` to match the documented payload format.
- The bearer-token example referenced `credentials_file` without showing how the backing secret would exist inside the Alertmanager pod. I added the secret creation command and the corresponding `alertmanagerSpec.secrets` mount example.
- The custom-headers subsection claimed to demonstrate custom headers, but the original YAML only showed authorization and TLS fields. I replaced it with a real `http_config.http_headers` example that matches the Alertmanager configuration reference.
- The routing example used loose matcher strings that are not the current recommended matcher form for modern Alertmanager configurations. I updated the route examples to use quoted matcher expressions.
- The troubleshooting command used `kubectl logs` with a label selector but no container handling. Because Alertmanager pods are multi-container, that can fail or be incomplete. I updated it to use `--all-containers=true` and a bounded tail.

## Review Notes
- The `kubectl port-forward -n cattle-monitoring-system svc/rancher-monitoring-alertmanager 9093:9093` example assumes the monitoring chart was installed with the default `rancher-monitoring` release name.
- Direct `POST /api/v2/alerts` calls are valid for manual testing, but Prometheus recommends rule-based alerting for normal operation instead of relying on the Alerts API as a primary integration path.
