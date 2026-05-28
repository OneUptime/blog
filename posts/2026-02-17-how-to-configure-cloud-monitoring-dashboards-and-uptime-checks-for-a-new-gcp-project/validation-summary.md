# Validation Summary: How to Configure Cloud Monitoring Dashboards and Uptime Checks

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Monitoring
- Google Cloud CLI
- Cloud Monitoring uptime checks
- Cloud Monitoring alerting policies
- Cloud Monitoring dashboards
- Cloud Run metrics
- Compute Engine metrics
- Ops Agent metrics
- Cloud Monitoring custom metrics for Python

## Sources Consulted
- Google Cloud CLI reference: `gcloud monitoring uptime create` - https://cloud.google.com/sdk/gcloud/reference/monitoring/uptime/create
- Google Cloud CLI reference: `gcloud monitoring policies create` - https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Google Cloud CLI reference: `gcloud beta monitoring channels create` - https://cloud.google.com/sdk/gcloud/reference/beta/monitoring/channels/create
- Cloud Monitoring uptime check API reference - https://cloud.google.com/monitoring/api/ref_v3/rest/v3/projects.uptimeCheckConfigs
- Cloud Monitoring alert policy API reference - https://cloud.google.com/monitoring/api/ref_v3/rest/v3/projects.alertPolicies
- Cloud Monitoring dashboard API reference - https://cloud.google.com/monitoring/api/ref_v3/rest/v1/projects.dashboards
- Cloud Run metrics reference - https://cloud.google.com/monitoring/api/metrics_gcp_p_z#run
- Ops Agent metrics reference - https://cloud.google.com/monitoring/api/metrics_opsagent
- Cloud Monitoring user-defined metrics guide - https://cloud.google.com/monitoring/custom-metrics/creating-metrics

## Issues Found
- The email notification channel command used `gcloud monitoring channels create`, but notification channel creation is exposed through `gcloud beta monitoring channels create`; updated the command.
- The first uptime check command used unsupported flags (`--display-name`, `--hostname`, and `--content-match-content`) and used `--period=60` even though the CLI expects minute values of `1`, `5`, `10`, or `15`; updated it to use the positional display name, `--resource-labels`, `--matcher-content`, and `--period=1`.
- The JSON uptime check example used `gcloud monitoring uptime create --config-from-file`, which is not supported by the current uptime CLI; changed it to a Cloud Monitoring API `curl` request while keeping the JSON configuration.
- The uptime alert example assumed the display name was the same as the uptime check metric `check_id`; added a command to resolve the generated uptime check ID before creating the alert policy.
- The alert policy examples used unsupported threshold flags such as `--condition-threshold-value`, `--condition-comparison`, `--condition-duration`, and individual aggregation flags; updated them to the current `--if`, `--duration`, and JSON `--aggregation` form.
- The Cloud Run error-rate alert filtered only 5xx requests and compared that request rate to `0.05`, which was not a 5% error ratio; replaced it with a `--policy-from-file` example that uses `denominatorFilter` and matching denominator aggregations.
- The disk usage alert and memory dashboard did not filter Ops Agent percent metrics to the `used` state, which could chart or alert on non-used states; added `metric.labels.state="used"`.
- The infrastructure dashboard labels said disk read/write and network traffic, but only charted read and received bytes; added write and sent data sets.
- The application dashboard description mentioned GKE, but the metrics shown are Cloud Run metrics; narrowed the wording to Cloud Run.
- The Python custom metric example used the `global` monitored resource without the required `project_id` resource label; added the label to both time series.

## Review Notes
The local workspace does not have `gcloud` installed, so CLI validation was performed against the current official Google Cloud CLI reference instead of local `--help` output.
