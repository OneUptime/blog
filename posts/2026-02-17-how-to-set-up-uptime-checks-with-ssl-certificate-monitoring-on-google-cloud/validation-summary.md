# Validation Summary: How to Set Up Uptime Checks with SSL Certificate Monitoring on Google Cloud

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Monitoring
- Uptime checks
- SSL certificate expiry monitoring
- Google Cloud CLI
- Cloud Monitoring API
- Python `google-cloud-monitoring`
- Cloud Monitoring alerting policies
- Cloud Monitoring dashboards

## Sources Consulted
- Google Cloud CLI reference for `gcloud monitoring uptime create`: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/uptime/create
- Google Cloud CLI reference for `gcloud monitoring policies create` and `gcloud alpha monitoring policies create`: https://docs.cloud.google.com/sdk/gcloud/reference/alpha/monitoring/policies/create
- Cloud Monitoring API reference for `UptimeCheckConfig`: https://docs.cloud.google.com/monitoring/api/ref_v3/rest/v3/projects.uptimeCheckConfigs
- Cloud Monitoring metric list for `uptime_check/check_passed` and `uptime_check/time_until_ssl_cert_expires`: https://docs.cloud.google.com/monitoring/api/metrics_gcp_i_o
- Cloud Monitoring Python sample for creating uptime checks: https://docs.cloud.google.com/monitoring/docs/samples/monitoring-uptime-check-create
- Python client reference for `UptimeCheckConfig.HttpCheck`: https://docs.cloud.google.com/python/docs/reference/monitoring/latest/google.cloud.monitoring_v3.types.UptimeCheckConfig.HttpCheck

## Issues Found
- The `gcloud monitoring uptime create` example used unsupported or outdated flags (`--display-name`, `--monitored-resource-type`, `--hostname`, and `--checker-regions`) and used `--period=60` even though the CLI expects minutes. Updated the command to use the positional display name, `--resource-type`, `--resource-labels`, `--regions`, `--period=1`, and `--validate-ssl=true`.
- The alerting examples used unsupported `gcloud alpha monitoring policies create` flags such as `--condition-threshold-value`, `--condition-threshold-comparison`, and nested aggregation flags. Replaced them with valid alert policy JSON files and `gcloud monitoring policies create --policy-from-file=...`.
- The SSL certificate expiry alert thresholds were expressed in seconds, but the `time_until_ssl_cert_expires` metric is measured in days. Changed the 30-day and 7-day thresholds to `30` and `7`, and updated the dashboard y-axis label from seconds to days.
- The downtime alert filtered on `metric.labels.host`, but `host` is a monitored-resource label for `uptime_url`. Changed the filter to `resource.labels.host`.
- The downtime alert comparison was inverted for `REDUCE_COUNT_FALSE`. Changed it to alert when the count of failing checks is greater than 1.
- The Python API example constructed `monitoring_v3.MonitoredResource()`, which is not the documented Python sample pattern. Updated it to assign `monitored_resource` as a dictionary.
- The content matcher example assigned content matchers under `http_check`, but `content_matchers` is a top-level `UptimeCheckConfig` field. Moved it to `config.content_matchers`.
- The status-listing script claimed to report SSL status but only reports configuration. Updated the surrounding wording and docstring to say it reports SSL validation settings.

## Review Notes
- The local environment did not have `gcloud` or the `google-cloud-monitoring` Python package installed, so CLI and client-library validation was performed against official Google Cloud documentation rather than local execution.
- JSON examples added to the post were parsed locally to confirm valid JSON syntax.
