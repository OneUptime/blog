# Validation Summary: How to Configure Alerting via Webhooks for Rook-Ceph

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Rook-Ceph (Kubernetes storage operator)
- Prometheus Alertmanager
- Prometheus Operator AlertmanagerConfig CRD (v1alpha1)
- Slack Incoming Webhooks
- Kubernetes Secrets
- kubectl CLI
- curl / netcat (testing tools)

## Sources Consulted
- Prometheus Operator v1alpha1 Go type definitions: https://pkg.go.dev/github.com/prometheus-operator/prometheus-operator/pkg/apis/monitoring/v1alpha1
- Alertmanager webhook_config documentation: https://prometheus.io/docs/alerting/latest/configuration/#webhook_config
- Alertmanager API v2 (POST /api/v2/alerts): https://prometheus.io/docs/alerting/latest/clients/
- OKD AlertmanagerConfig v1alpha1 API Reference: https://docs.okd.io/4.10/rest_api/monitoring_apis/alertmanagerconfig-monitoring-coreos-com-v1alpha1.html
- Prometheus Operator alerting documentation: https://prometheus-operator.dev/docs/developer/alerting/

## Issues Found
No technical issues found.

## Review Notes
- The `apiVersion: monitoring.coreos.com/v1alpha1` is valid but noted as an unstable API. The CRD has since been promoted to `v1beta1` and `v1` in newer prometheus-operator releases. Users on recent versions may want to use the newer API versions.
- The `nc -l -p 8080` command uses GNU/Linux netcat syntax. On macOS/BSD, the equivalent is `nc -l 8080` (without `-p`). This is a minor portability note, not an error.
- The test section demonstrates three independent utilities (nc listener, port-forward, curl) but doesn't explicitly show how to configure Alertmanager to route to the local nc listener. The curl command correctly triggers Alertmanager's alert pipeline, which would then route to whatever webhook is configured.
- The webhook payload example omits some optional fields (`endsAt`, `generatorURL`, `fingerprint`, `externalURL`, `truncatedAlerts`) for brevity, which is fine for illustrative purposes.
