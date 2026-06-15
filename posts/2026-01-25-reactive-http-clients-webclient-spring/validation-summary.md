# Validation Summary: How to Build Reactive HTTP Clients with WebClient in Spring

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Java
- Spring Framework WebFlux
- Spring WebClient
- Spring Boot WebFlux starter
- Project Reactor Mono, Flux, and Retry
- Reactor Netty HttpClient
- OkHttp MockWebServer
- JUnit 5

## Sources Consulted
- Spring Framework WebClient reference: https://docs.spring.io/spring-framework/reference/web/webflux-webclient.html
- Spring Framework `retrieve()` reference: https://docs.spring.io/spring-framework/reference/web/webflux-webclient/client-retrieve.html
- Spring Framework `WebClient.ResponseSpec` Javadoc: https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/web/reactive/function/client/WebClient.ResponseSpec.html
- Spring Framework `WebClient.Builder` Javadoc: https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/web/reactive/function/client/WebClient.Builder.html
- Spring Framework `HttpStatusCode` Javadoc: https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/http/HttpStatusCode.html
- Spring Framework `ExchangeFilterFunction` Javadoc: https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/web/reactive/function/client/ExchangeFilterFunction.html
- Spring Framework `ClientResponse` Javadoc: https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/web/reactive/function/client/ClientResponse.html
- Spring Boot reactive web applications reference: https://docs.spring.io/spring-boot/reference/web/reactive.html
- Reactor Netty HTTP client reference: https://projectreactor.io/docs/netty/release/reference/http-client.html
- Project Reactor `RetryBackoffSpec` Javadoc: https://projectreactor.io/docs/core/release/api/reactor/util/retry/RetryBackoffSpec.html
- OkHttp MockWebServer `MockResponse` Javadoc: https://square.github.io/okhttp/3.x/mockwebserver/okhttp3/mockwebserver/MockResponse.html

## Issues Found
- The basic `WebClient` configuration used `.defaultHeader("X-API-Key", "${USER_SERVICE_API_KEY}")`, which would send the literal placeholder string because `WebClient.Builder` does not resolve property placeholders in arbitrary string arguments. Changed it to `System.getenv("USER_SERVICE_API_KEY")` so the sample reads an environment variable at runtime.
- The error-handling examples used `HttpStatus::isError` as an `onStatus` predicate. Current Spring WebClient expects a predicate over `HttpStatusCode`, so the method reference is not type-correct. Changed these examples to import and use `HttpStatusCode::isError`.
- The 404 predicate compared a `HttpStatusCode` value with `HttpStatus.NOT_FOUND` using reference equality. Changed it to `status.isSameCodeAs(HttpStatus.NOT_FOUND)`, which is the Spring-provided comparison API for `HttpStatusCode`.
- The structured error-handling snippet used `ResourceNotFoundException` without importing it. Added the missing custom exception import.
- The MockWebServer test snippet expected `ResourceNotFoundException` without importing it. Added the missing custom exception import.

## Review Notes
The remaining examples are technically consistent with current Spring WebClient, Reactor, Reactor Netty, and MockWebServer APIs. The article does not pin Spring Boot, Spring Framework, Reactor, or OkHttp versions; future updates could make version assumptions explicit, especially for OkHttp MockWebServer 5.x package/API differences and Spring Framework 6.1+ availability of `ClientResponse.request()`.
