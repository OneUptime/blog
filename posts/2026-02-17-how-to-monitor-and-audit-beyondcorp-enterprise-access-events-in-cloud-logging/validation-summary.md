# Validation Summary: How to Monitor and Audit BeyondCorp Enterprise Access Events in Cloud Logging

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud BeyondCorp Enterprise
- Identity-Aware Proxy (IAP)
- Cloud Audit Logs
- Cloud Logging
- Log-based metrics
- Cloud Monitoring dashboards and alerting policies
- Log sinks to Pub/Sub, Cloud Storage, and BigQuery
- BigQuery SQL
- Google Cloud CLI

## Sources Consulted
- Identity-Aware Proxy audit logging: https://docs.cloud.google.com/iap/docs/audit-log-howto
- Context-aware access with IAP and Cloud Audit Logs: https://docs.cloud.google.com/iap/docs/cloud-iap-context-aware-access-howto
- Cloud Logging query language: https://docs.cloud.google.com/logging/docs/view/logging-query-language
- Google Cloud CLI logging reference: https://cloud.google.com/logging/docs/reference/tools/gcloud-logging
- gcloud logging metrics create reference: https://docs.cloud.google.com/sdk/gcloud/reference/logging/metrics/create
- LogMetric API reference: https://docs.cloud.google.com/logging/docs/reference/v2/rest/v2/projects.metrics#LogMetric
- Log-based metric labels: https://docs.cloud.google.com/logging/docs/logs-based-metrics/labels
- gcloud monitoring policies create reference: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Cloud Logging log retention: https://docs.cloud.google.com/logging/docs/store-log-entries
- Cloud Logging BigQuery export schema: https://docs.cloud.google.com/logging/docs/export/bigquery
- Cloud Logging IAM access control: https://cloud.google.com/logging/docs/access-control
- Compute Engine SSH auditing with IAP AuthorizeUser events: https://docs.cloud.google.com/compute/docs/connect/ssh-best-practices/auditing

## Issues Found
- The post overclaimed that every authentication, token refresh, access-level evaluation, and session event is logged. I revised this to focus on IAP authorization decisions, access-level details present in audit entries, device posture signals when available, and policy changes.
- The prerequisites listed `roles/logging.viewer` for access logs. Data Access audit logs require private log access, so I changed the prerequisite to `roles/logging.privateLogViewer` or `roles/logging.admin`.
- The post omitted that IAP Data Access audit logs must be enabled for access events. I added that prerequisite.
- Several filters used `resource.type="audited_resource"`, which can miss IAP access logs for resource-specific monitored resources. I removed that constraint and kept the `protoPayload.serviceName="iap.googleapis.com"` filter.
- The log-based metric example used a non-existent `--label-extractors` flag. I replaced it with a JSON LogMetric config file and `--config-from-file`, matching the documented gcloud workflow for user-defined labels.
- The alerting command used the wrong command group and unsupported flags (`gcloud monitoring alerting policies create`, `--condition-threshold-value`, `--condition-threshold-duration`, and `--condition-threshold-comparison`). I corrected it to `gcloud monitoring policies create` with `--if`, `--duration`, and `--aggregation`.
- The "after-hours" metric used `timestamp.hour`, which is not a valid Cloud Logging filter field or function. I changed the example to create a valid granted-access metric and clarified that recurring business-hour logic should be applied in Monitoring notification handling or BigQuery analysis.
- The Pub/Sub sink example was described as a log-based alert. I changed the comment to describe it accurately as routing candidate events to Pub/Sub for alert processing.
- The compliance reporting filter was missing an `AND` before the timestamp predicate. I added the missing operator.

## Review Notes
The BigQuery examples assume the standard exported Cloud Audit Logs table naming and legacy exported-log schema. Deployments using partitioned tables, linked log buckets, or Log Analytics may need table-name adjustments.
