# Validation Summary: How to Deploy kube-prometheus-stack with Grafana and Alertmanager on Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Helm 3
- kube-prometheus-stack
- Prometheus Operator
- Prometheus
- Grafana
- Alertmanager
- ServiceMonitor and PodMonitor CRDs
- Node exporter
- kube-state-metrics

## Sources Consulted
- kube-prometheus-stack chart README: https://github.com/prometheus-community/helm-charts/blob/main/charts/kube-prometheus-stack/README.md
- kube-prometheus-stack chart metadata and values: https://github.com/prometheus-community/helm-charts/tree/main/charts/kube-prometheus-stack
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Alertmanager configuration reference: https://prometheus.io/docs/alerting/latest/configuration/
- Helm install documentation: https://helm.sh/docs/helm/helm_install/
- Helm upgrade documentation: https://helm.sh/docs/helm/helm_upgrade/
- Kubernetes kubectl port-forward reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/
- Grafana HTTP API authentication documentation: https://grafana.com/docs/grafana/latest/developers/http_api/auth/

## Issues Found
- The prerequisites listed Kubernetes 1.19+, but current kube-prometheus-stack chart metadata requires Kubernetes 1.25+. Updated the prerequisite to 1.25+ for current chart releases.
- The Prometheus `retentionSize` example used `"50GB"`, while the current chart values document the expected byte-size unit format as values like `"50GiB"`. Updated it to `"50GiB"`.
- The Alertmanager route examples used the deprecated `match` field. Updated them to the current `matchers` syntax.
- The custom-values install command reused the same Helm release name after the default install, which would fail with `helm install`. Changed it to `helm upgrade --install` with `--create-namespace`.
- The pod list referred to `prometheus-server`, which is not the component name used by kube-prometheus-stack. Updated it to `prometheus`.
- The ServiceMonitor discovery explanation implied automatic discovery without mentioning Prometheus selector behavior. Updated it to state that ServiceMonitor and PodMonitor resources are selected by the Prometheus resource.
- The Grafana dashboard verification command called the Grafana API without authentication. Updated it to retrieve the chart-managed admin password from the Grafana Secret, port-forward the service, and call the API with basic authentication.

## Review Notes
- The post uses the Prometheus community Helm repository URL, which remains valid. Current chart documentation also shows OCI-based installation through `oci://ghcr.io/prometheus-community/charts/kube-prometheus-stack`; the repository-based flow is still usable.
- The sample `storageClassName: standard`, ingress hostnames, Slack webhook URL, and Loki URL are environment-specific placeholders and should be adjusted by readers for their clusters.
