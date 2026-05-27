# Validation Summary: How to Schedule a Cloud Workflow to Run on a Recurring Basis

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Workflows
- Google Cloud Workflow Executions API
- Google Cloud Scheduler
- Google Cloud CLI
- IAM service accounts and roles
- Unix cron syntax
- Cloud Monitoring

## Sources Consulted
- Google Cloud Workflows: Schedule a workflow using Cloud Scheduler: https://cloud.google.com/workflows/docs/schedule-workflow
- Google Cloud SDK reference: gcloud scheduler jobs create http: https://docs.cloud.google.com/sdk/gcloud/reference/scheduler/jobs/create/http
- Google Cloud SDK reference: gcloud scheduler jobs update http: https://cloud.google.com/sdk/gcloud/reference/scheduler/jobs/update/http
- Google Cloud SDK reference: gcloud scheduler jobs run: https://cloud.google.com/sdk/gcloud/reference/scheduler/jobs/run
- Google Cloud SDK reference: gcloud workflows deploy: https://docs.cloud.google.com/sdk/gcloud/reference/workflows/deploy
- Workflows REST API: Workflow Executions API: https://cloud.google.com/workflows/docs/reference/executions/rest
- Workflows documentation: Execute a workflow: https://docs.cloud.google.com/workflows/docs/executing-workflow
- Workflows standard library: time.format: https://cloud.google.com/workflows/docs/reference/stdlib/time/format
- Workflows standard library: sys.log: https://cloud.google.com/workflows/docs/reference/stdlib/sys/log
- Workflows logging guide: https://cloud.google.com/workflows/docs/log-workflow
- Workflows built-in environment variables: https://cloud.google.com/workflows/docs/reference/environment-variables
- Cloud Scheduler cron format and time zone: https://docs.cloud.google.com/scheduler/docs/configuring/cron-job-schedules
- Cloud Scheduler authentication with HTTP targets: https://docs.cloud.google.com/scheduler/docs/http-target-auth
- Cloud Monitoring API: projects.timeSeries.list: https://cloud.google.com/monitoring/api/ref_v3/rest/v3/projects.timeSeries/list
- Google Cloud IAM roles: Cloud Monitoring roles and permissions: https://cloud.google.com/iam/docs/roles-permissions/monitoring

## Issues Found
- The prerequisites and API enable command omitted `workflowexecutions.googleapis.com`, even though the Scheduler job calls the Workflow Executions REST API at `workflowexecutions.googleapis.com`. Added the Workflow Executions API to the prerequisite list and `gcloud services enable` command.
- The sample workflow calls the Cloud Monitoring `projects.timeSeries.list` API, but the service account setup only granted `roles/workflows.invoker`. Added `roles/monitoring.viewer` so the workflow identity can read the time series data used in the example.
- The sample workflow writes custom log entries with `sys.log`, but the service account setup did not include `logging.logEntries.create`. Added `roles/logging.logWriter` so those custom log steps can run successfully.

## Review Notes
The Cloud Scheduler HTTP target, OAuth service account flags, Workflows executions endpoint, JSON-string `argument` field, cron syntax examples, and workflow syntax were checked against current Google Cloud documentation and are otherwise technically valid.
