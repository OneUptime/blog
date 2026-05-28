# Validation Summary: How to Configure Burn Rate Alerts for SLO-Based Incident Detection on GCP

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Monitoring
- Service-level objectives and service-level indicators
- Burn-rate alerting
- Cloud Monitoring Alert Policies API
- Google Cloud CLI
- Terraform Google provider
- HTTP load-balancer Monitoring metrics

## Sources Consulted
- Google Cloud Monitoring SLO time-series selectors and `select_slo_burn_rate`: https://docs.cloud.google.com/stackdriver/docs/solutions/slo-monitoring/api/timeseries-selectors
- Google Cloud Monitoring SLO API `services.serviceLevelObjectives.create`: https://docs.cloud.google.com/monitoring/api/ref_v3/rest/v3/services.serviceLevelObjectives/create
- Google Cloud Monitoring SLO API resource schema: https://docs.cloud.google.com/monitoring/api/ref_v3/rest/v3/services.serviceLevelObjectives
- Google Cloud Monitoring load-balancer SLI examples: https://docs.cloud.google.com/stackdriver/docs/solutions/slo-monitoring/sli-metrics/lb-metrics
- Google Cloud Monitoring Alert Policies API schema: https://docs.cloud.google.com/monitoring/api/ref_v3/rest/v3/projects.alertPolicies
- Google Cloud CLI `gcloud monitoring policies create`: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Google Cloud Monitoring incident listing with `gcloud alpha monitoring alerts list`: https://docs.cloud.google.com/monitoring/alerts/incidents-events
- Terraform Google provider `google_monitoring_alert_policy`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/monitoring_alert_policy
- Google SRE Workbook, Alerting on SLOs: https://sre.google/workbook/alerting-on-slos/

## Issues Found
- The SLO creation example used `gcloud monitoring slos create`, but the current GA `gcloud monitoring` command group does not document an SLO create command. Replaced it with the documented Cloud Monitoring `services.serviceLevelObjectives.create` API call and a valid request-based `goodTotalRatio` SLO body.
- The SLO metric filters used an abbreviated load-balancer filter. Updated the example filters to match the documented Cloud Load Balancing SLI pattern, including `resource.type="https_lb_rule"` and `metric.label."response_code_class"`.
- The post said the multi-threshold examples were "recommended by Google's SRE book", but the examples are a simplified single-window form based on the recommended burn rates and windows. Adjusted the wording to avoid overstating that the exact implementation matches the SRE Workbook.
- The testing command claimed that 50% of requests should fail, but the loop itself only sends repeated requests. Changed the comment to say the endpoint must be configured to fail during the test.
- The verification command listed alerting policies, not incidents. Replaced it with `gcloud alpha monitoring alerts list`, which the Cloud Monitoring incident documentation identifies as the CLI command for listing incidents/alerts.

## Review Notes
The alert policy JSON, `select_slo_burn_rate` selector syntax, threshold condition fields, `gcloud monitoring policies create --policy-from-file`, and Terraform `google_monitoring_alert_policy` structure are consistent with current official documentation. The incident-listing CLI is currently documented as a preview/alpha command, so production workflows may prefer the Cloud Monitoring console or `projects.alerts.list` API until the command is GA.
