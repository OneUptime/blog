# Validation Summary: How to Build Reactive Applications with Spring WebFlux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Java
- Spring Boot
- Spring WebFlux
- Project Reactor (Mono / Flux)
- R2DBC (Reactive Relational Database Connectivity)
- PostgreSQL R2DBC driver
- Spring Data R2DBC (ReactiveCrudRepository)
- WebClient
- StepVerifier (reactor-test)
- OkHttp MockWebServer
- Netty (mentioned as the default WebFlux server)
- Schedulers.boundedElastic

## Sources Consulted
- Spring WebFlux reference documentation: https://docs.spring.io/spring-framework/reference/web/webflux.html
- Spring Boot reference (WebFlux starter): https://docs.spring.io/spring-boot/reference/web/reactive.html
- Project Reactor reference: https://projectreactor.io/docs/core/release/reference/
- Reactor Core Javadoc for Mono / Flux operators (map, flatMap, onErrorResume, onErrorReturn, doOnError, zip, subscribeOn, fromCallable)
- Spring Data R2DBC reference: https://docs.spring.io/spring-data/relational/reference/r2dbc.html
- R2DBC PostgreSQL driver (Maven Central): https://central.sonatype.com/artifact/org.postgresql/r2dbc-postgresql
- Spring WebFlux WebClient documentation: https://docs.spring.io/spring-framework/reference/web/webflux-webclient.html
- HttpStatusCode API (Spring 6+): https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/http/HttpStatusCode.html
- reactor-test StepVerifier docs: https://projectreactor.io/docs/test/release/api/reactor/test/StepVerifier.html
- OkHttp MockWebServer: https://github.com/square/okhttp/tree/master/mockwebserver

## Issues Found
- **Outdated PostgreSQL R2DBC driver coordinates.** The post listed the driver as `io.r2dbc:r2dbc-postgresql`. That group ID is no longer current — the project was donated to the PostgreSQL community and modern releases (1.0.x and later, which are what Spring Boot 3.x's BOM manages) live at `org.postgresql:r2dbc-postgresql`. Updated the Maven dependency snippet to use `org.postgresql` as the group ID. All other coordinates (`spring-boot-starter-webflux`, `spring-boot-starter-data-r2dbc`, `reactor-test`) remain correct.

## Review Notes
- The conceptual explanations (thread-per-request vs. event loop, Mono vs. Flux semantics, lazy evaluation, backpressure, blocking-call hazards) are accurate and align with the Project Reactor and Spring WebFlux documentation.
- `WebClient` usage is current: `retrieve()`, `bodyValue()`, `bodyToMono`, `bodyToFlux`, and `onStatus(HttpStatusCode::is4xxClientError, ...)` are the recommended Spring 6 / Spring Boot 3.x APIs.
- The Spring Data R2DBC repository example correctly uses `@Table`, `@Id`, `ReactiveCrudRepository`, `@Query` with native SQL, and `@Param` — and the statement that R2DBC does not support JPQL is accurate.
- `@ControllerAdvice` with `@ExceptionHandler` returning `Mono<ErrorResponse>` is supported in WebFlux; the example is valid.
- `StepVerifier` usage (`expectNextCount`, `expectNextMatches`, `assertNext`, `verifyComplete`) reflects the current reactor-test API.
- `Mono.fromCallable(...).subscribeOn(Schedulers.boundedElastic())` is the canonical pattern for wrapping blocking work, per the Project Reactor docs.
- Minor stylistic note (not a technical error): the comment on `bodyToFlux` says "returning multiple items as a stream" — by default this deserializes a JSON array rather than streaming NDJSON / SSE; true streaming requires a streaming media type (e.g., `application/x-ndjson` or `text/event-stream`). The code itself is correct.
