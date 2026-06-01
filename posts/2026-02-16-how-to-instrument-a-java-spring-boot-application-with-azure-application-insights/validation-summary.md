# Validation Summary: How to Instrument a Java Spring Boot Application with Azure Application Insights

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Application Insights
- Azure Monitor
- Application Insights Java 3.x agent
- Java
- Spring Boot
- Spring MVC and WebFlux
- Micrometer
- Logback
- Azure App Service
- Azure CLI
- Docker

## Sources Consulted
- Azure Monitor Application Insights Java configuration: https://learn.microsoft.com/en-us/azure/azure-monitor/app/java-standalone-config
- Azure App Service monitoring with Application Insights Java agent: https://learn.microsoft.com/en-us/azure/app-service/monitor-app-service
- Azure App Service Java APM configuration: https://learn.microsoft.com/en-us/azure/app-service/configure-language-java-apm
- Azure CLI `az webapp config appsettings set`: https://learn.microsoft.com/en-us/cli/azure/webapp/config/appsettings
- Azure Monitor OpenTelemetry custom telemetry guidance: https://learn.microsoft.com/en-us/azure/azure-monitor/app/opentelemetry-add-modify
- Application Insights Java releases: https://github.com/microsoft/ApplicationInsights-Java/releases
- OpenTelemetry Java Logback MDC instrumentation: https://github.com/open-telemetry/opentelemetry-java-instrumentation/blob/main/instrumentation/logback/logback-mdc-1.0/library/README.md
- Spring Framework `ResponseEntity` reference: https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller/ann-methods/responseentity.html

## Issues Found
- The post described the 3.4.0 Java agent as the latest version. Updated the download, `-javaagent`, Docker copy, and custom telemetry SDK examples to 3.7.8, the current GitHub release found during review.
- The sampling override examples used the older `preview.sampling.overrides` shape and non-current attributes such as `http.url` with `contains`. Updated them to the current GA `sampling.overrides` shape with `telemetryType`, `url.path`, and `strict` matching.
- The production sampling example claimed it could capture 100% of 5xx errors using `http.statusCode`. Application Insights Java sampling overrides are evaluated when spans start, and response status is not available at that point. Replaced this with a valid example that captures 100% of `/api/payments` request traces.
- The App Service example manually set `JAVA_OPTS` for an uploaded agent JAR. Updated it to the documented App Service-managed Java agent settings using `APPLICATIONINSIGHTS_CONNECTION_STRING` and `ApplicationInsightsAgent_EXTENSION_VERSION`.
- The auto-collected request description included request body size, which is not a reliable default claim in the official Application Insights Java documentation. Adjusted it to method, route or URL, response code, and duration.
- The Spring-specific instrumentation claim implied controller method spans are always captured. Updated it to say Spring MVC/WebFlux requests are captured automatically and controller method spans require `preview.captureControllerSpans`.
- The Logback MDC example used `ai-operation-id`, which is not the OpenTelemetry MDC key used by the Java agent instrumentation. Updated the pattern to use `trace_id` and `span_id`.
- The Micrometer controller sample referenced `paymentService` without defining it. Added constructor injection for `PaymentService` so the snippet is internally coherent.

## Review Notes
- The custom telemetry section uses the Application Insights classic SDK API, which the Application Insights Java 3.x agent can detect and correlate. For newer applications, OpenTelemetry APIs are also an option.
- Micrometer metric names containing dots are ingested with nonalphanumeric characters replaced by underscores in Application Insights.
