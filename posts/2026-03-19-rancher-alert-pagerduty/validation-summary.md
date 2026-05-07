# Validation Summary: How to Configure Alert Notifications via PagerDuty in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Monitoring
- Kubernetes
- Prometheus Alertmanager
- Prometheus Operator (`PrometheusRule`)
- PagerDuty Events API v2
- Helm chart values
- `kubectl`

## Sources Consulted
- Prometheus Alertmanager configuration: https://prometheus.io/docs/alerting/latest/configuration/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Rancher receiver configuration: https://ranchermanager.docs.rancher.com/v2.13/reference-guides/monitoring-v2-configuration/receivers
- Rancher monitoring enablement and additional secrets: https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/monitoring-alerting-guides/enable-monitoring
- PagerDuty services and integrations: https://support.pagerduty.com/main/docs/services-and-integrations
- PagerDuty Common Event Format (PD-CEF): https://support.pagerduty.com/main/docs/pd-cef
- PagerDuty service regions: https://support.pagerduty.com/main/docs/service-regions
- PagerDuty agent troubleshooting guide: https://support.pagerduty.com/main/docs/pagerduty-agent-troubleshooting-guide
- Kubernetes `kubectl create secret generic` reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Kubernetes `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Upstream `kube-prometheus-stack` chart values reference: https://github.com/prometheus-community/helm-charts/blob/main/charts/kube-prometheus-stack/values.yaml

## Issues Found
- The troubleshooting command used `kubectl logs` without selecting the `alertmanager` container and, with a label selector, would default to a limited tail of recent lines. I changed it to `-c alertmanager --tail=-1 --prefix` so it targets the correct container and shows complete relevant log output.
- The troubleshooting section claimed an invalid integration key produces `403 Forbidden` and only mentioned `events.pagerduty.com`. PagerDuty’s current docs do not support that exact blanket claim, and PagerDuty has both US and EU Events API endpoints. I changed the text to a general PagerDuty API error check and updated the network note to cover `events.pagerduty.com` and `events.eu.pagerduty.com`.

## Review Notes
- The Alertmanager PagerDuty examples are otherwise aligned with current Prometheus documentation for Events API v2, including `routing_key_file`, `details`, `links`, `class`, `component`, and `group`.
- Rancher’s documentation still includes legacy PagerDuty examples using `service_key` for the older `Prometheus` integration type; this post correctly uses Events API v2 with `routing_key_file`.
- The test `PrometheusRule` assumes the default Rancher Monitoring label selector pattern (`release: rancher-monitoring`), which is consistent with the upstream chart defaults.
