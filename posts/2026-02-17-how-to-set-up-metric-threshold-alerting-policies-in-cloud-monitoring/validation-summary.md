# Validation Summary: How to Set Up Metric-Threshold Alerting Policies in Cloud Monitoring

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Monitoring
- Cloud Monitoring alerting policies
- Google Cloud CLI (`gcloud monitoring policies`)
- Cloud Monitoring API alert policy JSON
- Ops Agent metrics
- Cloud Run metrics

## Sources Consulted
- Google Cloud SDK documentation: `gcloud monitoring policies create` - https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Google Cloud SDK documentation: `gcloud monitoring policies update` - https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/update
- Cloud Monitoring API reference: `projects.alertPolicies` - https://docs.cloud.google.com/monitoring/api/ref_v3/rest/v3/projects.alertPolicies
- Cloud Monitoring Ops Agent metrics - https://docs.cloud.google.com/monitoring/api/metrics_opsagent
- Cloud Monitoring Google Cloud metrics, including Cloud Run `run.googleapis.com/request_count` - https://docs.cloud.google.com/monitoring/api/metrics_gcp_p_z
- Cloud Monitoring documentation variables - https://docs.cloud.google.com/monitoring/alerts/doc-variables

## Issues Found
- The `gcloud` create example used outdated/non-current flag names such as `--condition-threshold-value`, `--condition-threshold-comparison`, `--condition-threshold-duration`, and `--condition-threshold-aggregation`. Changed the example to use the current stable `gcloud monitoring policies create` flags: `--if`, `--duration`, and `--aggregation`.
- The examples used `gcloud alpha monitoring policies` even though the commands are available as stable `gcloud monitoring policies` commands. Updated create, list, describe, update, and delete examples to use the stable command path.
- The Cloud Run example claimed to alert on a 5% error rate, but it filtered only 5xx requests and compared the resulting request rate to `5`. Added `denominatorFilter` and `denominatorAggregations` for all requests and changed the threshold to `0.05`, which correctly represents a 5% ratio.
- The aggregation explanation omitted the denominator requirement for percentage-based error-rate alerts. Added a sentence explaining that error-rate percentages require a numerator filter for errors and a denominator filter for all requests.
- The multi-condition example used `AND` while the text implied both conditions had to be true for the same monitored resource. Changed the combiner to `AND_WITH_MATCHING_RESOURCE` and updated the explanation accordingly.
- The initial combiner overview only mentioned ALL or ANY. Updated it to include the same-resource combiner option.

## Review Notes
The memory and disk examples use Ops Agent metrics, so the target VMs need the Ops Agent or compatible agent metrics installed and reporting. The JSON policy examples use placeholder project and notification-channel IDs that must be replaced before use.
