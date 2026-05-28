# Validation Summary: How to Create Error Budget Policies and Track Consumption

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Monitoring
- Cloud Monitoring SLO API
- Cloud Monitoring alerting policies
- Cloud Monitoring dashboards
- Google Cloud CLI
- Cloud Run functions / Cloud Functions
- Pub/Sub notification payloads
- Python

## Sources Consulted
- Google Cloud Observability: Retrieving SLO data - https://docs.cloud.google.com/stackdriver/docs/solutions/slo-monitoring/api/timeseries-selectors
- Google Cloud Observability: Alerting on your burn rate - https://docs.cloud.google.com/stackdriver/docs/solutions/slo-monitoring/alerting-on-budget-burn-rate
- Google Cloud Monitoring API: ServiceLevelObjective resource - https://docs.cloud.google.com/monitoring/api/ref_v3/rest/v3/projects.services.serviceLevelObjectives
- Google Cloud Monitoring API: AlertPolicy resource - https://docs.cloud.google.com/monitoring/api/ref_v3/rest/v3/projects.alertPolicies
- Google Cloud Monitoring API: Dashboard resource - https://docs.cloud.google.com/monitoring/api/ref_v3/rest/v1/projects.dashboards
- Google Cloud Functions sample: Cloud Pub/Sub CloudEvent in Python - https://docs.cloud.google.com/functions/docs/samples/functions-cloudevent-pubsub
- Google Cloud Observability: Using Cloud Load Balancing metrics - https://cloud.google.com/stackdriver/docs/solutions/slo-monitoring/sli-metrics/lb-metrics

## Issues Found
- The original SLO creation command used unsupported or unverifiable `gcloud monitoring slos create` flags and an incorrect metric-label filter form. I replaced it with a Cloud Monitoring REST API example using a valid `ServiceLevelObjective` JSON body and the documented load-balancer metric filter syntax.
- The original "MQL" examples used metric names such as `monitoring.googleapis.com/service/slo/error_budget_remaining` and `monitoring.googleapis.com/service/slo/burn_rate`. Google documents SLO data retrieval through time-series selectors instead, so I replaced these examples with `select_slo_budget_fraction` and `select_slo_burn_rate`.
- The original alert policies used `select_slo_budget_fraction` in threshold conditions. Google documents that budget-fraction selectors should not be used in alerting policies, while burn-rate selectors are supported for SLO-based alerts. I replaced the budget-threshold alerts with fast-burn and slow-burn policies using `select_slo_burn_rate`.
- The alert policy documentation field used `mime_type`; the Cloud Monitoring API field is `mimeType`. I corrected the field name.
- The dashboard examples used invalid MQL-style SLO metric queries in `timeSeriesQueryLanguage`. I replaced them with `timeSeriesFilter` entries using documented SLO selectors and corrected the scorecard thresholds for a fraction-based budget value.
- The Cloud Function example parsed Pub/Sub message data directly as JSON. Pub/Sub CloudEvent message data is base64 encoded, so I added base64 decoding before `json.loads` and removed an unused Cloud Deploy import.

## Review Notes
- The error-budget math table is correct for a 30-day period and 1 million requests per day.
- The policy tier thresholds are organizational policy examples, not Google Cloud product constraints.
- Google Cloud CLI was not installed in the local environment, so command behavior was validated against official Google Cloud documentation rather than local `gcloud --help` output.
