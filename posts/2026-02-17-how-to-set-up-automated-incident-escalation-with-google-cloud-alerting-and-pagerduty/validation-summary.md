# Validation Summary: How to Set Up Automated Incident Escalation with Google Cloud Alerting

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Monitoring alerting policies
- Google Cloud Monitoring notification channels
- Google Cloud Run metrics
- Google Cloud CLI
- PagerDuty services, escalation policies, Event Orchestration, and Events API v2

## Sources Consulted
- Google Cloud CLI reference: `gcloud monitoring policies create` - https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Google Cloud CLI reference: `gcloud alpha monitoring channels create` / beta channel commands - https://docs.cloud.google.com/sdk/gcloud/reference/alpha/monitoring/channels/create
- Google Cloud Monitoring notification channels by API - https://docs.cloud.google.com/monitoring/alerts/using-channels-api
- Google Cloud Monitoring AlertPolicy REST resource - https://docs.cloud.google.com/monitoring/api/ref_v3/rest/v3/projects.alertPolicies
- Google Cloud Monitoring Severity enum - https://docs.cloud.google.com/monitoring/api/ref_v3/rest/v3/Severity
- Google Cloud Run request metrics for request count and response-code-class labels - https://docs.cloud.google.com/stackdriver/docs/solutions/slo-monitoring/sli-metrics/req-resp-metrics
- Google Cloud Monitoring alerting overview and incident closure behavior - https://docs.cloud.google.com/monitoring/alerts
- PagerDuty escalation policy documentation - https://support.pagerduty.com/main/docs/escalation-policies
- PagerDuty Event Orchestration documentation - https://support.pagerduty.com/main/docs/event-orchestration
- PagerDuty Event Orchestration examples - https://support.pagerduty.com/main/docs/event-orchestration-examples
- PagerDuty Events API v2 send-alert-event documentation - https://developer.pagerduty.com/docs/send-alert-event/

## Issues Found
- The original alert-policy commands used unsupported current `gcloud monitoring policies create` flags such as `--condition-threshold-value`, `--condition-threshold-comparison`, `--condition-threshold-duration`, aggregation-specific threshold flags, `--documentation-content`, and `--severity`. Replaced those examples with current `gcloud monitoring policies create --policy` JSON payloads using the documented AlertPolicy resource shape.
- The critical alert compared a successful-request rate to `0` with `COMPARISON_LT`, which would not fire for an exact zero value. Changed it to alert when successful request rate is below `0.01/sec` for 5 minutes.
- The warning alert described an error rate but only filtered 5xx request count and compared that count/rate to `0.05`. Changed it to a proper ratio by adding `denominatorFilter` and matching denominator aggregations.
- The policy examples attempted to set severity through a CLI flag that is not documented for `gcloud monitoring policies create`. Moved severity into the AlertPolicy JSON as the documented `severity` field.
- Updated notification-channel examples from `gcloud alpha monitoring channels` to `gcloud beta monitoring channels`, matching Google Cloud's current notification-channel API documentation launch stage.
- The PagerDuty orchestration example matched `event.custom_details.severity`, but PagerDuty Event Orchestration examples and Events API v2 use the common event severity field. Changed the expressions to match `event.severity` for `critical` and `warning`.

## Review Notes
The PagerDuty Event Orchestration JSON is illustrative rather than a full API request body. The surrounding text correctly directs readers to configure rules in PagerDuty, and the corrected expressions align with PagerDuty's documented event field conventions. Cloud Monitoring notification-channel management by API/CLI is documented as beta, so future readers should still verify CLI behavior against their installed Google Cloud CLI version.
