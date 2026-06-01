# Validation Summary: Enable Telemetry Sampling in Azure Application Insights to Reduce Data Costs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Application Insights
- Azure Monitor / Log Analytics
- Application Insights classic SDK for ASP.NET Core
- Application Insights SDK for Node.js
- Application Insights Java agent
- Kusto Query Language (KQL)

## Sources Consulted
- Microsoft Learn: Monitor .NET and Node.js Applications with Application Insights (Classic API 2.x) - https://learn.microsoft.com/en-us/previous-versions/azure/azure-monitor/app/classic-api
- Microsoft Learn: Configuring OpenTelemetry in Application Insights - https://learn.microsoft.com/en-us/azure/azure-monitor/app/opentelemetry-configuration
- Microsoft Learn: Configure Azure Monitor Application Insights for Java, sampling overrides - https://learn.microsoft.com/en-us/azure/azure-monitor/app/java-standalone-config#sampling-overrides
- Microsoft Learn: Sampling in Azure Application Insights with OpenTelemetry - https://learn.microsoft.com/en-us/azure/azure-monitor/app/opentelemetry-sampling
- Microsoft Learn: Analyze usage in a Log Analytics workspace - https://learn.microsoft.com/en-us/azure/azure-monitor/logs/analyze-usage
- Microsoft Learn: Application Insights FAQ - https://learn.microsoft.com/en-us/azure/azure-monitor/app/application-insights-faq

## Issues Found
- The .NET adaptive sampling example added two adaptive sampling processors. I changed it to disable the default adaptive sampler and add one custom adaptive sampling processor with the intended exclusions.
- The .NET fixed-rate sampling example did not disable the default adaptive sampler before adding fixed-rate sampling. I updated the example to disable adaptive sampling first.
- The post described SDK sampling as "server-side." I changed adaptive and fixed-rate sampling to "application-side" and qualified the default behavior as applying to the classic Application Insights SDK.
- The Node.js example set `samplingPercentage` after starting the SDK. I moved the sampling configuration before `appInsights.start()`, matching the official SDK guidance.
- The Java agent example used `matchType: "contains"` and `http.url`, which are not valid for current Java agent sampling overrides. I changed the override to use `url.path` with `matchType: "strict"`.
- The ingestion volume query estimated volume from `sum(itemCount)` and a rough record size, which estimates represented telemetry rather than billable ingested bytes. I changed it to use `_IsBillable` and `_BilledSize`, which Microsoft documents for analyzing billable data volume.
- The explanation that all sampling preserves complete transactions was too broad because ingestion sampling can break traces. I narrowed that statement to application-level/source-level sampling.

## Review Notes
- Microsoft recommends the Azure Monitor OpenTelemetry Distro for new applications, while the post's .NET and Node.js snippets use the classic Application Insights SDK. The post is still technically valid after the edits, but a future update could add OpenTelemetry-based examples.
