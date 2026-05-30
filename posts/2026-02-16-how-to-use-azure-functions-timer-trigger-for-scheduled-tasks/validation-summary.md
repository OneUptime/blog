# Validation Summary: How to Use Azure Functions Timer Trigger for Scheduled Tasks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Functions timer triggers
- NCRONTAB / CRON schedules
- Azure Functions .NET isolated worker
- Azure Function app settings
- Azure Storage blob leases
- Azure Monitor scheduled query alerts
- Application Insights
- Azure CLI

## Sources Consulted
- Azure Functions timer trigger reference: https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-timer
- Azure Functions error handling and retry guidance: https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-error-pages
- Azure Functions monitoring reference: https://learn.microsoft.com/en-us/azure/azure-functions/monitor-functions
- Azure Functions telemetry analysis with Application Insights: https://learn.microsoft.com/en-us/azure/azure-functions/analyze-telemetry-data
- Azure CLI function app settings reference: https://learn.microsoft.com/en-us/cli/azure/functionapp/config/appsettings
- Azure CLI scheduled query alert reference: https://learn.microsoft.com/en-us/cli/azure/monitor/scheduled-query
- Azure CLI metric alert reference: https://learn.microsoft.com/en-us/cli/azure/monitor/metrics/alert
- Azure Storage BlobLeaseClient API reference: https://learn.microsoft.com/en-us/dotnet/api/azure.storage.blobs.specialized.blobleaseclient

## Issues Found
- The post said Azure Functions uses only six-field CRON expressions. Updated this to state that Azure Functions supports NCRONTAB expressions in both five-field and six-field formats, with the six-field format adding seconds.
- The timezone section incorrectly suggested configuring timezone behavior in `host.json` and mentioned `%` syntax / `scheduleStatus` as timezone mechanisms. Replaced this with the documented `WEBSITE_TIME_ZONE` app setting approach and added the Linux Consumption / Flex Consumption limitation.
- The business-hours CRON example said 8 AM - 6 PM, but `8-17` runs through the 5 PM hour. Updated the comment to 8:00 AM - 5:45 PM.
- The overlapping execution section incorrectly said scaled-out instances each maintain their own timer and can concurrently execute the same timer trigger. Updated it to reflect Azure Functions' documented storage-lock behavior across scale-out.
- The blob lease example used a five-minute lease, but finite Azure blob leases must be 15 to 60 seconds. Changed it to 60 seconds and added guidance to renew the lease or use an infinite lease for longer work.
- The blob creation check could race between instances. Replaced the exists-then-upload pattern with upload-and-handle-conflict.
- The monitoring command used an invalid metric alert shape for timer-triggered function failures and an incorrect action group flag. Replaced it with a scheduled query alert using Application Insights exception telemetry and the documented `--action-groups` / `--condition-query` syntax.
- The summary repeated the distributed-lock guidance as if it were required for scaled-out timer triggers. Updated it to clarify that custom locks are for coordinating with other apps or jobs touching the same resource.

## Review Notes
The .NET isolated timer trigger, `TimerInfo.IsPastDue`, `ScheduleStatus`, app-setting schedule reference syntax, and `ExponentialBackoffRetry` usage are consistent with current official documentation. The examples are illustrative and omit surrounding project setup such as dependency injection registration and package references.
