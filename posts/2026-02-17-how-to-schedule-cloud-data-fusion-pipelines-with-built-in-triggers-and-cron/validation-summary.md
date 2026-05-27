# Validation Summary: How to Schedule Cloud Data Fusion Pipelines with Built-In Triggers and Cron

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Data Fusion
- CDAP REST API
- Cron scheduling
- Cloud Scheduler
- Cloud Monitoring
- Runtime arguments and macros

## Sources Consulted
- Google Cloud Data Fusion: Schedule pipelines: https://docs.cloud.google.com/data-fusion/docs/how-to/schedule-pipelines
- Google Cloud Data Fusion: CDAP reference: https://docs.cloud.google.com/data-fusion/docs/reference/cdap-reference
- Google Cloud Data Fusion: Deploy and run pipelines: https://docs.cloud.google.com/data-fusion/docs/concepts/deploy-and-run-pipelines
- Google Cloud Data Fusion: Orchestrate pipelines: https://docs.cloud.google.com/data-fusion/docs/concepts/orchestrate-pipelines
- Google Cloud Data Fusion: Macros and macro functions: https://cloud.google.com/data-fusion/docs/concepts/macros
- Google Cloud Data Fusion: Create pipeline alerts: https://docs.cloud.google.com/data-fusion/docs/how-to/create-alerts
- Google Cloud Scheduler: Cron job format and time zone: https://docs.cloud.google.com/scheduler/docs/configuring/cron-job-schedules

## Issues Found
- The UI scheduling section described a dropdown with "Every X" and "Custom cron" options. Current Cloud Data Fusion docs describe Basic and Advanced tabs, so the wording was updated to match.
- The cron section called the syntax standard 5-field cron and used `1` for Monday. Cloud Data Fusion treats `1` in the day-of-week field as Sunday, so the Monday and weekday cron examples were corrected to use `2` and `2-6`.
- The REST API example used an unsupported schedule-creation payload at `/schedules/dataPipelineSchedule`. The documented approach is to include `config.schedule` in the batch pipeline deployment configuration and enable the deployed schedule with `/schedules/dataPipelineSchedule/enable`, so the curl example was corrected.
- The pipeline trigger UI instructions referenced a Schedule tab and "Pipeline Triggers." Current docs use "Inbound triggers" on the downstream deployed pipeline page, so the instructions were updated.
- Trigger status names were listed as "Succeeded", "Failed", and "Killed." Current docs use "Succeeds", "Fails", and "Stops", so those labels were corrected.
- The concurrency section claimed scheduled runs may be skipped or queued and did not mention Cloud Data Fusion's documented maximum of 10 concurrent runs. It was updated to say runs do not run when the concurrency limit is reached and to note the 10-run limit.
- The pause/resume section referenced "Suspend" and "Resume" buttons. Current docs say to suspend a schedule with "Unschedule" and start the schedule again from the pipeline page, so the wording was corrected.

## Review Notes
The runtime argument examples use the documented `logicalStartTime()` macro form. The monitoring section is directionally correct, but Cloud Data Fusion's official failure-alert guidance is specifically based on log-based alerts in Cloud Monitoring and requires Cloud Logging to be enabled.
