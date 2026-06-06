# Validation Summary: How to Collect Windows Performance Counters with the Collector

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector Contrib
- `windowsperfcounters` receiver
- Windows Performance Counters / PDH
- PowerShell `Get-Counter`
- IIS Web Service counters
- .NET Framework CLR performance counters
- OpenTelemetry `resourcedetection` and `batch` processors
- OTLP exporter

## Sources Consulted
- OpenTelemetry Collector Contrib `windowsperfcounters` receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/windowsperfcountersreceiver/README.md
- OpenTelemetry Collector Contrib `windowsperfcounters` receiver schema/source: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/windowsperfcountersreceiver
- OpenTelemetry Collector releases API / v0.153.0 Windows MSI assets: https://github.com/open-telemetry/opentelemetry-collector-releases/releases/tag/v0.153.0
- OpenTelemetry Collector Contrib `resourcedetection` processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/resourcedetectionprocessor/README.md
- Microsoft PDH function documentation: https://learn.microsoft.com/en-us/windows/win32/perfctrs/using-the-pdh-functions-to-consume-counter-data
- Microsoft PowerShell `Get-Counter` documentation: https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.diagnostics/get-counter
- Microsoft IIS `Win32_PerfRawData_W3SVC_WebService` counter documentation: https://learn.microsoft.com/en-us/previous-versions/aa394345(v=vs.85)
- Microsoft .NET Framework performance counter documentation: https://learn.microsoft.com/en-us/dotnet/framework/debug-trace-profile/performance-counters
- Microsoft .NET Framework side-by-side performance counter instance naming documentation: https://learn.microsoft.com/en-us/dotnet/framework/debug-trace-profile/performance-counters-and-in-process-side-by-side-applications

## Issues Found
- The installer command referenced OpenTelemetry Collector Contrib v0.96.0 with an old `windows_amd64.msi` asset name. Updated it to the current v0.153.0 `windows_x64.msi` asset verified in the official releases API.
- The IIS 404 counter used `Not Found Errors`, but the documented Web Service total counter display name is `Total Not Found Errors`. Updated the counter name.
- The IIS 404 metric was declared as a `sum` without the required `aggregation` setting. Added `aggregation: cumulative` and `monotonic: true` for the total counter.
- The .NET section described CLR performance counters as applying to ".NET applications" broadly and mentioned thread pool usage. Microsoft documents those counters as .NET Framework-specific and the sample counter is a logical thread counter, so the wording was narrowed to .NET Framework and thread usage.
- The .NET instance-name guidance said the instance name matches Task Manager exactly. Updated it to tell readers to verify CLR counter instance names because duplicate process names and side-by-side runtimes can add suffixes or process IDs.
- The localization guidance implied the Collector requires localized counter names on non-English Windows installations. The receiver uses PDH's English counter API when available, so the wording was corrected while keeping the registry note for troubleshooting local mappings.

## Review Notes
The receiver is beta for metrics and Windows-only. The snippets are configuration examples and were checked against the current receiver schema, but the specific Windows counters should still be verified on the target machine because installed Windows roles, IIS features, and application runtimes affect available counter sets.
