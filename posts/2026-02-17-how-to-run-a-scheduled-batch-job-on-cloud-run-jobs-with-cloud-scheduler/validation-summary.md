# Validation Summary: How to Run a Scheduled Batch Job on Cloud Run Jobs with Cloud Scheduler

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Run Jobs
- Google Cloud Scheduler
- Google Cloud CLI
- Cloud Monitoring
- Cloud Storage
- BigQuery
- Python 3.12
- Docker

## Sources Consulted
- Cloud Run documentation: Execute jobs on a schedule - https://docs.cloud.google.com/run/docs/execute/jobs-on-schedule
- Cloud Run documentation: Create jobs - https://docs.cloud.google.com/run/docs/create-jobs
- Cloud Run documentation: Manage job executions - https://docs.cloud.google.com/run/docs/managing/job-executions
- Cloud Run IAM roles - https://cloud.google.com/run/docs/reference/iam/roles
- gcloud reference: run jobs create - https://docs.cloud.google.com/sdk/gcloud/reference/run/jobs/create
- gcloud reference: run jobs logs read - https://docs.cloud.google.com/sdk/gcloud/reference/run/jobs/logs/read
- gcloud reference: monitoring policies create - https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Cloud Monitoring metrics list for Cloud Run - https://docs.cloud.google.com/monitoring/api/metrics_gcp_p_z#run
- Cloud Monitoring monitored resource types - https://docs.cloud.google.com/monitoring/api/resources#cloud_run_job
- Cloud Run Admin API v2 Condition reference - https://cloud.google.com/run/docs/reference/rest/v2/Condition
- Cloud Run Admin API v1 executions reference - https://docs.cloud.google.com/run/docs/reference/rest/v1/namespaces.executions
- Python 3.12 documentation: datetime deprecations - https://docs.python.org/3.12/whatsnew/3.12.html
- Cloud Run pricing - https://cloud.google.com/run/pricing

## Issues Found
- The Python example used `datetime.utcnow()`, which is deprecated in Python 3.12. Updated it to `datetime.now(timezone.utc)` and imported `timezone`.
- The log command used a non-current `gcloud run jobs executions logs read` form. Updated it to the documented `gcloud run jobs logs read daily-etl-job` command.
- The Cloud Scheduler target URI used the older Cloud Run Admin API v1 regional path. Updated it to the currently documented v2 `https://run.googleapis.com/v2/projects/.../locations/.../jobs/...:run` URI.
- The Cloud Monitoring alert command used unsupported threshold flag names for `gcloud monitoring policies create`. Replaced them with the documented `--if="> 0"` and `--duration=0s` flags.
- The shell status check compared a condition type to `Completed`, which can report the condition name rather than success. Updated it to check the execution condition status for `True`.
- The cost example did not mention that the calculation excludes Cloud Run free tier usage. Added "before any free tier usage" to keep the estimate accurate.

## Review Notes
- The Cloud Run job creation flags, task environment variables, IAM role for invoking jobs, Scheduler OAuth usage for Google APIs, and Cloud Run job metric names are consistent with current Google Cloud documentation.
- The cost estimate remains a simplified example and does not account for project-level free tier consumption, regional pricing variations, committed use discounts, or other Google Cloud charges.
