# Validation Summary: How to Use Grafana Provisioning to Auto-Deploy Kubernetes Dashboards from Git

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana provisioning
- Grafana dashboards and datasources
- Grafana alerting contact points
- Kubernetes Deployments, ConfigMaps, and volumes
- Kustomize
- Helm and the Grafana Helm chart
- Argo CD GitOps sync
- kubectl, jq, curl, and git

## Sources Consulted
- Grafana provisioning documentation: https://grafana.com/docs/grafana/latest/administration/provisioning/
- Grafana alerting file provisioning documentation: https://grafana.com/docs/grafana/latest/alerting/set-up/provision-alerting-resources/file-provisioning/
- Grafana Helm chart values: https://github.com/grafana/helm-charts/blob/main/charts/grafana/values.yaml
- Helm values file documentation: https://helm.sh/docs/v3/chart_template_guide/values_files/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization
- Kubernetes ConfigMap documentation: https://kubernetes.io/docs/concepts/configuration/configmap/
- kubectl create configmap reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_configmap/
- Argo CD automated sync policy documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/

## Issues Found
- The provisioning overview said Grafana generally watches all provisioning files. Updated it to clarify that provisioning loads configuration at startup, while dashboard provisioning can check dashboard files for changes.
- The dashboard ConfigMap contained invalid placeholder JSON (`[...]`) and lacked enough dashboard metadata to be a useful provisioning example. Replaced it with valid dashboard JSON, added stable dashboard UIDs, `schemaVersion`, `version`, `overwrite`, and a Prometheus datasource UID reference.
- The datasource provisioning example did not define the Prometheus UID used by the dashboard. Added `uid: prometheus`.
- The Git sidecar Deployment snippet was missing the required `apps/v1` Deployment selector and matching pod labels. Added them and made the sync loop remove stale JSON files before copying the latest files.
- The alert notification channel example used the legacy `notifiers` shape. Replaced it with Grafana Alerting contact point provisioning under `contactPoints` and added the correct `/etc/grafana/provisioning/alerting` mount path.
- The Helm values example used Helm template syntax inside `values.yaml`, which Helm values files do not render. Replaced it with the Grafana chart's supported `dashboards.default.*.file` entries.
- The Helm dashboard provider example used `editable`; changed it to Grafana's documented `allowUiUpdates`.
- The Helm install command assumed the Grafana repo and namespace already existed. Added `helm repo add` and `--create-namespace`.
- The CI ConfigMap update command omitted the `monitoring` namespace. Added `-n monitoring`.

## Review Notes
The Kustomize example disables the generated ConfigMap name hash to keep the mounted ConfigMap name stable. That matches the rest of the article, but teams that want Kubernetes rollouts on dashboard ConfigMap changes may prefer leaving the hash enabled and letting Kustomize update references.
