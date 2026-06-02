# Validation Summary: How to Set Up Grafana Alerting with Google Cloud Monitoring Backend on GCP

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana
- Grafana Alerting
- Grafana provisioning YAML
- Google Cloud Monitoring
- Google Cloud IAM service accounts
- Google Kubernetes Engine Workload Identity
- Google Cloud SDK (`gcloud`)
- Helm

## Sources Consulted
- Grafana Google Cloud Monitoring data source configuration: https://grafana.com/docs/grafana/latest/datasources/google-cloud-monitoring/configure/
- Grafana Google authentication for Google Cloud Monitoring: https://grafana.com/docs/grafana-cloud/connect-externally-hosted/data-sources/google-cloud-monitoring/google-authentication/
- Grafana alerting file provisioning: https://grafana.com/docs/grafana/latest/alerting/set-up/provision-alerting-resources/file-provisioning/
- Grafana alerting resource export/provisioning notes: https://grafana.com/docs/grafana/latest/alerting/set-up/provision-alerting-resources/export-alerting-resources/
- Grafana alerting contact point settings for Slack: https://grafana.com/docs/grafana/latest/administration/provisioning/
- Google Cloud Monitoring metrics for Compute Engine and Cloud SQL: https://docs.cloud.google.com/monitoring/api/metrics_gcp_c
- Google Cloud Monitoring GKE system metrics: https://docs.cloud.google.com/monitoring/api/metrics_kubernetes
- Google Cloud Monitoring IAM roles: https://docs.cloud.google.com/iam/docs/roles-permissions/monitoring
- Google IAM service account key creation: https://docs.cloud.google.com/iam/docs/keys-create-delete

## Issues Found
- The Google Cloud Monitoring data source provisioning snippets did not set a stable `uid`, while the alert rules referenced `datasourceUid: google-cloud-monitoring`. Added `uid: google-cloud-monitoring` to both data source examples.
- The data source provisioning snippets omitted `universeDomain: googleapis.com`, which is present in Grafana's current official provisioning examples. Added it to both authentication examples.
- The Cloud SQL connection metric example described `cloudsql.googleapis.com/database/network/connections` as a general active connection metric. Google documents that this metric applies only to Cloud SQL for MySQL and SQL Server. Updated the comment to state that scope.
- The Cloud SQL disk alert query omitted `relativeTimeRange` for the Cloud Monitoring query. Added a 10-minute relative range to match the alert's `for: 10m` evaluation window.
- The provisioned alert rule examples omitted explicit `noDataState` and `execErrState` fields shown in Grafana's alerting provisioning examples. Added `noDataState: NoData` and `execErrState: Alerting` to the alert examples.
- The multi-condition alert compared `compute.googleapis.com/instance/memory/balloon/ram_used`, a byte-valued metric, directly to `0.9`. Added the matching `ram_size` query and changed the expression to compare `ram_used / ram_size` against `0.9`.
- The multi-condition alert used Compute Engine memory balloon metrics without noting their availability limits. Added a note that `compute.googleapis.com/instance/memory/balloon/*` metrics are only available for E2 machine family VMs, and that other machine families should use guest or Ops Agent memory metrics.

## Review Notes
The Grafana alert rule `model` payload for Google Cloud Monitoring can vary by Grafana version and by whether the rule is exported from the UI or hand-authored. The examples are syntactically valid YAML and the corrected metric names, data source UID, and threshold logic are technically accurate, but production teams should export final alert rules from their target Grafana version to capture all version-specific model fields.
