# Validation Summary: Configure GKE Workload Metrics to Export Prometheus Metrics to Cloud Monitoring

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Kubernetes Engine
- Google Cloud Managed Service for Prometheus
- Cloud Monitoring
- Prometheus and PromQL
- Kubernetes custom resources
- Go Prometheus client
- Grafana
- gcloud CLI

## Sources Consulted
- Google Cloud Managed Service for Prometheus: Get started with managed collection: https://docs.cloud.google.com/stackdriver/docs/managed-prometheus/setup-managed
- Google Cloud SDK: `gcloud container clusters update`: https://docs.cloud.google.com/sdk/gcloud/reference/container/clusters/update
- Google Cloud SDK: `gcloud monitoring policies create`: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Google Cloud Managed Service for Prometheus: Query using Cloud Monitoring: https://cloud.google.com/stackdriver/docs/managed-prometheus/query-cm
- Google Cloud Monitoring: PromQL for Cloud Monitoring: https://docs.cloud.google.com/monitoring/promql
- Google Cloud Managed Service for Prometheus: Managed rule evaluation and alerting: https://docs.cloud.google.com/stackdriver/docs/managed-prometheus/rules-managed
- Google Cloud Managed Service for Prometheus: Query using Grafana: https://docs.cloud.google.com/stackdriver/docs/managed-prometheus/query
- Google Cloud Monitoring API filters: https://docs.cloud.google.com/monitoring/api/v3/filters
- GoogleCloudPlatform/prometheus-engine datasource-syncer manifest: https://raw.githubusercontent.com/GoogleCloudPlatform/prometheus-engine/v0.17.2/cmd/datasource-syncer/datasource-syncer.yaml

## Issues Found
- The post stated that all GKE clusters running 1.25 and later have managed collection enabled by default. Official documentation distinguishes Autopilot 1.25+ from Standard 1.27+, so the version claim was corrected.
- The verification text only mentioned `gmp-operator` and `collector`. Managed collection also installs `rule-evaluator` and `alertmanager`, and Autopilot uses the `gke-gmp-system` namespace, so the verification guidance was corrected.
- The Go example referenced an undefined `handler`, so it would not compile. Added a minimal handler that records the counter and histogram and returns an HTTP 200 response.
- The PromQL examples did not aggregate counter and histogram series. Updated request-rate and status-filter queries to use `sum(rate(...))`, and updated the histogram quantile query to aggregate buckets with `sum by (le)`.
- The Cloud Console navigation incorrectly referenced a Monitoring > PromQL page. Updated it to Metrics Explorer with the PromQL editor.
- The `gcloud alpha monitoring policies create` command used invalid threshold flags and alerted on the raw counter value. Replaced it with the current `gcloud monitoring policies create` flags, an `ALIGN_RATE` aggregation, a metric-label filter for 5xx statuses, and the supported `--if` threshold syntax.
- The PromQL alert rule divided per-status numerator series by denominator series that still retained status labels, producing incorrect ratios. Aggregated both sides with `sum(rate(...))`.
- The Grafana ConfigMap pointed directly at the Monitoring API and omitted the required OAuth2/data source syncer flow. Replaced it with the documented Managed Service for Prometheus data source syncer approach and verified that the referenced manifest URL exists.
- The collector log command did not specify the collector container and did not note that target status requires enabling the targetStatus feature. Updated the monitoring commands accordingly.

## Review Notes
- `gcloud` and `go` were not installed in the local environment, so CLI and Go syntax were reviewed against official documentation rather than executed locally.
- The datasource-syncer manifest URL was checked and returned HTTP 200.
