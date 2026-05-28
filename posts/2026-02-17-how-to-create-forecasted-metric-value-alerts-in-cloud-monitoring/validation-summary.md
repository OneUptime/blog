# Validation Summary: How to Create Forecasted Metric-Value Alerts in Cloud Monitoring

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Monitoring
- Cloud Monitoring alerting policies
- Forecasted metric-value alert conditions
- Google Cloud CLI
- Ops Agent / Monitoring agent metrics
- Cloud SQL metrics
- JSON alert policy configuration

## Sources Consulted
- Google Cloud Monitoring: Create forecasted metric-value alerting policies: https://docs.cloud.google.com/monitoring/alerts/metric-forecast
- Cloud Monitoring API AlertPolicy reference: https://docs.cloud.google.com/monitoring/api/ref_v3/rest/v3/projects.alertPolicies
- Google Cloud CLI `gcloud monitoring policies create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Google Cloud CLI `gcloud monitoring policies list` reference: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/list
- Google Cloud CLI `gcloud monitoring policies describe` reference: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/describe
- Cloud Monitoring Ops Agent and Monitoring agent metrics reference: https://docs.cloud.google.com/monitoring/api/metrics_opsagent
- Cloud Monitoring legacy agent metrics reference: https://docs.cloud.google.com/monitoring/api/metrics_agent
- Cloud Monitoring Google Cloud metrics reference for Cloud SQL: https://docs.cloud.google.com/monitoring/api/metrics_gcp_c
- Cloud Monitoring dashboards overview: https://docs.cloud.google.com/monitoring/dashboards

## Issues Found
- The post claimed Cloud Monitoring uses linear regression for forecasted alerts. Updated this to match the official description of a trained forecasting algorithm per time series, including the documented initial and continual training windows.
- The create-policy command used `gcloud alpha monitoring policies create`. Updated it to the current documented `gcloud monitoring policies create` command.
- The Cloud SQL example treated `cloudsql.googleapis.com/database/network/connections` as a percentage. Updated the prose and condition display name to describe an absolute connection count threshold.
- The recommended disk forecast horizon included 72 hours, but the API reference documents a maximum forecast horizon of 60 hours. Updated the recommendation and added the supported 1-to-60-hour range.
- The limitations section said cyclical patterns generally confuse forecasts and referred to fitting a trend line. Updated this to reflect that Cloud Monitoring can incorporate regular periodic behavior but still needs training data and can be affected by abrupt changes.
- The monitoring commands were described as listing incidents and checking incident history, but they list and describe alert policies. Updated the comments and removed the `alpha` command prefix.
- The tuning advice had the forecast horizon direction reversed for noisy and insensitive alerts. Updated it so noisy alerts suggest a shorter horizon, while missed issues suggest a longer horizon or lower threshold.
- The capacity-planning section claimed dashboards display forecast lines alongside actual data. Updated this to the documented dashboard behavior of displaying metric history.

## Review Notes
The JSON alert policy snippets are syntactically valid JSON. The local environment did not have `gcloud` installed, so CLI command validation was performed against the official Google Cloud CLI documentation instead of local `--help` output.
