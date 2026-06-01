# Validation Summary: How to Configure Azure Application Insights Profiler to Diagnose Slow Requests

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Application Insights Profiler for .NET
- Azure Monitor
- Azure App Service
- Azure Functions
- Azure Virtual Machines and VM Scale Sets
- ASP.NET Core
- .NET
- Azure CLI
- Azure Diagnostics extension

## Sources Consulted
- Microsoft Learn: Enable the .NET Profiler for Azure App Service apps in Windows - https://learn.microsoft.com/en-us/azure/azure-monitor/profiler/profiler
- Microsoft Learn: Configure Application Insights Profiler for .NET - https://learn.microsoft.com/en-us/azure/azure-monitor/profiler/profiler-settings
- Microsoft Learn: Enable the .NET Profiler for web apps on an Azure virtual machine - https://learn.microsoft.com/en-us/azure/azure-monitor/profiler/profiler-vm
- Microsoft Learn: Enable the .NET Profiler for Azure Functions apps - https://learn.microsoft.com/en-us/azure/azure-monitor/profiler/profiler-azure-functions
- Microsoft Learn: Enable the .NET Profiler on Azure containers - https://learn.microsoft.com/en-us/azure/azure-monitor/profiler/profiler-containers
- Microsoft Learn: Troubleshoot Application Insights Profiler for .NET - https://learn.microsoft.com/en-us/azure/azure-monitor/profiler/profiler-troubleshooting
- Microsoft ApplicationInsights-Profiler-AspNetCore repository: README, configuration reference, and support matrix - https://github.com/microsoft/ApplicationInsights-Profiler-AspNetCore

## Issues Found
- The App Service support statement did not mention Basic tier or higher, and the Azure Functions support statement did not mention App Service plan support. Updated both to match Microsoft Learn guidance.
- The Azure Portal path for App Service setup used `Settings > Application Insights` and a generic "Enable Profiler" action. Updated it to `Monitoring > Application Insights` and the current `Profiler and Code Optimizations` setting.
- The Azure CLI app settings example omitted `APPLICATIONINSIGHTS_CONNECTION_STRING`, which is required in the documented manual App Service setup. Added it to the command.
- The ASP.NET Core package setup installed only `Microsoft.ApplicationInsights.Profiler.AspNetCore`, while the sample also uses `AddApplicationInsightsTelemetry()`. Added `Microsoft.ApplicationInsights.AspNetCore`.
- The custom CPU trigger configuration used an unsupported nested `CpuTriggerConfiguration` shape. Replaced it with the documented `CPUTriggerThreshold` setting.
- The "Profile Now" steps included choosing a duration, which is not part of the current Microsoft Learn flow. Removed that step and described confirming the profiling session.
- The VM configuration snippet used an incorrect Profiler sink object with `InstrumentationKey` and `ConnectionString` fields. Replaced it with the documented `WadCfg.SinksConfig.Sink` shape using `ApplicationInsightsProfiler`.
- The overhead numbers said 2-5% CPU and a few MB of memory, but current troubleshooting documentation states 5-15% CPU and memory overhead while active. Updated the overhead section.

## Review Notes
The post remains a technically relevant Azure performance diagnostics guide. Future updates could mention the distinction between the classic Application Insights SDK 2.x profiler package and Azure Monitor OpenTelemetry Profiler for applications that have moved to the OpenTelemetry-based Application Insights SDK.
