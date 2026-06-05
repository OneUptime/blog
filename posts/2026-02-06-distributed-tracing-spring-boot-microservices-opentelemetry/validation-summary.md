# Validation Summary: How to Set Up Distributed Tracing Across Spring Boot Microservices

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- OpenTelemetry
- OpenTelemetry Java instrumentation
- OpenTelemetry Spring Boot starter
- Distributed tracing
- W3C Trace Context propagation
- Spring Boot
- Spring Framework RestClient
- Maven dependency management
- YAML configuration

## Sources Consulted
- OpenTelemetry Spring Boot starter getting started: https://opentelemetry.io/docs/zero-code/java/spring-boot-starter/getting-started/
- OpenTelemetry Spring Boot starter out-of-the-box instrumentation: https://opentelemetry.io/docs/zero-code/java/spring-boot-starter/out-of-the-box-instrumentation/
- OpenTelemetry Java SDK configuration: https://opentelemetry.io/docs/languages/java/configuration/
- OpenTelemetry Propagators API specification: https://opentelemetry.io/docs/specs/otel/context/api-propagators/
- OpenTelemetry Tracing API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- Spring Framework REST clients reference: https://docs.spring.io/spring-framework/reference/integration/rest-clients.html

## Issues Found
- The Maven BOM was shown as a regular dependency. Moved it to `dependencyManagement` and changed it to the current `opentelemetry-instrumentation-bom`, which the OpenTelemetry Spring Boot starter documentation requires for version alignment.
- The dependency examples used outdated `1.33.0-alpha` instrumentation artifacts and a separate `opentelemetry-spring-webmvc-6.0` dependency. Replaced them with the current starter dependency managed by the instrumentation BOM.
- The manual SDK configuration used deprecated semantic convention constants and duplicated work that the Spring Boot starter autoconfigures. Replaced it with supported `application.yml` properties for service name, OTLP export, propagators, and resource attributes.
- The configuration used nonstandard `otel.service.version` and `otel.deployment.environment` properties. Replaced them with standard resource attributes: `service.version` and `deployment.environment.name`.
- The RestClient example included unused OpenTelemetry imports and a custom interceptor that did not inject trace headers. Replaced it with a supported `RestClient` bean pattern that the OpenTelemetry starter instruments.
- The post implied database and external API spans are always automatic. Clarified that those spans require supported database instrumentation or instrumented downstream clients.
- The order controller claimed it always creates the root span. Clarified that it creates a server span, which is the root only when no upstream trace context exists.
- Added a version caveat that the `RestClient` example requires Spring Boot 3.2+ / Spring Framework 6.1+.

## Review Notes
The remaining domain classes such as `OrderRequest`, `PaymentResult`, and repository interfaces are illustrative and not defined in the post, so the snippets are reviewed for OpenTelemetry and Spring API correctness rather than as a complete compilable project.
