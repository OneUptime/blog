# Validation Summary: How to Set Up Azure API Management with Application Insights Logging

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure API Management
- Azure Application Insights
- Azure Monitor Logs
- Kusto Query Language (KQL)
- API Management policies
- W3C Trace Context

## Sources Consulted
- Microsoft Learn: Monitor Azure API Management with Application Insights - https://learn.microsoft.com/en-us/azure/api-management/api-management-howto-app-insights
- Microsoft Learn: Azure API Management policy expressions - https://learn.microsoft.com/en-us/azure/api-management/api-management-policy-expressions
- Microsoft Learn: Azure API Management trace policy - https://learn.microsoft.com/en-us/azure/api-management/trace-policy
- Microsoft Learn: Azure API Management emit-metric policy - https://learn.microsoft.com/en-us/azure/api-management/emit-metric-policy
- Microsoft Learn: Azure API Management choose policy - https://learn.microsoft.com/en-us/azure/api-management/choose-policy
- Microsoft Learn: Application Insights telemetry data model - https://learn.microsoft.com/en-us/azure/azure-monitor/app/data-model-complete
- Microsoft Learn: Adaptive sampling in Application Insights - https://learn.microsoft.com/en-us/azure/azure-monitor/app/sampling-classic-api
- W3C Trace Context Recommendation - https://www.w3.org/TR/trace-context/

## Issues Found
- The post referred to a `diagnostic` policy. API Management has diagnostic settings and logger resources, but no `diagnostic` policy. Changed the wording to "diagnostic settings and the `trace` policy."
- Several XML policy attributes used double-quoted C# string literals inside double-quoted XML attributes, which would make the snippets invalid XML. Changed those attributes to use single quotes around the XML attribute values.
- The trace policy example used `context.Api.Version`, which is not part of the documented APIM policy expression API model. Replaced it with `context.Api.Id` and `context.Api.Name`.
- The automatic telemetry list implied that headers and metric telemetry are logged automatically. Updated it to say headers are logged when configured and that custom trace telemetry appears when the `trace` policy is configured.
- KQL examples that calculate counts and rates used `count()` and `countif()`, which undercount when Application Insights sampling is enabled. Changed count and rate examples to use `itemCount` with `sum()` and `sumif()`.
- The sampling section said APIM supports adaptive sampling configured in Application Insights. APIM gateway telemetry uses the APIM diagnostic sampling setting; adaptive sampling applies to Application Insights SDK telemetry in backend applications. Updated the section accordingly.
- The body logging example used `trace` in the `on-error` policy section, but the documented `trace` policy sections are `inbound`, `outbound`, and `backend`. Reworked the example to use `outbound` with a `choose` condition for failed HTTP responses.
- The `emit-metric` policy example used a nested `<value>` element, but the documented policy uses a `value` attribute. Updated the snippet to put the metric value on the `emit-metric` element and convert the `Content-Length` header to a number.
- The Application Insights connection wording mentioned only instrumentation keys. Added a note that automated deployments can use a connection string with managed identity, matching current Microsoft guidance.

## Review Notes
The post is technically useful and current after the fixes. For future improvements, the alert examples could be expanded with Azure Monitor alert rule configuration details such as threshold operator, evaluation aggregation, and action group setup, but the KQL itself is valid.
