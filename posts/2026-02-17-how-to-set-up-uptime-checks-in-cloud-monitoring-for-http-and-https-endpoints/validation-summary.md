# Validation Summary: How to Set Up Uptime Checks in Cloud Monitoring for HTTP and HTTPS Endpoints

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Monitoring
- Cloud Monitoring uptime checks
- Google Cloud CLI (`gcloud`)
- Cloud Monitoring REST API
- Cloud Monitoring alerting policies
- Service Directory private uptime checks

## Sources Consulted
- Google Cloud CLI reference: `gcloud monitoring uptime create` - https://cloud.google.com/sdk/gcloud/reference/monitoring/uptime/create
- Cloud Monitoring REST API reference: `projects.uptimeCheckConfigs` - https://cloud.google.com/monitoring/api/ref_v3/rest/v3/projects.uptimeCheckConfigs
- Cloud Monitoring uptime check resource model - https://cloud.google.com/monitoring/api/ref_v3/rest/v3/projects.uptimeCheckConfigs#UptimeCheckConfig
- Cloud Monitoring alerting policies JSON/API documentation - https://cloud.google.com/monitoring/alerts/policies-in-json
- Cloud Monitoring metric list for uptime check metrics - https://cloud.google.com/monitoring/api/metrics_gcp
- Google Cloud private uptime checks documentation - https://cloud.google.com/monitoring/uptime-checks/private-checks

## Issues Found
- The `gcloud monitoring uptime create` example used an unsupported `--display-name` flag, the wrong resource-label flag, uppercase protocol/region values, and a `10s` timeout value. Updated it to use the positional display name, `--resource-labels`, lowercase protocol/region values, and a numeric timeout.
- The POST request example used `contentType: "APPLICATION_JSON"`, which is not a valid Cloud Monitoring uptime check enum value. Updated it to `contentType: "USER_PROVIDED"` with `customContentType: "application/json"`.
- The alerting policy filter used `metric.labels.check_id`. Cloud Monitoring filters use `metric.label.check_id`, and the check ID is the generated uptime check ID rather than the display name. Updated the filter accordingly.
- The private uptime check example used an `uptime_url` monitored resource with an IP address and an empty `internalCheckers` list. Private uptime checks should reference a Service Directory service. Updated the monitored resource to `servicedirectory_service` with Service Directory labels.
- The manage commands used `my-api-check`, which was no longer the display name after fixing the create command syntax. Updated the describe and delete examples to use the display name.

## Review Notes
The local environment did not have `gcloud` installed, so CLI validation was performed against the official Google Cloud CLI reference rather than local `--help` output.
