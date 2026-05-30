# Validation Summary: How to Audit and Monitor Access Level Evaluations in GCP

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Platform
- Access Context Manager
- VPC Service Controls
- Identity-Aware Proxy
- Cloud Audit Logs
- Cloud Logging
- Cloud Monitoring
- BigQuery log sinks
- Terraform `google_monitoring_dashboard`
- IAM Policy Troubleshooter

## Sources Consulted
- Google Cloud VPC Service Controls audit logging: https://docs.cloud.google.com/vpc-service-controls/docs/audit-logging
- Google Cloud VPC Service Controls troubleshooting: https://docs.cloud.google.com/vpc-service-controls/docs/troubleshooting
- Google Cloud Audit Logs overview: https://cloud.google.com/logging/docs/audit/
- Google Cloud IAP audit logging: https://docs.cloud.google.com/iap/docs/audit-log-howto
- Google Cloud IAP context-aware access logging notes: https://docs.cloud.google.com/iap/docs/cloud-iap-context-aware-access-howto
- Google Cloud CLI `gcloud logging metrics create`: https://docs.cloud.google.com/sdk/gcloud/reference/logging/metrics/create
- Google Cloud Logging labels on log-based metrics: https://docs.cloud.google.com/logging/docs/logs-based-metrics/labels
- Google Cloud CLI `gcloud alpha monitoring policies create`: https://docs.cloud.google.com/sdk/gcloud/reference/alpha/monitoring/policies/create
- Google Cloud Logging routed logs in BigQuery: https://docs.cloud.google.com/logging/docs/export/bigquery
- Google Cloud CLI `gcloud policy-troubleshoot iam`: https://docs.cloud.google.com/sdk/gcloud/reference/policy-troubleshoot/iam
- Google Cloud Monitoring dashboards API and Terraform note: https://docs.cloud.google.com/monitoring/dashboards/api-dashboard

## Issues Found
- VPC Service Controls log description incorrectly referred to a `violationInfo` field. Updated it to refer to Policy Denied audit logs with `VpcServiceControlAuditMetadata`, matching the official audit log schema.
- The post implied Data Access logs were required for VPC Service Controls violations. Clarified that Policy Denied logs are generated separately, while Data Access logs are needed for other service-level investigation such as IAP traffic.
- Cloud Logging filters used `protoPayload.metadata.@type`. Updated filters to `protoPayload.metadata."@type"` because Logging query language requires quoting field path components with special characters.
- VPC Service Controls field list used shortened field names and described `accessLevels` as evaluated levels. Updated the paths to the full audit log fields and described `accessLevels` as matched levels.
- The detailed log-based metric command used a non-existent inline `--label-extractors` flag. Replaced it with the documented `--config-from-file` workflow and added a minimal YAML `LogMetric` definition containing `metricDescriptor.labels` and `labelExtractors`.
- The alerting policy command used invalid threshold flags. Replaced them with the documented `--if='> 50'` and `--duration=300s` flags for `gcloud alpha monitoring policies create`.
- The BigQuery sink filter used the same unquoted `@type` field and narrowed IAP logs to a resource type that is not generally correct for all IAP logs. Updated the filter to use the quoted `@type` field and service name.
- The sink command omitted that the sink writer identity might need BigQuery dataset permissions. Added a short note to grant the writer identity permission when required.
- BigQuery examples queried `protopayload_auditlog.metadata.violationReason`, but routed audit log metadata is stored in `protopayload_auditlog.metadataJson`. Updated the SQL to use `JSON_VALUE(..., '$.violationReason')`.

## Review Notes
- The dashboard example references `logging.googleapis.com/user/iap-denials`, but the post does not create that metric. This can still be valid if the reader creates a corresponding IAP denial metric separately, but the post could be expanded in the future to include that metric.
- Labels based on principals can increase log-based metric cardinality. The example is technically valid, but production users should keep Cloud Monitoring time-series limits and cost in mind.
