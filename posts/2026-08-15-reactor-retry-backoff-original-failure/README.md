# Propagate the Original Failure from Reactor `Retry.backoff`

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Project Reactor, Java, Retry, Backoff, Error Handling, Spring WebFlux

Description: Configure Reactor retry exhaustion to propagate the last underlying failure instead of Reactor's retry-exhausted wrapper.

---

Project Reactor normally turns an exhausted retry policy into a retry-exhausted runtime exception. The final failure is attached as its cause, which preserves information but changes the exception observed downstream.

When callers already handle the domain or transport exception, customize the exhausted error with `onRetryExhaustedThrow`.

## The Default Exhaustion Behavior

`Retry.backoff(maxAttempts, minBackoff)` creates a `RetryBackoffSpec`. Here, `maxAttempts` is the number of retry attempts, not the total number of subscriptions. A value of `3` permits the original subscription plus up to three retries.

```java
Mono<Order> order = orderClient.fetch(orderId)
    .retryWhen(Retry.backoff(3, Duration.ofMillis(200)));
```

If all attempts fail, Reactor emits its retry-exhausted exception. Code can identify that wrapper with `Exceptions.isRetryExhausted(error)`, and its cause is the last attempt's failure.

That default is useful when the fact of exhaustion is part of the error contract. It can be inconvenient when an existing exception handler expects `WebClientResponseException`, `TimeoutException`, or a domain exception directly.

## Return the Last `RetrySignal.failure()`

Customize only the exhaustion branch:

```java
import java.time.Duration;
import java.util.concurrent.TimeoutException;
import reactor.core.publisher.Mono;
import reactor.util.retry.Retry;

Retry retryPolicy = Retry.backoff(3, Duration.ofMillis(200))
    .maxBackoff(Duration.ofSeconds(5))
    .jitter(0.5)
    .filter(error ->
        error instanceof TimeoutException ||
        error instanceof RetryableServiceException)
    .doBeforeRetry(signal -> metrics.recordRetry(
        signal.totalRetries() + 1,
        signal.failure()))
    .onRetryExhaustedThrow((spec, signal) -> signal.failure());

Mono<Order> order = Mono.defer(() -> orderClient.fetch(orderId))
    .retryWhen(retryPolicy);
```

After the retry budget is consumed, the exact last `Throwable` is sent downstream. `Mono.defer` is important when `fetch` performs work while constructing the publisher; it ensures each resubscription starts a fresh attempt.

## Preserve Exhaustion Context Deliberately

Returning the original failure means its type and message remain stable, but the wrapper no longer carries Reactor's exhaustion message. Keep attempt information in structured telemetry before retrying:

```java
.doBeforeRetry(signal -> log.warn(
    "order fetch will retry; retryIndex={}, consecutiveIndex={}, type={}",
    signal.totalRetries(),
    signal.totalRetriesInARow(),
    signal.failure().getClass().getSimpleName()))
```

If downstream code needs both a typed domain error and explicit exhaustion metadata, create a domain exception and chain the last failure:

```java
.onRetryExhaustedThrow((spec, signal) ->
    new OrderServiceUnavailableException(
        "Order lookup failed after " + (signal.totalRetries() + 1) + " attempts",
        signal.failure()))
```

That is intentionally different from propagating the original failure. Choose one public error contract and test it.

## Do Not Rewrite Non-Retryable Failures

`onRetryExhaustedThrow` runs only when the retry strategy exhausts its allowed attempts. An error rejected by `filter` passes downstream directly. Keep the predicate narrow so authentication failures, validation failures, and other permanent conditions are not delayed.

Use `Exceptions.isRetryExhausted` only when retaining Reactor's default wrapper:

```java
.onErrorMap(error ->
    Exceptions.isRetryExhausted(error) && error.getCause() != null
        ? error.getCause()
        : error)
```

Configuring `onRetryExhaustedThrow` on the policy is clearer because it expresses the behavior at the point where the wrapper would be created.

## Long-Lived Fluxes Need a Separate Decision

For a long-lived `Flux`, `transientErrors(true)` makes the retry limit use `totalRetriesInARow()` so an `onNext` signal separates bursts of failures. This is not automatically equivalent to a completed successful operation. If one item followed by immediate failure is not healthy enough to reset the budget, model the health boundary explicitly instead.

Also remember that Reactor retry operators resubscribe to the upstream publisher. Retrying a stateful or mutating operation is safe only when a new subscription recreates valid state and the operation is idempotent or protected by an idempotency key.

## Official Documentation

- [Reactor `RetryBackoffSpec` API](https://projectreactor.io/docs/core/release/api/reactor/util/retry/RetryBackoffSpec.html)
- [Reactor retry reference guide](https://projectreactor.io/docs/core/release/reference/coreFeatures/error-handling.html#retrying)
- [Reactor FAQ: retry exhaustion](https://projectreactor.io/docs/core/release/reference/faq.html#faq.retryWhen)
- [Reactor `Exceptions` API](https://projectreactor.io/docs/core/release/api/reactor/core/Exceptions.html)

## Conclusion

Use `onRetryExhaustedThrow((spec, signal) -> signal.failure())` when downstream code must receive the last underlying error directly. Keep exhaustion counts in telemetry, filter retryable failures narrowly, and retain the default wrapper when exhaustion itself belongs in the error contract.
