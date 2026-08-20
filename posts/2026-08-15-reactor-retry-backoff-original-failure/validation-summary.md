# Validation Summary: Propagate the Original Failure from Reactor `Retry.backoff`

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Project Reactor Core (`Mono`, `Flux`, `Retry`, `RetryBackoffSpec`, and `Exceptions`)
- Java (`Duration` and `TimeoutException`)
- Reactive retry, exponential backoff, jitter, and error propagation
- Spring WebFlux (`WebClientResponseException`)
- Idempotent retry handling and observability

## Sources Consulted

- [Reactor `RetryBackoffSpec` API](https://projectreactor.io/docs/core/release/api/reactor/util/retry/RetryBackoffSpec.html)
- [Reactor `Retry` API](https://projectreactor.io/docs/core/release/api/reactor/util/retry/Retry.html)
- [Reactor `Retry.RetrySignal` API](https://projectreactor.io/docs/core/release/api/reactor/util/retry/Retry.RetrySignal.html)
- [Reactor `Exceptions` API](https://projectreactor.io/docs/core/release/api/reactor/core/Exceptions.html)
- [Reactor `Mono` API](https://projectreactor.io/docs/core/release/api/reactor/core/publisher/Mono.html)
- [Reactor error-handling and retry reference](https://projectreactor.io/docs/core/release/reference/coreFeatures/error-handling.html#retrying)
- [Reactor FAQ: exponential backoff](https://projectreactor.io/docs/core/release/reference/faq.html#faq.exponentialBackoff)
- [Reactor Core 3.8.6 `RetryBackoffSpec` source](https://github.com/reactor/reactor-core/blob/v3.8.6/reactor-core/src/main/java/reactor/util/retry/RetryBackoffSpec.java)
- [Spring Framework `WebClientResponseException` API](https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/web/reactive/function/client/WebClientResponseException.html)
- [Java SE 17 `TimeoutException` API](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/TimeoutException.html)

## Issues Found

No technical issues found.

## Review Notes

The examples and explanations were checked against Reactor Core 3.8.6, the current release served by Reactor's `release` documentation URLs on the validation date. All Reactor APIs used in the post are current and non-deprecated. The retry counts are correct: `Retry.backoff(3, ...)` allows the initial subscription plus three retries; `totalRetries()` is zero-based; and `signal.totalRetries() + 1` correctly yields four total source attempts in the exhaustion callback. Runtime verification also confirmed that the custom exhaustion generator emits the identical final `Throwable`, while the default policy emits a retry-exhausted exception whose cause is that final failure. Filter-rejected errors bypass the exhaustion generator, and `transientErrors(true)` uses the counter reset by an upstream `onNext`. The linked documentation URLs and anchors resolve correctly. No changes to `README.md` were necessary.
