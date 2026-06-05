# Validation Summary: How to Instrument Spring WebFlux Reactive Applications with OpenTelemetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Java
- OpenTelemetry Java agent
- OpenTelemetry Spring Boot starter
- Spring WebFlux
- Spring WebClient
- Project Reactor
- Micrometer Context Propagation
- Spring Data R2DBC
- JUnit 5 OpenTelemetry testing utilities

## Sources Consulted
- OpenTelemetry Java Spring Boot starter documentation: https://opentelemetry.io/docs/zero-code/java/spring-boot-starter/
- OpenTelemetry Java Spring Boot starter getting started guide: https://opentelemetry.io/docs/zero-code/java/spring-boot-starter/getting-started/
- OpenTelemetry Java agent supported libraries: https://opentelemetry.io/docs/zero-code/java/agent/supported-libraries/
- OpenTelemetry Java API documentation: https://opentelemetry.io/docs/languages/java/api/
- OpenTelemetry Java SDK testing documentation: https://opentelemetry.io/docs/languages/java/sdk/
- Reactor context propagation reference: https://docs.spring.io/projectreactor/reactor-core/docs/current-SNAPSHOT/reference/html/advanced-contextPropagation.html
- Micrometer Context Propagation reference: https://docs.micrometer.io/context-propagation/reference/purpose.html
- Spring Framework WebClient reference: https://docs.spring.io/spring-framework/reference/web/webflux-webclient.html
- Spring WebFlux `@RequestBody` reference: https://docs.spring.io/spring-framework/reference/web/webflux/controller/ann-methods/requestbody.html
- Spring Data R2DBC `R2dbcEntityTemplate` API: https://docs.spring.io/spring-data/r2dbc/docs/current/api/org/springframework/data/r2dbc/core/R2dbcEntityTemplate.html
- Spring Data R2DBC reference documentation: https://docs.spring.io/spring-data/r2dbc/docs/current-SNAPSHOT/reference/html/

## Issues Found
- The dependency snippet mixed Java agent wording with an application dependency on `opentelemetry-spring-webflux-5.3` version `1.33.0-alpha`. Replaced it with the supported OpenTelemetry Spring Boot starter setup and the current OpenTelemetry instrumentation BOM version from the official docs.
- The `spring-boot-starter-webflux` dependency appeared twice. Removed the duplicate and added `opentelemetry-sdk-testing` for the test example.
- The post implied every incoming request creates a root span. Changed this to server span, because an incoming request can have a remote parent.
- The service example referenced `productService.search(query)` without showing a matching service/repository path. Added a `search` service method and a corresponding R2DBC repository search method.
- The `validate_product` span was intended to be part of the create-with-pricing operation but did not explicitly parent itself to the enclosing custom span. Added explicit parent context passing for that span.
- Repository custom spans were started without explicitly setting their parent context. Added `setParent(Context.current())` for consistency with OpenTelemetry's current-context API.
- The test used `io.opentelemetry.semconv.SemanticAttributes.HTTP_ROUTE`, which is version-sensitive and has moved across semantic convention artifacts. Replaced it with `AttributeKey.stringKey("http.route")`.
- Removed unused imports from the test snippet.

## Review Notes
The examples remain illustrative and omit domain classes such as `Product`, `PriceData`, and custom exceptions. The OpenTelemetry Java agent remains the default recommended path for broad Spring Boot auto-instrumentation, while the starter-based dependency setup shown in the post is appropriate when the application wants Spring Boot starter configuration and injectable OpenTelemetry beans.
