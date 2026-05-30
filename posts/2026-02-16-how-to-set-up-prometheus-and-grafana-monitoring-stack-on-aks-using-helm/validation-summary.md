# Validation Summary: How to Set Up Prometheus and Grafana Monitoring Stack on AKS Using Helm

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Kubernetes
- Helm
- kube-prometheus-stack
- Prometheus Operator
- Prometheus
- Alertmanager
- Grafana
- Node Exporter
- kube-state-metrics
- Kubernetes Ingress

## Sources Consulted
- kube-prometheus-stack chart values: https://github.com/prometheus-community/helm-charts/blob/main/charts/kube-prometheus-stack/values.yaml
- kube-prometheus-stack chart README: https://github.com/prometheus-community/helm-charts/blob/main/charts/kube-prometheus-stack/README.md
- Prometheus Operator API reference: https://github.com/prometheus-operator/prometheus-operator/blob/main/Documentation/api-reference/api.md
- Alertmanager configuration documentation: https://prometheus.io/docs/alerting/latest/configuration/
- Grafana dashboard JSON model documentation: https://grafana.com/docs/grafana/latest/reference/dashboard/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Helm install documentation: https://docs.helm.sh/docs/helm/helm_install/
- AKS storage documentation: https://learn.microsoft.com/azure/aks/concepts-storage

## Issues Found
- The Alertmanager example used the deprecated `match` route field. Updated it to use `matchers`, which is the current Alertmanager routing syntax.
- The Alertmanager Secret example did not explain how kube-prometheus-stack would use the manually created Secret. Added the required Helm values, `alertmanager.alertmanagerSpec.useExistingSecret: true` and `alertmanager.alertmanagerSpec.configSecret: alertmanager-config`.
- The Grafana dashboard ConfigMap used an API import wrapper with a top-level `dashboard` object, which is not the dashboard JSON model expected by the Grafana sidecar provisioning flow. Updated the JSON to a direct dashboard object with `title`, `schemaVersion`, and `panels`.
- The dashboard panel used the old `graph` panel type. Updated it to `timeseries`, the current Grafana time series visualization type.

## Review Notes
The local environment does not have `helm` or `kubectl` installed, so CLI syntax was checked against official Helm and Kubernetes documentation instead of local `--help` output. The Ingress example is syntactically valid, but it assumes an nginx Ingress controller and cert-manager cluster issuer already exist. The chart values use the current `managed-csi` AKS storage class and current kube-prometheus-stack selector settings.
