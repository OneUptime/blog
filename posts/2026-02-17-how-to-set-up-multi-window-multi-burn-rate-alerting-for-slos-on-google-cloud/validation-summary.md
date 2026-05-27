# Validation Summary: How to Set Up Multi-Window Multi-Burn-Rate Alerting for SLOs on Google Cloud

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Google Cloud Monitoring
- Cloud Monitoring SLO API
- Cloud Monitoring alert policies
- Google Cloud CLI
- Terraform Google provider
- SRE multi-window multi-burn-rate alerting

## Sources Consulted
- Google Cloud Monitoring: Alerting on your burn rate - https://docs.cloud.google.com/stackdriver/docs/solutions/slo-monitoring/alerting-on-budget-burn-rate
- Google Cloud Monitoring: Retrieving SLO data and `select_slo_burn_rate` - https://docs.cloud.google.com/stackdriver/docs/solutions/slo-monitoring/api/timeseries-selectors
- Google Cloud Monitoring API: `services.serviceLevelObjectives.create` - https://docs.cloud.google.com/monitoring/api/ref_v3/rest/v3/services.serviceLevelObjectives/create
- Google Cloud Monitoring API: `ServiceLevelObjective` and `TimeSeriesRatio` fields - https://docs.cloud.google.com/monitoring/api/ref_v3/rest/v3/services.serviceLevelObjectives
- Google Cloud Monitoring API: `AlertPolicy`, `MetricThreshold`, `ConditionCombinerType`, and alert strategy fields - https://docs.cloud.google.com/monitoring/api/ref_v3/rest/v3/projects.alertPolicies
- Google Cloud SDK: `gcloud monitoring policies create` - https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Google SRE Workbook: Alerting on SLOs - https://sre.google/workbook/alerting-on-slos/
- Terraform Google provider: `google_monitoring_alert_policy` and `google_monitoring_slo` resources - https://registry.terraform.io/providers/hashicorp/google/latest/docs

## Issues Found
- The post used `gcloud monitoring slos create`, but the current Google Cloud CLI reference for `gcloud monitoring` does not expose an SLO creation command. Replaced the SLO setup example with a Cloud Monitoring REST API `services.serviceLevelObjectives.create` call using a JSON request body.
- The original SLO filters used `metric.labels.response_code_class` and omitted the monitored resource type. Updated the example to match Cloud Monitoring filter syntax with `metric.label."response_code_class"` and `resource.type="http_lb_rule"`.
- The post used a 3-day `select_slo_burn_rate` lookback for Tier 3, but Google Cloud Monitoring documents that SLO burn-rate alerting cannot use compliance periods greater than 24 hours. Changed Tier 3 to a 24-hour long window, 2-hour short window, and 3x burn rate, which consumes 10% of a 30-day error budget in 24 hours.
- The post stated that the SRE Workbook recommends four alert tiers while only showing three. Updated the wording to describe a small set of tiers and explain the Cloud Monitoring 24-hour lookback adaptation.
- Updated the Terraform Tier 3 values and tuning tip to match the corrected 24-hour / 2-hour / 3x slow-burn alert.

## Review Notes
The alert policy JSON structure, `gcloud monitoring policies create --policy-from-file`, `select_slo_burn_rate` selector syntax, `AND` combiner, and Terraform `google_monitoring_alert_policy` structure are consistent with current official documentation. Notification channel IDs remain placeholders and must be replaced with real Cloud Monitoring notification channel resource names before use.
