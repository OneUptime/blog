# Validation Summary: How to Monitor and Alert on Regional Outages Using Cloud Monitoring Uptime

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Monitoring uptime checks
- Google Cloud Monitoring alerting policies
- Terraform Google provider
- Flask
- psycopg2
- Google Cloud Storage Python client
- Google Cloud Functions
- Pub/Sub alert notifications
- Cloud Build Node.js client
- Slack Web API
- Cloud Monitoring dashboards
- Cloud Run traffic splitting

## Sources Consulted
- Google Cloud SDK documentation for `gcloud monitoring uptime create`: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/uptime/create
- Google Cloud SDK documentation for `gcloud monitoring policies create`: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Google Cloud Monitoring metrics reference for `uptime_check/check_passed`: https://docs.cloud.google.com/monitoring/api/metrics_gcp_i_o
- Google Cloud Monitoring metrics reference for Cloud Run metrics: https://docs.cloud.google.com/monitoring/api/metrics_gcp_p_z
- Google Cloud Monitoring dashboard API / Config Connector field reference: https://docs.cloud.google.com/config-connector/docs/reference/resource-docs/monitoring/monitoringdashboard
- Terraform Google provider `google_monitoring_alert_policy` resource documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/monitoring_alert_policy
- Cloud Build Node.js client documentation: https://docs.cloud.google.com/nodejs/docs/reference/cloudbuild/latest
- Cloud Build `RepoSource` API reference: https://docs.cloud.google.com/build/docs/api/reference/rest/v1/RepoSource
- Google Cloud SDK documentation for `gcloud run services update-traffic`: https://cloud.google.com/sdk/gcloud/reference/run/services/update-traffic

## Issues Found
- The uptime check `gcloud` examples used invalid flags such as `--display-name`, `--uri`, and `--http-method`. Updated them to the current positional display name plus `--resource-type`, `--resource-labels`, `--protocol`, `--path`, and `--request-method`.
- The uptime check examples used `--period=60`, but the current `gcloud` flag accepts minute values such as `1`, `5`, `10`, and `15`. Changed the examples to `--period=1`.
- The uptime check examples used invalid region values such as `USA`, `EUROPE`, `SOUTH_AMERICA`, and `ASIA_PACIFIC`. Replaced the explicit regional examples with current values such as `usa-iowa`, `europe`, and `asia-pacific`; the all-region example now relies on the default all-region behavior.
- The post referred to checking internal URLs with public uptime checks. Changed the wording to public region-specific URLs because private/internal checks require a different setup.
- The alert policy `gcloud` example used non-current flags such as `--condition-threshold-value`, `--condition-threshold-comparison`, and `--condition-threshold-duration`. Updated it to use `--aggregation`, `--if`, and `--duration`.
- The alert policy example used a placeholder check ID that looked like a display name. Replaced it with `CHECK_ID` to reflect the Cloud Monitoring uptime-check ID used by the metric label.
- The Cloud Functions sample called `createIncidentTicket` without defining it. Added a small placeholder async function so the sample is syntactically complete.
- The Cloud Functions region extraction regex did not match common Google Cloud region names such as `us-central1`, `europe-west1`, and `asia-east1`. Updated the regex for those region-name shapes.
- The Cloud Build trigger call passed substitutions without specifying a revision source. Added a `branchName` field and kept substitutions under `source`, which matches the `RepoSource` shape for `runBuildTrigger`.
- The dashboard JSON grouped time series without a `crossSeriesReducer`. Added reducers and changed `groupByFields` entries to the singular `metric.label.*` and `resource.label.*` field names used by Cloud Monitoring aggregation.

## Review Notes
The Terraform alert policy snippet is structurally consistent with the Google provider documentation, but it assumes the referenced `google_monitoring_uptime_check_config` resources and notification channels are defined elsewhere. The Cloud Functions ticket helper is intentionally a placeholder because incident-management APIs vary by organization.
