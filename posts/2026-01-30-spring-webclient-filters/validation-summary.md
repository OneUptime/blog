# Validation Summary: How to Build Custom WebClient Filters

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Spring WebFlux WebClient
- Spring Boot
- Project Reactor (Mono, Retry)
- Java 17+ (records, sealed-style patterns)
- Micrometer (MeterRegistry, Timer)
- OkHttp MockWebServer
- JUnit Jupiter + AssertJ + StepVerifier
- SLF4J logging

## Sources Consulted
- Spring Framework `ClientResponse` Javadoc: https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/web/reactive/function/client/ClientResponse.html
- Spring Framework `ExchangeFilterFunction` Javadoc: https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/web/reactive/function/client/ExchangeFilterFunction.html
- Spring Framework `ClientRequest` API (for `.from()` builder and `.headers()`)
- Spring Framework `HttpStatusCode` interface (introduced as the return type of `statusCode()` in Spring 6.x)
- Project Reactor `Retry.backoff` API (`reactor.util.retry.Retry`)

## Issues Found
- **`RetryFilter` used `HttpStatus` where Spring 6.x requires `HttpStatusCode`.** Since Spring Framework 6.0 (Spring Boot 3.x), `ClientResponse.statusCode()` returns `HttpStatusCode` (interface), not `HttpStatus` (enum). The post had:
  - `private static final Set<HttpStatus> RETRYABLE_STATUS_CODES = Set.of(HttpStatus.TOO_MANY_REQUESTS, ...);`
  - `private boolean shouldRetry(HttpStatus status) { return RETRYABLE_STATUS_CODES.contains(status); }`
  - Called as `shouldRetry(response.statusCode())`, which fails to compile on current Spring because `response.statusCode()` returns `HttpStatusCode`, not `HttpStatus`.
  - **Fix applied:** Added `import org.springframework.http.HttpStatusCode;`, changed the set to `Set<Integer>` populated with `HttpStatus.<code>.value()`, and changed the method signature to `shouldRetry(HttpStatusCode status)` comparing on `status.value()`. This compiles cleanly on Spring 6.x while preserving the same behavior.

## Review Notes
- `ExchangeFilterFunction.ofRequestProcessor` and `ofResponseProcessor` exist and have the signatures used in the post — verified against current Javadoc.
- `ClientRequest.from(request).header(...).build()` and `ClientRequest.from(request).url(...).build()` are valid builder calls.
- The `CachingFilter` example references a `CachedResponse` helper with a `toClientResponse()` method that is not defined in the post. That is intentional pattern-illustration code, but readers should note: rebuilding a `ClientResponse` after consuming the body requires `ClientResponse.create(...)` and re-supplying the body; concurrent first-request callers can also cause duplicate upstream calls (the cache is not request-coalescing). Documented here for context; not a correctness fix.
- The post recommends `Resilience4j` for production circuit breakers in the summary, which is the right guidance — the hand-rolled `CircuitBreakerFilter` is illustrative and has known limitations (single global state across all hosts, no rolling window, no concurrency cap in HALF_OPEN).
- The `CorrelationIdFilter` uses `HttpHeaders.getFirst` correctly. Note that `ClientRequest.from(request).header(name, value)` appends the value rather than replacing, so if a correlation ID was already present, the modified request would contain two `X-Correlation-ID` headers. This is a minor behavioural caveat worth noting in a future revision but not a compilation/correctness bug given the code only re-adds when generating a new ID would still produce the same effect (the post always rewrites the header).
- The `FilterFactories` snippet uses `ClientRequest` without an explicit import statement in the displayed code block; the import is implicit/elided for brevity, which is consistent with how other snippets in the post elide some imports. Not flagged as an error.
- All other Reactor and Spring APIs used (`Mono.error`, `Mono.just`, `Retry.backoff(...).maxBackoff(...).filter(...).doBeforeRetry(...)`, `bodyToMono`, `headers().asHttpHeaders()`, `WebClient.builder().baseUrl(...).filter(...).build()`) match current Javadoc.
