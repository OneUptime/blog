# Validation Summary: How to Deploy Prometheus Stack on Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- Helm
- Prometheus
- Prometheus Operator
- kube-prometheus-stack
- cert-manager
- Velero
- Longhorn

## Sources Consulted
- Rancher project annotation and namespace guidance: https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/manage-projects/manage-project-resource-quotas/about-project-resource-quotas
- Rancher project workflow example: https://ranchermanager.docs.rancher.com/v2.11/api/workflows/projects
- Prometheus Community `kube-prometheus-stack` README: https://github.com/prometheus-community/helm-charts/blob/main/charts/kube-prometheus-stack/README.md
- Prometheus Community `kube-prometheus-stack` chart metadata: https://raw.githubusercontent.com/prometheus-community/helm-charts/main/charts/kube-prometheus-stack/Chart.yaml
- Prometheus Community `kube-prometheus-stack` values: https://raw.githubusercontent.com/prometheus-community/helm-charts/main/charts/kube-prometheus-stack/values.yaml
- Prometheus Community Prometheus template showing `serviceMonitorSelector` and storage wiring: https://raw.githubusercontent.com/prometheus-community/helm-charts/main/charts/kube-prometheus-stack/templates/prometheus/prometheus.yaml
- Prometheus Community Prometheus ingress template: https://raw.githubusercontent.com/prometheus-community/helm-charts/main/charts/kube-prometheus-stack/templates/prometheus/ingress.yaml
- Prometheus Community Prometheus service template: https://raw.githubusercontent.com/prometheus-community/helm-charts/main/charts/kube-prometheus-stack/templates/prometheus/service.yaml
- Prometheus Operator storage documentation: https://prometheus-operator.dev/docs/platform/storage/
- cert-manager Certificate documentation: https://cert-manager.io/docs/usage/certificate/
- Velero schedule and backup documentation: https://velero.io/docs/v1.17/api-types/schedule/ and https://velero.io/docs/v1.17/backup-reference/
- Longhorn storage class documentation: https://longhorn.io/docs/latest/references/storage-class-parameters/

## Issues Found
- The post installed `bitnami/prometheus-stack`, but Bitnami does not publish a chart with that name. I changed the install and upgrade commands to use the current Prometheus Community chart: `prometheus-community/kube-prometheus-stack`.
- The original Helm `--set` keys (`persistence.*` and `ingress.*`) did not match the current chart schema. I replaced them with a `prometheus-stack-values.yaml` example that uses `prometheus.prometheusSpec.storageSpec` and `prometheus.ingress`, which are the supported values for this chart.
- The standalone PVC example was not consumed by the chart and would not have provisioned Prometheus storage. I replaced it with a values file example wired to the chart’s persistent storage configuration.
- The prerequisites did not reflect the current chart’s Kubernetes requirement. I updated the prerequisite text to require a Rancher-managed Kubernetes 1.25+ cluster, matching the chart’s current `kubeVersion`.
- The ServiceMonitor example used the wrong release label and a selector that would not match the chart’s Prometheus service. I removed that broken example and replaced the step with verification commands for the built-in Prometheus and ServiceMonitor resources that the chart already creates.
- The backup CronJob was not valid for this stack: it referenced a Bitnami image and an entrypoint path that do not exist for `kube-prometheus-stack`. I replaced it with a valid Velero `Schedule` example for namespace backups with volume snapshots.
- The deployment test used a generic root URL and a pod selector that did not correspond to the corrected chart. I changed the readiness check to `/-/ready` and updated the log example to select a pod by the Helm release instance label.
- The upgrade verification used `kubectl rollout status deployment/prometheus-stack`, but this chart does not create a deployment with that name for Prometheus. I replaced it with `helm status` plus a pod status check.

## Review Notes
- The guide now matches the current Prometheus Community chart structure, but it exposes only the Prometheus UI through ingress. Grafana and Alertmanager ingress or persistence can be added later if the blog wants to cover those components explicitly.
- The Velero example assumes Velero is already installed and that CSI or provider-backed volume snapshots are configured. Without that backup plumbing, the schedule resource alone is not sufficient.
- Rancher `v2.7+` is an older lower bound. The corrected prerequisite now highlights the Kubernetes version required by the current chart, which is the stricter compatibility constraint for this deployment path.
