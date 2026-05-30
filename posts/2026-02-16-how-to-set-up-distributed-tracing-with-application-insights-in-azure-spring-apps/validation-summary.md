# Validation Summary: How to Set Up Distributed Tracing with Application Insights in Azure Spring Apps

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Spring Apps
- Azure Monitor Application Insights
- Azure CLI
- Application Insights Java agent
- Spring Boot
- OpenTelemetry Java API
- Micrometer
- Kusto Query Language (KQL)
- Azure Monitor metric alerts

## Sources Consulted
- Microsoft Learn: Use Application Insights Java In-Process Agent in Azure Spring Apps: https://learn.microsoft.com/en-us/azure/spring-apps/basic-standard/how-to-application-insights
- Microsoft Learn: Azure CLI `az spring app-insights`: https://learn.microsoft.com/en-us/cli/azure/spring/app-insights
- Microsoft Learn: Azure CLI `az monitor app-insights component`: https://learn.microsoft.com/en-us/cli/azure/monitor/app-insights/component
- Microsoft Learn: Create and configure Application Insights resources: https://learn.microsoft.com/en-us/azure/azure-monitor/app/create-workspace-resource
- Microsoft Learn: Configure Azure Monitor Application Insights for Java: https://learn.microsoft.com/en-us/azure/azure-monitor/app/java-standalone-config
- Microsoft Learn: Add and Modify OpenTelemetry in Application Insights: https://learn.microsoft.com/en-us/azure/azure-monitor/app/opentelemetry-add-modify
- Microsoft Learn: Configuring OpenTelemetry in Application Insights: https://learn.microsoft.com/en-us/azure/azure-monitor/app/opentelemetry-configuration
- Microsoft Learn: Supported metrics for `microsoft.insights/components`: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-insights-components-metrics
- Microsoft Learn: Azure Spring Apps retirement announcement: https://learn.microsoft.com/en-us/azure/architecture/reference-architectures/microservices/spring-apps-multi-region

## Issues Found
- The Application Insights resource creation command omitted a Log Analytics workspace even though current Application Insights resources are workspace-based. Added `--workspace my-log-analytics-workspace`.
- The Azure Spring Apps enablement step included an unrelated `az spring build-service update` command and used `--service` for `az spring app-insights update`. Removed the build-service command and changed the Application Insights update command to use `--name`.
- The post did not mention the current Azure Spring Apps retirement/deprecation context. Added a brief note with the March 17, 2025 retirement-period start and March 31, 2028 retirement date.
- The Spring Boot configuration used the old `applicationinsights-spring-boot-starter` 2.x dependency and unsupported `azure.application-insights` YAML settings for the current Java 3.x agent. Replaced it with the OpenTelemetry API dependency for custom spans and a valid `applicationinsights.json` Java agent configuration example.
- The logging pattern used `traceId` and `spanId` MDC names. Updated the example to `trace_id` and `span_id`, matching OpenTelemetry trace-context field naming.
- The custom span example created a span but did not make it current, so automatically collected child spans would not be attached as described. Updated it to use `GlobalOpenTelemetry`, `Scope`, and `span.makeCurrent()`.
- The Java examples referenced undeclared collaborators. Added missing `OrderRepository` and `OrderService` fields/constructor arguments.
- The KQL query labeled as a complete trace queried only `dependencies`. Changed it to union `requests`, `dependencies`, `exceptions`, and `traces`.
- The alert section was labeled as Smart Detection while the command created a metric alert. Renamed the section and wording to metric alerts.
- The sampling configuration used unsupported Spring YAML properties and called it adaptive sampling. Replaced it with a valid Java agent JSON fixed-percentage sampling example and neutral sampling wording.

## Review Notes
- The `az spring` CLI command group is deprecated because Azure Spring Apps is in its retirement period. The commands remain relevant for existing services, but future updates should consider migration guidance for Azure Container Apps, Azure Kubernetes Service, or other supported hosting options.
- The code snippets are still illustrative and omit imports for common Spring, Micrometer, and application-specific types.
