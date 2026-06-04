# Validation Summary: How to Deploy Grafana with Pre-Provisioned Dashboards Using ConfigMaps

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Grafana dashboard provisioning
- Grafana Helm chart and kube-prometheus-stack
- Kubernetes ConfigMaps
- kubectl
- Helm
- Prometheus dashboard queries

## Sources Consulted
- Grafana provisioning documentation: https://grafana.com/docs/grafana/latest/administration/provisioning/
- Grafana Helm chart documentation and values: https://github.com/grafana-community/helm-charts/tree/main/charts/grafana
- kube-prometheus-stack values: https://github.com/prometheus-community/helm-charts/blob/main/charts/kube-prometheus-stack/values.yaml
- Kubernetes kubectl create configmap reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_configmap/
- Kubernetes kubectl label reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/#label
- Grafana dashboard HTTP API documentation: https://grafana.com/docs/grafana/latest/developers/http_api/dashboard/
- Grafana API migration documentation: https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/apis-migration/

## Issues Found
- The dashboard provider examples used `editable: true` in the provisioning provider. Grafana dashboard provisioning documents `allowUiUpdates` for allowing UI updates to provisioned dashboards, so the provider example was changed to `allowUiUpdates: true`.
- The initial provider ConfigMap used the same `grafana_dashboard` label as dashboard ConfigMaps. With the Grafana sidecar, that label is used to collect dashboard files, so the provider ConfigMap label was removed to avoid the sidecar treating `provider.yaml` as a dashboard.
- The Helm values example mixed static dashboard provisioning with sidecar ConfigMap discovery and referenced a local dashboard file path that was not mounted by the example. The example was simplified to the sidecar-based ConfigMap workflow used by the rest of the post.
- The sidecar deletion setting used `enableDeletion`, which is not a Grafana Helm chart dashboard sidecar value. It was corrected to `provider.disableDelete: false`.
- The Helm install command assumed the `monitoring` namespace already existed. `--create-namespace` was added so the command works for a fresh namespace.
- Several `kubectl label` examples were not idempotent. `--overwrite` was added because `kubectl label` otherwise errors when an existing label would be overwritten.
- The dashboard export example used an API key variable and the legacy `/api/dashboards/uid/:uid` endpoint. It was updated to use a service account token variable and the current `/apis/dashboard.grafana.app/v1/...` dashboard endpoint, extracting `.spec` for provisioning.
- One placeholder dashboard JSON example used `[...]`, which is not valid JSON. It was changed to an empty array.
- The rollback best practice suggested enabling Grafana dashboard versioning for provisioned dashboards. Since file-provisioned dashboards should be rolled back through the provisioning source, this was changed to using Git history.

## Review Notes
The examples assume a Prometheus datasource with UID `prometheus`, which is typical for kube-prometheus-stack but may differ in customized Grafana installations. The PromQL examples depend on kube-state-metrics, node-exporter, and container CPU metrics being available in the target cluster.
