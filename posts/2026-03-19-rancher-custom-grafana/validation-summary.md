# Validation Summary: How to Create Custom Grafana Dashboards in Rancher

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rancher
- Rancher Monitoring (`rancher-monitoring`)
- Grafana
- Kubernetes ConfigMaps
- Prometheus / PromQL
- `kubectl`

## Sources Consulted
- Rancher: Persistent Grafana Dashboards: https://ranchermanager.docs.rancher.com/v2.12/how-to-guides/advanced-user-guides/monitoring-alerting-guides/create-persistent-grafana-dashboard
- Rancher: Customizing Grafana Dashboards: https://ranchermanager.docs.rancher.com/v2.12/how-to-guides/advanced-user-guides/monitoring-alerting-guides/customize-grafana-dashboard
- Rancher Monitoring chart values (`107.2.2+up69.8.2-rancher.26`): https://raw.githubusercontent.com/rancher/charts/dev-v2.12/charts/rancher-monitoring/107.2.2+up69.8.2-rancher.26/values.yaml
- Rancher Monitoring bundled Grafana chart values: https://raw.githubusercontent.com/rancher/charts/dev-v2.12/charts/rancher-monitoring/107.2.2+up69.8.2-rancher.26/charts/grafana/values.yaml
- Rancher Monitoring bundled Grafana chart metadata: https://raw.githubusercontent.com/rancher/charts/dev-v2.12/charts/rancher-monitoring/107.2.2+up69.8.2-rancher.26/charts/grafana/Chart.yaml
- Grafana: Prometheus template variables: https://grafana.com/docs/grafana/latest/datasources/prometheus/template-variables/
- Grafana: HTTP API reference: https://grafana.com/docs/grafana/latest/http_api
- Grafana: Dashboard HTTP API: https://grafana.com/docs/grafana/latest/http_api/dashboard/
- Grafana: JSON model: https://grafana.com/docs/grafana/latest/dashboards/build-dashboards/view-dashboard-json-model/
- Grafana: Import dashboards: https://grafana.com/docs/grafana/latest/dashboards/export-import/
- `kiwigrid/k8s-sidecar` README: https://github.com/kiwigrid/k8s-sidecar
- Grafana dashboard 315: https://grafana.com/grafana/dashboards/315
- Grafana dashboard 6417: https://grafana.com/grafana/dashboards/6417
- Grafana dashboard 1860: https://grafana.com/grafana/dashboards/1860
- Grafana dashboard 9614: https://grafana.com/grafana/dashboards/9614

## Issues Found
- The post placed persistent dashboard ConfigMaps in `cattle-monitoring-system`. Rancher Monitoring watches `cattle-dashboards` by default, so both ConfigMap examples were updated to use `cattle-dashboards`.
- The Grafana API export example omitted authentication. Updated the `curl` example to use authenticated access, which Grafana requires for HTTP API requests.
- The post used `grafana_folder` annotations as if folder provisioning worked by default. Rancher’s bundled Grafana chart leaves `folderAnnotation` unset and `foldersFromFilesStructure` disabled, so the folder section was corrected to explain the required Helm settings and to use the sidecar’s default annotation name `k8s-sidecar-target-directory`.
- The CPU usage examples labeled `rate(container_cpu_usage_seconds_total...)` with unit `short`. That query returns CPU cores, so the unit was corrected to `cores`.
- The variable examples used deprecated Prometheus classic query syntax and did not mention the `=~` matcher requirement for multi-value variables. Updated the examples to the current `Label values` query type layout and added the multi-value matcher note.
- The community dashboard list had incorrect IDs/descriptions. `6417` was corrected to `Kubernetes Cluster (Prometheus)`, and the incorrect ingress-controller entry was replaced with the verified `9614` NGINX Ingress controller dashboard.

## Review Notes
- Rancher v2.12 documentation is archived, but it remains authoritative for the default behavior of the v2.12 `rancher-monitoring` chart validated here.
- The bundled Grafana chart version in `rancher-monitoring` `107.2.2+up69.8.2-rancher.26` is `8.10.4`, with Grafana `appVersion: 11.5.2`.
- Provisioned dashboards are file-backed and Rancher’s default chart sets `grafana.sidecar.dashboards.provider.allowUiUpdates: false`, so persistent dashboards should be treated as ConfigMap-managed artifacts rather than UI-managed dashboards.
