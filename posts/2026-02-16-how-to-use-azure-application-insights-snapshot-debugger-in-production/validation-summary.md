# Validation Summary: How to Use Azure Application Insights Snapshot Debugger in Production

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Application Insights
- Azure Monitor Snapshot Debugger
- Microsoft.ApplicationInsights.SnapshotCollector
- ASP.NET Core / .NET
- Visual Studio Enterprise
- Azure App Service
- Azure Monitor Logs / KQL
- Azure DevOps symbol publishing

## Sources Consulted
- Microsoft Learn: Debug exceptions in .NET applications using Snapshot Debugger - https://learn.microsoft.com/en-us/azure/azure-monitor/snapshot-debugger/snapshot-debugger
- Microsoft Learn: Enable Snapshot Debugger for .NET apps in Azure App Service - https://learn.microsoft.com/en-us/azure/azure-monitor/snapshot-debugger/snapshot-debugger-app-service
- Microsoft Learn: Enable Snapshot Debugger for .NET apps in Azure Service Fabric, Cloud Services, and Virtual Machines - https://learn.microsoft.com/en-us/azure/azure-monitor/snapshot-debugger/snapshot-debugger-vm
- Microsoft Learn: View Application Insights Snapshot Debugger data - https://learn.microsoft.com/en-us/azure/azure-monitor/snapshot-debugger/snapshot-debugger-data
- Microsoft Learn: Troubleshoot Azure Application Insights Snapshot Debugger - https://learn.microsoft.com/en-us/azure/azure-monitor/snapshot-debugger/snapshot-debugger-troubleshoot
- Microsoft Learn: Azure Monitor Logs reference - AppExceptions - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/appexceptions

## Issues Found
- Corrected the default snapshot threshold. The post said exceptions must occur at least five times by default; current Microsoft documentation says the default `ThresholdForSnapshotting` minimum is 1, meaning the same exception must occur twice before a snapshot is created.
- Corrected supported platform wording. The post broadly said only .NET and .NET Core applications are supported; Microsoft documents support for .NET Framework 4.6.2+ and .NET 6.0+ on Windows in supported server environments, with client apps excluded.
- Corrected the App Service portal path. Snapshot Debugger is enabled from the App Service resource under Monitoring > Application Insights, not from Application Insights Settings > Snapshot Debugger.
- Fixed the ASP.NET Core sample by adding `builder.Services.AddControllers()` before `app.MapControllers()`.
- Fixed incorrect `SnapshotCollectorConfiguration` comments and duplicate configuration in the code sample. `MaximumSnapshotsRequired`, `MaximumCollectionPlanSize`, `SnapshotInLowPriorityThread`, `ProblemCounterResetInterval`, and `FailedRequestLimit` now match documented meanings.
- Replaced the inaccurate `IsEnabledWhenProfiling` example, which was described as exception filtering, with a documented `FailedRequestLimit` setting.
- Added the documented `builder.Services.Configure<SnapshotCollectorConfiguration>(...)` binding required when configuring the collector from `appsettings.json`.
- Corrected the KQL query to use the documented `ai.snapshot.id` custom property and the `ExceptionType` column from the `AppExceptions` table.
- Corrected performance claims. The post claimed 10-30 ms latency and typical 10-50 MB snapshots; Microsoft documentation reports snapshot creation pauses around 0.3 seconds P50 with higher percentiles possible, and disk use is roughly proportional to the process working set.
- Corrected the troubleshooting version guidance from .NET Core 2.0+ / .NET Framework 4.6+ to .NET 6.0+ on Windows / .NET Framework 4.6.2+.
- Adjusted retention guidance to reflect the documented 15-day default retention period and the support-case path for longer retention.

## Review Notes
The post is technically relevant and remains a valid production debugging guide after correction. Snapshot Debugger support is platform- and environment-specific, so future updates should recheck Microsoft Learn before publishing, especially for Visual Studio and App Service support details.
