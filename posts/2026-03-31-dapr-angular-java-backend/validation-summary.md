# Validation Summary: How to Use Dapr with Angular Frontend and Java Backend

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (sidecar pattern, service invocation, state management, pub/sub)
- Angular (HttpClient, services, components)
- Java / Spring Boot (REST controllers, reactive types)
- Dapr Java SDK (`dapr-sdk`, `dapr-sdk-springboot`) v1.10.0
- Dapr CLI

## Sources Consulted
- Dapr Java SDK GitHub repository (v1.10.0 tag) — https://github.com/dapr/java-sdk
- Dapr Java SDK DaprClient Javadoc — https://dapr.github.io/java-sdk/io/dapr/client/DaprClient.html
- Dapr Java SDK properties documentation — https://docs.dapr.io/developing-applications/sdks/java/java-client/properties/
- Dapr service invocation API reference — https://docs.dapr.io/reference/api/service_invocation_api/
- Dapr CLI `dapr run` reference — https://docs.dapr.io/reference/cli/dapr-run/
- Dapr Spring Boot SDK docs — https://docs.dapr.io/developing-applications/sdks/java/spring-boot/
- Maven Central for artifact verification (io.dapr:dapr-sdk:1.10.0, io.dapr:dapr-sdk-springboot:1.10.0)
- Angular HttpClient API — https://angular.dev/api/common/http/HttpClient
- Angular CLI ng generate service — https://angular.dev/cli/generate/service
- Angular CLI ng serve — https://angular.dev/cli/serve
- Angular NgFor API (deprecated) — https://angular.dev/api/common/NgFor
- RxJS Observable — https://rxjs.dev/api/index/class/Observable

## Issues Found

### 1. Missing DaprClient bean configuration (runtime error)
**What was wrong:** The controller used `@Autowired private DaprClient daprClient;` but `dapr-sdk-springboot:1.10.0` does NOT auto-configure a `DaprClient` bean. The `DaprAutoConfiguration` class in this version only performs a `@ComponentScan` for Dapr's internal Spring components (like `DaprBeanPostProcessor` for `@Topic` annotations) — it does not register a `DaprClient` bean. This would cause a `NoSuchBeanDefinitionException` at startup.

**What was changed:** Added a `DaprConfig` configuration class with a `@Bean` method that creates a `DaprClient` using `DaprClientBuilder().build()`, placed before the controller code.

**Why:** Without this bean definition, the application would fail to start. The newer `dapr-spring-boot-starter` (v1.13+) does provide auto-configuration, but for the v1.10.0 SDK used in this post, manual bean registration is required.

### 2. Incorrect Dapr HTTP client timeout property name
**What was wrong:** The `application.properties` file used `dapr.http.client.readTimeoutMilliseconds=5000`. The correct property name is `dapr.http.client.readTimeoutSeconds` (seconds, not milliseconds), as documented in the official Dapr Java SDK properties reference.

**What was changed:** Changed `dapr.http.client.readTimeoutMilliseconds=5000` to `dapr.http.client.readTimeoutSeconds=5`.

**Why:** The incorrect property name would be silently ignored, meaning the timeout configuration would have no effect. The value was also adjusted from 5000 (milliseconds) to 5 (seconds) to reflect the correct unit.

## Review Notes
- The Angular component uses `*ngFor`, which is deprecated as of Angular v17 (late 2023) in favor of the `@for` block syntax. While `*ngFor` still functions, it may be removed in a future Angular version (potentially v22). The code is correct as-is but could be modernized.
- The `DaprClient.getState()` call uses raw `List.class` as the type parameter, which loses generic type information. At runtime, list items will be deserialized as `LinkedHashMap` objects rather than `InventoryItem` instances. This is a common Java generics limitation with serialization and works for demonstration purposes, but production code would need a custom type reference or manual mapping.
- The architecture pattern shown (Angular browser app calling `localhost:3500`) works for local development but would need an API gateway or reverse proxy in production, since a browser-based frontend cannot access the Dapr sidecar directly in a deployed environment.
- The Dapr CLI command, service invocation URL format, Angular HttpClient usage, and Spring Boot controller patterns are all correct.
