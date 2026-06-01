# Validation Summary: How to Enable Distributed Tracing with Application Insights in Azure Spring Apps

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Azure Spring Apps
- Azure Application Insights / Azure Monitor
- Application Insights Java agent 3.x
- OpenTelemetry for Java
- Spring Boot
- Azure CLI
- Kusto Query Language (KQL)

## Sources Consulted
- Microsoft Learn: How to use Application Insights Java in-process agent in Azure Spring Apps - https://learn.microsoft.com/en-us/azure/spring-apps/basic-standard/how-to-application-insights
- Microsoft Learn: Azure CLI `az spring app-insights` reference - https://learn.microsoft.com/en-us/cli/azure/spring/app-insights
- Microsoft Learn: Azure CLI `az spring apm` reference - https://learn.microsoft.com/en-us/cli/azure/spring/apm
- Microsoft Learn: Azure CLI `az monitor app-insights component` reference - https://learn.microsoft.com/en-us/cli/azure/monitor/app-insights/component
- Microsoft Learn: Configure Azure Monitor Application Insights for Java - https://learn.microsoft.com/en-us/azure/azure-monitor/app/java-standalone-config
- Microsoft Learn: Add and modify Azure Monitor OpenTelemetry - https://learn.microsoft.com/en-us/azure/azure-monitor/app/opentelemetry-add-modify
- Microsoft Learn: Azure Monitor OpenTelemetry data collection and resource detectors - https://learn.microsoft.com/en-us/azure/azure-monitor/app/opentelemetry-collect-detect
- Microsoft Learn: Supported metrics for `microsoft.insights/components` - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-insights-components-metrics
- Microsoft Learn: Azure Spring Apps retirement announcement - https://learn.microsoft.com/en-us/azure/spring-apps/basic-standard/retirement-announcement
- W3C Trace Context specification - https://www.w3.org/TR/trace-context/

## Issues Found
- The post used `az spring apm update` for service-level Application Insights enablement. That command group is for Enterprise APM resources, while the documented Azure Spring Apps Application Insights service command is `az spring app-insights update`. Updated the command to use `--app-insights-key` and `--sampling-rate`.
- The post described setting `APPLICATIONINSIGHTS_CONNECTION_STRING` with `az spring app update` as enabling Application Insights per app. That only supplies configuration to an app or self-attached agent; it does not enable Azure Spring Apps service-level Java agent injection. Updated the wording and command comment.
- The Maven dependencies and `application.yml` configuration used older Application Insights Spring Boot starter style configuration. Updated the guidance to use the Application Insights Java 3.x agent with OpenTelemetry API and annotations for custom spans.
- The logging pattern used `%X{ai-operation-id}`, which is not the current OpenTelemetry MDC key pattern. Updated the example to use `trace_id` and `span_id`.
- The custom tracing example used the classic `TelemetryClient.trackDependency` pattern and passed a millisecond `long` where the Java API expects a duration type in older SDKs. Replaced the example with `@WithSpan`, `Span.current().setAttribute(...)`, and `recordException(...)`.
- The sampling override JSON put overrides under `preview.sampling` and used `http.url`; current Java agent sampling overrides are configured under `sampling.overrides` and commonly match OpenTelemetry attributes such as `url.path`. Updated the JSON and explanation.
- The article stated "adaptive sampling" for Java agent volume control. Updated this to "rate-limited sampling" with `requestsPerSecond`, which matches current Application Insights Java agent documentation.
- The article referenced "same instrumentation key" for correlation. Updated this to "same connection string" because connection strings are the preferred current configuration.
- Added a note that Azure Spring Apps plans entered retirement and are supported until March 31, 2028.

## Review Notes
- Azure Spring Apps and the `az spring` CLI command group are deprecated/retired-path technologies, but still supported for existing workloads until March 31, 2028. The post remains technically relevant for existing Azure Spring Apps users.
- The `az spring app-insights` CLI command group is itself marked deprecated because the broader `az spring` group is deprecated, but it remains the documented command for this service.
- The post's KQL examples, Application Map / Transaction Search guidance, Application Insights resource creation command, W3C trace context explanation, and `requests/duration` metric alert are consistent with official documentation.
