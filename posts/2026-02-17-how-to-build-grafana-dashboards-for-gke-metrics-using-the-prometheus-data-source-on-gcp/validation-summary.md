# Validation Summary: How to Build Grafana Dashboards for GKE Metrics Using the Prometheus Data Source

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Kubernetes Engine (GKE)
- Grafana
- Prometheus
- Google Managed Service for Prometheus
- kube-prometheus-stack Helm chart
- Kubernetes Services and PersistentVolumeClaims
- PromQL
- Google Cloud IAM

## Sources Consulted
- Google Cloud Managed Service for Prometheus Grafana query documentation: https://docs.cloud.google.com/stackdriver/docs/managed-prometheus/query
- Google Cloud Managed Service for Prometheus API prefix documentation: https://docs.cloud.google.com/stackdriver/docs/managed-prometheus/query-api-ui
- Cloud Monitoring Prometheus API reference: https://docs.cloud.google.com/monitoring/api/ref_v3/rest/v1/projects.location.prometheus.api.v1/query
- prometheus-community kube-prometheus-stack values: https://github.com/prometheus-community/helm-charts/blob/main/charts/kube-prometheus-stack/values.yaml
- Grafana dashboard import documentation: https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/import-dashboards/
- Grafana alert rule documentation: https://grafana.com/docs/grafana/latest/alerting/alerting-rules/create-grafana-managed-rule/
- Grafana contact points documentation: https://grafana.com/docs/grafana/latest/alerting/fundamentals/notifications/contact-points/
- Grafana.com dashboard API records for dashboard IDs 315, 6417, 11074, and 7249: https://grafana.com/api/dashboards/315

## Issues Found
- The Google Managed Prometheus authentication instructions said to download a service-account JSON key for Grafana. Google documents that Grafana's Prometheus data source does not support OAuth2 service-account authentication directly; updated the instructions to use the Managed Service for Prometheus data source syncer and added the required Monitoring Viewer and Service Account Token Creator roles.
- The dashboard import API example did not import a Grafana.com dashboard by ID and would only submit a minimal dashboard object. Replaced it with the documented Grafana UI import flow using a Grafana.com URL or dashboard ID.
- Several community dashboard descriptions did not match the current Grafana.com dashboard records. Updated the descriptions for IDs 315, 6417, 11074, and 7249.
- The Grafana alerting steps referenced the older panel Alert tab and notification channels flow. Updated the steps to the current Grafana-managed alert rule flow using Alerts & IRM, contact points, and notification policies.

## Review Notes
The self-hosted kube-prometheus-stack commands, Kubernetes Service exposure examples, PVC YAML, Helm persistence values, and PromQL examples are syntactically valid for the described use case. The Google Managed Prometheus URL is correct as the Grafana Prometheus data source server URL; individual HTTP API endpoints under that server use the documented `/api/v1/` prefix. In production, exposing Grafana with a public LoadBalancer should be paired with TLS, authentication hardening, and network restrictions.
