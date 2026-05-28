# Validation Summary: How to Fix Cloud SQL Instance Stuck in Maintenance State After Patch Update

## Status
validated

## Post Type
Guide

## Technologies Covered
- Google Cloud SQL
- Google Cloud CLI (`gcloud`)
- Cloud Logging
- Cloud Monitoring API
- MySQL
- Bash
- Mermaid

## Sources Consulted
- Cloud SQL for MySQL maintenance updates: https://docs.cloud.google.com/sql/docs/mysql/maintenance
- Cloud SQL view and set maintenance windows: https://docs.cloud.google.com/sql/docs/mysql/set-maintenance-window
- Cloud SQL high availability overview: https://docs.cloud.google.com/sql/docs/mysql/high-availability
- `gcloud sql instances patch` reference: https://docs.cloud.google.com/sdk/gcloud/reference/sql/instances/patch
- `gcloud sql instances failover` reference: https://docs.cloud.google.com/sdk/gcloud/reference/sql/instances/failover
- `gcloud sql instances clone` reference: https://docs.cloud.google.com/sdk/gcloud/reference/sql/instances/clone
- `gcloud sql backups restore` reference: https://docs.cloud.google.com/sdk/gcloud/reference/sql/backups/restore
- `gcloud sql backups create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/sql/backups/create
- `gcloud sql connect` reference: https://docs.cloud.google.com/sdk/gcloud/reference/sql/connect
- `gcloud logging read` reference: https://docs.cloud.google.com/sdk/gcloud/reference/logging/read
- Cloud Logging query language: https://docs.cloud.google.com/logging/docs/view/logging-query-language
- Cloud SQL Admin API operations reference: https://docs.cloud.google.com/sql/docs/mysql/admin-api/rest/v1/operations
- Google Cloud Customer Care case procedures: https://docs.cloud.google.com/support/docs/customer-care-procedures
- Cloud Monitoring time series API reference: https://cloud.google.com/monitoring/api/ref_v3/rest/v3/projects.timeSeries/list

## Issues Found
- The post stated that normal maintenance typically completes within 10-30 minutes and included tier-based timing estimates. Google Cloud documentation states that maintenance updates take approximately 5-10 minutes per instance, with longer overall duration possible for read replicas, high activity, very large datasets, and legacy MySQL HA. Updated the timing guidance.
- The HA failover section implied that the standby might be usable during maintenance and that manual failover was worth trying. Google Cloud documentation says the primary must be in a normal operating state, not undergoing maintenance, for failover. Updated the guidance to set correct expectations.
- The introduction referred to a stale failover instance, which is misleading for Cloud SQL HA because failover uses a synchronized standby and shared address behavior. Changed the wording to a stale fallback path.
- The maintenance window command used `--maintenance-window-day=SUN`. Official examples use full day names such as `SUNDAY`. Updated the command.
- The support section implied a support case could be created through `gcloud` and over-specified internal remediation actions. Official Customer Care documentation directs users to create support cases in the Google Cloud console. Updated the comment and narrowed the support expectations.
- The pre-maintenance disk utilization command used `gcloud monitoring time-series list`, which is not present in the current `gcloud monitoring` reference, and used BSD-specific `date -v-10M`. Replaced it with a current Cloud Monitoring API request using `curl`, `gcloud auth print-access-token`, and GNU-compatible `date -d`.
- The pre-maintenance transaction check attempted to pass `-e` through `gcloud sql connect`, but the current `gcloud sql connect` reference does not support arbitrary MySQL client arguments. Replaced it with a direct `mysql --execute` example using a configurable host or proxy endpoint.
- The key takeaways recommended at least 20% free disk space. Cloud SQL documentation specifically states maintenance is skipped when disk usage is higher than 97%. Updated the recommendation to keep usage comfortably below 97%.

## Review Notes
The post focuses on MySQL-specific diagnostics in the checklist while the title is broadly Cloud SQL. Future revisions could call out PostgreSQL and SQL Server equivalents for long-running sessions, but the corrected MySQL examples are technically valid.
