# Validation Summary: How to Set Up Cloud Monitoring Alerts for Cloud SQL Database Performance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud SQL
- Cloud Monitoring alerting policies
- Google Cloud CLI
- Terraform Google provider
- Cloud SQL metrics for CPU, memory, disk, connections, replication lag, and uptime

## Sources Consulted
- Google Cloud Monitoring metrics list for Cloud SQL: https://docs.cloud.google.com/monitoring/api/metrics_gcp_c
- Cloud Monitoring alert policy API reference: https://docs.cloud.google.com/monitoring/api/ref_v3/rest/v3/projects.alertPolicies
- gcloud monitoring policies create reference: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Cloud Monitoring notification channels API guide: https://docs.cloud.google.com/monitoring/alerts/using-channels-api
- Cloud SQL for MySQL replication lag documentation: https://docs.cloud.google.com/sql/docs/mysql/replication/replication-lag
- Cloud SQL for MySQL database flags documentation: https://docs.cloud.google.com/sql/docs/mysql/flags
- Cloud SQL for PostgreSQL database flags documentation: https://docs.cloud.google.com/sql/docs/postgres/flags
- Terraform google_monitoring_alert_policy resource documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/monitoring_alert_policy

## Issues Found
- The CPU alert command used `gcloud alpha monitoring policies create`. Changed it to the current stable `gcloud monitoring policies create --policy-from-file=cloudsql-cpu-alert.json`.
- The disk space section said the database becomes read-only when storage is exhausted. Changed this to say writes start failing, matching Cloud SQL guidance.
- The connection metric was presented as generally applicable to Cloud SQL. Clarified that `cloudsql.googleapis.com/database/network/connections` applies to MySQL and SQL Server, and added a PostgreSQL caveat.
- The connection-limit examples gave unsupported fixed tier-specific values. Replaced them with guidance based on database engine, configuration, and instance size.
- The uptime alert used `conditionAbsent` for `database/up`. Changed it to a threshold condition that alerts when `database/up` is less than `1`, because the metric reports `0` when the server is down.
- The Slack notification channel example omitted the required Slack auth token label. Added `auth_token=SLACK_BOT_USER_OAUTH_TOKEN`.
- The notification-channel instructions said to reference channel names. Changed this to reference notification channel resource names.

## Review Notes
The JSON alert policy snippets parse successfully. The local environment does not have `gcloud` installed, so CLI verification was performed against the official Google Cloud SDK reference instead of local `--help` output.
