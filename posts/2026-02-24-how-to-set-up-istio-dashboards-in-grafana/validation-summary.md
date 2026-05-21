# Validation Summary: How to Set Up Istio Dashboards in Grafana

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Istio
- Grafana
- Prometheus
- PromQL
- Helm
- Kubernetes ConfigMaps
- kube-prometheus-stack

## Sources Consulted
- Istio Grafana integration documentation: https://istio.io/latest/docs/ops/integrations/grafana/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio dashboard JSON files in the official Istio repository: https://github.com/istio/istio/tree/1.24.0/manifests/addons/dashboards
- Grafana Helm installation documentation: https://grafana.com/docs/grafana/latest/setup-grafana/installation/helm/
- Grafana data sources documentation: https://grafana.com/docs/grafana/latest/datasources/
- Grafana Helm chart values: https://github.com/grafana-community/helm-charts/blob/main/charts/grafana/values.yaml
- kube-prometheus-stack chart values: https://github.com/prometheus-community/helm-charts/blob/main/charts/kube-prometheus-stack/values.yaml
- Grafana alerting documentation for panel-created alert rules: https://grafana.com/docs/grafana/latest/alerting/alerting-rules/create-alerts-panels/
- Grafana contact points documentation: https://grafana.com/docs/grafana/latest/alerting/configure-notifications/manage-contact-points/

## Issues Found
- The Grafana Helm repository and chart name were outdated for current Grafana documentation. Updated the commands to use `grafana-community/grafana` from `https://grafana-community.github.io/helm-charts`.
- The standalone Grafana Helm install did not enable the dashboard and datasource sidecars required by the later ConfigMap examples. Added sidecar settings to the install command and aligned datasource labels to `grafana_datasource: "1"`.
- The kube-prometheus-stack example used the `prometheus-community` chart without adding or updating that Helm repository. Added the required `helm repo add` and `helm repo update` commands.
- The Grafana UI navigation for adding Prometheus used older wording. Updated it to the current Connections > Data sources flow.
- The Istio dashboard download loop used filenames such as `mesh-dashboard.json` that return 404 for Istio 1.24.0. Replaced them with the actual dashboard filenames from the official Istio repository.
- The P99 latency query was described as a heatmap even though it returns quantile time series, not histogram buckets. Updated the heading and panel recommendation to use a time series panel.
- The Node Graph recommendation implied the raw PromQL result could directly create a node graph. Clarified that the result must be transformed into the fields required by Grafana's Node Graph panel.
- The alerting section used older panel alerting and "notification channels" terminology. Updated it to the current panel-created alert rule and contact points terminology.
- The dashboard provisioning section stated the sidecar was included and active by default. Clarified that it is available in the chart and must be enabled, matching the corrected install command.

## Review Notes
- The Istio metric names and labels used in the PromQL examples match the official Istio standard metrics reference.
- The Grafana.com dashboard IDs listed in the post match Istio's official Grafana integration documentation for mesh, service, workload, performance, and control plane dashboards.
- The hardcoded Istio version remains `1.24.0`; Istio recommends selecting dashboard revisions that match the Istio version being deployed.
