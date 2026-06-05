# Validation Summary: How to Compare OpenTelemetry vs Dynatrace for Enterprise Observability

## Status
validated

## Post Type
Technical comparison guide

## Technologies Covered
- OpenTelemetry
- OpenTelemetry Java agent
- OpenTelemetry Spring Boot starter
- OpenTelemetry Collector
- OTLP
- Dynatrace
- Dynatrace OneAgent
- Dynatrace ActiveGate
- Dynatrace Davis AI
- Dynatrace Platform Subscription
- Java
- Spring Boot
- Gradle
- Prometheus
- Fluent Bit / Fluent Forward

## Sources Consulted
- OpenTelemetry documentation: https://opentelemetry.io/docs/
- OpenTelemetry Spring Boot starter getting started: https://opentelemetry.io/docs/zero-code/java/spring-boot-starter/getting-started/
- OpenTelemetry Spring Boot starter SDK configuration: https://opentelemetry.io/docs/zero-code/java/spring-boot-starter/sdk-configuration/
- OpenTelemetry Java agent getting started: https://opentelemetry.io/docs/zero-code/java/agent/getting-started/
- OpenTelemetry Java SDK configuration: https://opentelemetry.io/docs/languages/java/configuration/
- OpenTelemetry Collector documentation: https://opentelemetry.io/docs/collector/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector components documentation: https://opentelemetry.io/docs/collector/components/
- Dynatrace OneAgent documentation: https://docs.dynatrace.com/docs/platform/oneagent/how-one-agent-works
- Dynatrace OneAgent deployment API documentation: https://docs.dynatrace.com/docs/discover-dynatrace/references/dynatrace-api/environment-api/deployment/oneagent/download-oneagent-latest
- Dynatrace ActiveGate documentation: https://docs.dynatrace.com/docs/ingest-from/dynatrace-activegate/capabilities
- Dynatrace OTLP ingest API documentation: https://docs.dynatrace.com/docs/ingest-from/opentelemetry/otlp-api
- Dynatrace pricing page: https://www.dynatrace.com/pricing/
- Dynatrace Platform Subscription cost overview: https://docs.dynatrace.com/docs/license/cost-overview

## Issues Found
- The OneAgent runtime-instrumentation description included implementation-specific examples such as V8 hooks that were not supported by the cited Dynatrace documentation. Changed the wording to the documented behavior: OneAgent injects itself into supported application runtimes such as Java, .NET, and Node.js.
- The OpenTelemetry Spring Boot dependency example used old explicit dependency versions and labeled a Gradle snippet as Java. Updated it to use the current OpenTelemetry instrumentation BOM and starter dependency pattern shown in the official OpenTelemetry Spring Boot starter documentation.
- The OpenTelemetry application and Java agent examples used port 4317 without explicitly setting gRPC. Current OpenTelemetry Java agent 2.x and Spring Boot starter default to OTLP HTTP/protobuf, so the endpoint was changed to port 4318 and the Collector example was updated to expose both OTLP gRPC on 4317 and OTLP HTTP on 4318.
- The Dynatrace OTLP export example omitted `OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf`. Dynatrace's OTLP ingest API does not support gRPC, so the protocol setting was added.
- The Dynatrace pricing section described the older host unit, DEM unit, and Davis Data Unit model as the primary current model. Updated it to describe Dynatrace Platform Subscription and revised the rough estimate using current public full-stack and log ingest pricing.

## Review Notes
The post remains a comparison guide rather than a runnable tutorial. The Collector configuration is representative and technically plausible, but production deployments would still need environment-specific Kubernetes scrape relabeling, authentication, TLS, and backend-specific exporter settings.
