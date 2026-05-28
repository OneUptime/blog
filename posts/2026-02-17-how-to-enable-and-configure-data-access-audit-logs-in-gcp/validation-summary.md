# Validation Summary: How to Enable and Configure Data Access Audit Logs in GCP

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google Cloud Audit Logs
- Google Cloud Logging and Logs Explorer
- Google Cloud IAM audit configurations
- Google Cloud CLI
- Cloud Storage audit logging
- BigQuery audit logging
- Cloud SQL audit logging
- Terraform Google provider IAM audit config resources

## Sources Consulted
- Google Cloud Logging: Cloud Audit Logs overview: https://docs.cloud.google.com/logging/docs/audit
- Google Cloud Logging: Enable Data Access audit logs: https://docs.cloud.google.com/logging/docs/audit/configure-data-access
- Google Cloud Logging: Understanding audit logs: https://docs.cloud.google.com/logging/docs/audit/understanding-audit-logs
- Google Cloud Logging: SQL queries for security insights: https://docs.cloud.google.com/logging/docs/analyze/analyze-audit-logs
- Google Cloud Logging: Query and view log entries with Log Analytics: https://docs.cloud.google.com/logging/docs/log-analytics
- Google Cloud Logging: Monitor your logs and billing metrics: https://cloud.google.com/logging/docs/alerting/monitoring-logs
- Google Cloud IAM Policy REST reference: https://docs.cloud.google.com/iam/docs/reference/rest/v1/Policy
- Google Cloud SDK: gcloud projects set-iam-policy: https://docs.cloud.google.com/sdk/gcloud/reference/projects/set-iam-policy
- Google Cloud SQL for PostgreSQL audit logging: https://docs.cloud.google.com/sql/docs/postgres/audit-logging
- Terraform Registry: google_project_iam_audit_config and google_organization_iam_audit_config resource documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/project_iam_audit_config

## Issues Found
- The introduction said Data Access audit logs are not enabled by default without naming the BigQuery exception. Updated it to say they are not enabled by default for services other than BigQuery.
- The examples implied Cloud Audit Logs show who queried a Cloud SQL database. Cloud SQL Cloud Audit Logs cover Cloud SQL API methods, while database query auditing is engine-specific. Updated the wording to refer to Cloud SQL data-access API methods.
- The audit log type table described Policy Denied logs as free and specific to VPC Service Controls. Google documents Policy Denied logs as generated for security policy violations, with storage charges possible. Updated the table accordingly.
- The cost explanation said Data Access audit logs are billed at standard Cloud Logging ingestion rates. Google currently frames this as additional Cloud Logging usage charges. Updated the wording to avoid overstating a specific pricing mechanism.
- The Log Analytics table name used a single dotted BigQuery identifier. Current Google examples use separate backtick-quoted components for log-view table names. Updated the example to `` `my-project`.`global`.`_Default`.`_AllLogs` ``.
- The conclusion listed Cloud SQL as a data store without qualification. Updated it to "Cloud SQL API methods" to avoid implying general SQL statement auditing through Cloud Audit Logs.

## Review Notes
The gcloud and Terraform snippets use current resource names, fields, and log type values. The local environment did not have `gcloud` installed, so CLI verification was performed against official Google Cloud SDK documentation instead of local `--help` output.
