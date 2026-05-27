# Validation Summary: How to Schedule and Email Looker Reports to Stakeholders Automatically

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Looker dashboards and Looks
- Looker Scheduler
- Looker API 4.0 scheduled plans
- Python Looker SDK
- Email, Slack, Amazon S3, Google Cloud Storage, and SFTP scheduled deliveries
- SQL threshold query example

## Sources Consulted
- Google Cloud Looker documentation: Using the Looker Scheduler to deliver content - https://docs.cloud.google.com/looker/docs/scheduling
- Google Cloud Looker documentation: Scheduling and sending dashboards - https://docs.cloud.google.com/looker/docs/scheduling-and-sending-dashboards
- Google Cloud Looker documentation: Delivering Looks and Explores - https://docs.cloud.google.com/looker/docs/delivering-looks-explores
- Google Cloud Looker documentation: Scheduling deliveries to the Slack integration - https://docs.cloud.google.com/looker/docs/scheduling-slack
- Google Cloud Looker API reference: Create Scheduled Plan - https://docs.cloud.google.com/looker/docs/reference/looker-api/latest/methods/ScheduledPlan/create_scheduled_plan
- Google Cloud Looker API reference: WriteScheduledPlan - https://docs.cloud.google.com/looker/docs/reference/looker-api/latest/types/WriteScheduledPlan
- Google Cloud Looker API reference: ScheduledPlanDestination - https://docs.cloud.google.com/looker/docs/reference/looker-api/latest/types/ScheduledPlanDestination
- Google Cloud Looker API reference: Get All Scheduled Plans - https://docs.cloud.google.com/looker/docs/reference/looker-api/latest/methods/ScheduledPlan/all_scheduled_plans
- Google Cloud Looker API reference: Update Scheduled Plan - https://docs.cloud.google.com/looker/docs/reference/looker-api/latest/methods/ScheduledPlan/update_scheduled_plan
- Google Cloud Looker API reference: Run Scheduled Plan Once by Id - https://docs.cloud.google.com/looker/docs/reference/looker-api/latest/methods/ScheduledPlan/scheduled_plan_run_once_by_id
- Looker Python SDK source, sdk-codegen repository - https://github.com/looker-open-source/sdk-codegen

## Issues Found
- Dashboard scheduling UI used the older "gear icon" / "Schedule" wording. Updated it to the current dashboard actions three-dot menu and "Schedule delivery" wording.
- External email recipients were described as depending on "the right format." Updated this to the documented permission and Email Domain Allowlist behavior.
- Dashboard format options incorrectly listed inline tables and single CSV attachments. Updated them to dashboard-supported PDF, visualization PNG, and CSV ZIP formats.
- Look format options treated Google Sheets as a file format. Replaced that with documented Look delivery formats: CSV, XLSX, JSON, text, and HTML.
- API examples embedded the timezone in the `crontab` string. The Looker API exposes `crontab` and `timezone` as separate fields, so the examples now pass `timezone="America/New_York"` separately.
- The filtered schedule API example interpolated filter values directly into `filters_string`. Updated it to use `urllib.parse.urlencode()` so filter values are safely encoded.
- Slack scheduling format wording was too broad for dashboards. Updated it to match dashboard Slack delivery formats: PDF, visualization PNG, or CSV ZIP.
- Cloud storage wording implied GCS is a built-in scheduler destination equivalent to S3. Clarified that Amazon S3 is built in and Google Cloud Storage depends on an enabled integration.
- The maintenance snippet used `looker_sdk` without importing it in that code block. Added the import.
- The monitoring code called `scheduled_plan_run_once_by_id()` while trying to check failures. That API runs a copy of the schedule immediately, so the code was removed and the post now directs readers to the Schedule History page for failed-run investigation.
- The SQL threshold example could divide by zero and could perform integer division in some dialects. Updated it to multiply by `1.0` and use `NULLIF(total_requests, 0)`.

## Review Notes
The post is now accurate for current Looker scheduling and API behavior. Some exact UI labels can still vary by Looker deployment settings, permissions, and enabled integrations.
