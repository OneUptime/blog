# Validation Summary: How to Establish Error Budget Policies for Release Gating on Google Cloud

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Google Cloud Monitoring
- Cloud Monitoring SLO API
- Cloud Monitoring alerting policies
- Google Cloud Python client library
- Cloud Build
- Cloud Run
- Python
- SQL

## Sources Consulted
- Google Cloud Monitoring SLO API reference: https://docs.cloud.google.com/monitoring/api/ref_v3/rest/v3/services.serviceLevelObjectives
- Google Cloud Monitoring service create API reference: https://cloud.google.com/monitoring/api/ref_v3/rest/v3/services/create
- Google Cloud Monitoring SLO create API reference: https://docs.cloud.google.com/monitoring/api/ref_v3/rest/v3/services.serviceLevelObjectives/create
- Google Cloud SLO time-series selectors: https://docs.cloud.google.com/stackdriver/docs/solutions/slo-monitoring/api/timeseries-selectors
- Google Cloud Python `ServiceMonitoringServiceClient` reference: https://docs.cloud.google.com/python/docs/reference/monitoring/latest/google.cloud.monitoring_v3.services.service_monitoring_service.ServiceMonitoringServiceClient
- Google Cloud Python `CreateServiceRequest` reference: https://cloud.google.com/python/docs/reference/monitoring/latest/google.cloud.monitoring_v3.types.CreateServiceRequest
- Google Cloud Monitoring alert policy API reference: https://docs.cloud.google.com/monitoring/api/ref_v3/rest/v3/projects.alertPolicies
- Google Cloud Monitoring alert severity reference: https://docs.cloud.google.com/python/docs/reference/monitoring/latest/google.cloud.monitoring_v3.types.AlertPolicy.Severity
- Cloud Build substitutions documentation: https://cloud.google.com/build/docs/configuring-builds/substitute-variable-values
- gcloud Monitoring command reference: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring

## Issues Found
- The original `gcloud monitoring slos create` example used a command group that is not present in the current GA `gcloud monitoring` reference. Replaced it with the documented Monitoring API `curl` flow for creating a service-level objective.
- The Python SLO creation example passed `service_id` and `service_level_objective_id` as flattened method arguments not shown in the current Python client method signatures. Updated the code to use `CreateServiceRequest` and `CreateServiceLevelObjectiveRequest`.
- The error budget checker manually derived budget from a mock SLI value. Replaced it with a `MetricServiceClient.list_time_series` query using Cloud Monitoring's `select_slo_budget_fraction` selector.
- The release gate and Cloud Build script snippets omitted required imports between the shown modules. Added imports for `get_error_budget_status` and `ReleaseGate`.
- The alerting example used `select_slo_budget_fraction` in an alerting policy, but Google Cloud documentation says not to use that selector in alerting policies. Replaced the alert example with burn-rate alerts using `select_slo_burn_rate`.
- The alert policy snippet did not set an explicit condition combiner and passed severity as a plain string. Updated it to use `ConditionCombinerType.OR` and `AlertPolicy.Severity`.

## Review Notes
- The examples still assume the referenced Cloud Monitoring service, metrics, notification channel, Cloud Build trigger substitutions, and BigQuery reporting table exist in the user's environment.
- Python snippets were syntax-checked with `python3`; Google Cloud API calls were verified against official documentation but not executed because they require a configured Google Cloud project and credentials.
