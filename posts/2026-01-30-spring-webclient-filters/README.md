# How to Build Custom WebClient Filters

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Java, Spring Boot, WebClient, Reactive

Description: Implement custom WebClient filters for logging, authentication, retry logic, and request/response modification in reactive Spring applications.

---

Spring WebClient is the reactive, non-blocking HTTP client introduced in Spring 5. One of its most powerful features is the filter mechanism, which allows you to intercept and modify requests and responses in a clean, reusable way. In this post, we will build several practical filters that you can use in production applications.

## Understanding ExchangeFilterFunction

The `ExchangeFilterFunction` interface is the foundation of WebClient filtering. It intercepts the request-response exchange and allows you to modify either side of the communication.

Here is the interface definition:

```java
@FunctionalInterface
public interface ExchangeFilterFunction {
    Mono<ClientResponse> filter(ClientRequest request, ExchangeFunction next);
}
```

The interface takes two parameters:
- `ClientRequest request` - the outgoing request that you can inspect or modify
- `ExchangeFunction next` - the next filter in the chain, or the actual HTTP call if this is the last filter

## Filter Execution Order

Before diving into implementations, let's understand how filters are ordered. Filters execute in the order they are added to the WebClient, and the response flows back in reverse order.

| Phase | Direction | Order |
|-------|-----------|-------|
| Request | Outbound | First added → Last added |
| Response | Inbound | Last added → First added |

This means if you add filters A, B, and C in that order:
- Request flows: A → B → C → Server
- Response flows: Server → C → B → A

## Basic WebClient Setup with Filters

Let's start with a basic WebClient configuration that uses multiple filters:

```java
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
public class WebClientConfig {

    @Bean
    public WebClient webClient(
            LoggingFilter loggingFilter,
            AuthenticationFilter authFilter,
            RetryFilter retryFilter) {

        return WebClient.builder()
                .baseUrl("https://api.example.com")
                // Filters are applied in this order for requests
                .filter(loggingFilter)
                .filter(authFilter)
                .filter(retryFilter)
                .build();
    }
}
```

## Building a Request Logging Filter

A logging filter helps with debugging and monitoring. This filter logs request details before sending and response details after receiving.

```java
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.ClientRequest;
import org.springframework.web.reactive.function.client.ClientResponse;
import org.springframework.web.reactive.function.client.ExchangeFilterFunction;
import org.springframework.web.reactive.function.client.ExchangeFunction;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.time.Instant;

@Component
public class LoggingFilter implements ExchangeFilterFunction {

    private static final Logger log = LoggerFactory.getLogger(LoggingFilter.class);

    @Override
    public Mono<ClientResponse> filter(ClientRequest request, ExchangeFunction next) {
        // Capture the start time for duration calculation
        Instant startTime = Instant.now();

        // Log request details
        log.info("Request: {} {}", request.method(), request.url());
        request.headers().forEach((name, values) ->
            log.debug("Request Header: {} = {}", name, values)
        );

        return next.exchange(request)
                .doOnSuccess(response -> {
                    // Calculate request duration
                    Duration duration = Duration.between(startTime, Instant.now());

                    // Log response details
                    log.info("Response: {} {} - Status: {} - Duration: {}ms",
                            request.method(),
                            request.url(),
                            response.statusCode(),
                            duration.toMillis());
                })
                .doOnError(error -> {
                    Duration duration = Duration.between(startTime, Instant.now());
                    log.error("Request failed: {} {} - Error: {} - Duration: {}ms",
                            request.method(),
                            request.url(),
                            error.getMessage(),
                            duration.toMillis());
                });
    }
}
```

## Building an Authentication Token Filter

This filter automatically injects authentication tokens into every request. It supports token refresh when the current token expires.

```java
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.ClientRequest;
import org.springframework.web.reactive.function.client.ClientResponse;
import org.springframework.web.reactive.function.client.ExchangeFilterFunction;
import org.springframework.web.reactive.function.client.ExchangeFunction;
import reactor.core.publisher.Mono;

@Component
public class AuthenticationFilter implements ExchangeFilterFunction {

    private final TokenService tokenService;

    public AuthenticationFilter(TokenService tokenService) {
        this.tokenService = tokenService;
    }

    @Override
    public Mono<ClientResponse> filter(ClientRequest request, ExchangeFunction next) {
        // Get token reactively, this could involve a cache lookup or token refresh
        return tokenService.getValidToken()
                .flatMap(token -> {
                    // Create a new request with the Authorization header
                    ClientRequest authenticatedRequest = ClientRequest.from(request)
                            .header("Authorization", "Bearer " + token)
                            .build();

                    return next.exchange(authenticatedRequest);
                });
    }
}
```

Here is a simple TokenService implementation:

```java
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.time.Instant;
import java.util.concurrent.atomic.AtomicReference;

@Service
public class TokenService {

    private final AtomicReference<CachedToken> cachedToken = new AtomicReference<>();
    private final AuthClient authClient;

    public TokenService(AuthClient authClient) {
        this.authClient = authClient;
    }

    public Mono<String> getValidToken() {
        CachedToken current = cachedToken.get();

        // Check if we have a valid cached token
        if (current != null && !current.isExpired()) {
            return Mono.just(current.token());
        }

        // Fetch a new token
        return authClient.fetchToken()
                .doOnNext(tokenResponse -> {
                    // Cache the new token with expiration
                    Instant expiry = Instant.now()
                            .plusSeconds(tokenResponse.expiresIn())
                            .minusSeconds(30); // Refresh 30 seconds early
                    cachedToken.set(new CachedToken(tokenResponse.accessToken(), expiry));
                })
                .map(TokenResponse::accessToken);
    }

    private record CachedToken(String token, Instant expiry) {
        boolean isExpired() {
            return Instant.now().isAfter(expiry);
        }
    }
}
```

## Building a Retry Filter with Exponential Backoff

Network failures happen. This filter automatically retries failed requests with exponential backoff.

```java
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.ClientRequest;
import org.springframework.web.reactive.function.client.ClientResponse;
import org.springframework.web.reactive.function.client.ExchangeFilterFunction;
import org.springframework.web.reactive.function.client.ExchangeFunction;
import reactor.core.publisher.Mono;
import reactor.util.retry.Retry;

import java.time.Duration;
import java.util.Set;

@Component
public class RetryFilter implements ExchangeFilterFunction {

    private static final Logger log = LoggerFactory.getLogger(RetryFilter.class);

    // HTTP status codes that should trigger a retry
    private static final Set<HttpStatus> RETRYABLE_STATUS_CODES = Set.of(
            HttpStatus.TOO_MANY_REQUESTS,
            HttpStatus.SERVICE_UNAVAILABLE,
            HttpStatus.GATEWAY_TIMEOUT,
            HttpStatus.BAD_GATEWAY
    );

    private final RetryConfig config;

    public RetryFilter(RetryConfig config) {
        this.config = config;
    }

    @Override
    public Mono<ClientResponse> filter(ClientRequest request, ExchangeFunction next) {
        return next.exchange(request)
                .flatMap(response -> {
                    // Check if the response status requires a retry
                    if (shouldRetry(response.statusCode())) {
                        // Signal an error to trigger the retry mechanism
                        return Mono.error(new RetryableException(
                                "Retryable status: " + response.statusCode()));
                    }
                    return Mono.just(response);
                })
                .retryWhen(Retry.backoff(config.maxAttempts(), config.initialBackoff())
                        .maxBackoff(config.maxBackoff())
                        .filter(this::isRetryableException)
                        .doBeforeRetry(signal ->
                            log.warn("Retrying request: {} {} - Attempt: {}",
                                    request.method(),
                                    request.url(),
                                    signal.totalRetries() + 1)
                        )
                );
    }

    private boolean shouldRetry(HttpStatus status) {
        return RETRYABLE_STATUS_CODES.contains(status);
    }

    private boolean isRetryableException(Throwable throwable) {
        return throwable instanceof RetryableException
                || throwable instanceof java.net.ConnectException
                || throwable instanceof java.net.SocketTimeoutException;
    }
}
```

The retry configuration record:

```java
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

@ConfigurationProperties(prefix = "webclient.retry")
public record RetryConfig(
        int maxAttempts,
        Duration initialBackoff,
        Duration maxBackoff
) {
    public RetryConfig {
        // Default values if not specified
        if (maxAttempts <= 0) maxAttempts = 3;
        if (initialBackoff == null) initialBackoff = Duration.ofMillis(100);
        if (maxBackoff == null) maxBackoff = Duration.ofSeconds(5);
    }
}
```

The custom exception for retryable errors:

```java
public class RetryableException extends RuntimeException {
    public RetryableException(String message) {
        super(message);
    }
}
```

## Building a Request ID Correlation Filter

Tracking requests across distributed systems requires correlation IDs. This filter ensures every request has a unique identifier.

```java
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.ClientRequest;
import org.springframework.web.reactive.function.client.ClientResponse;
import org.springframework.web.reactive.function.client.ExchangeFilterFunction;
import org.springframework.web.reactive.function.client.ExchangeFunction;
import reactor.core.publisher.Mono;

import java.util.UUID;

@Component
public class CorrelationIdFilter implements ExchangeFilterFunction {

    private static final String CORRELATION_ID_HEADER = "X-Correlation-ID";

    @Override
    public Mono<ClientResponse> filter(ClientRequest request, ExchangeFunction next) {
        // Check if correlation ID already exists in the request
        String correlationId = request.headers()
                .getFirst(CORRELATION_ID_HEADER);

        if (correlationId == null || correlationId.isBlank()) {
            // Generate a new correlation ID
            correlationId = UUID.randomUUID().toString();
        }

        // Build the request with the correlation ID header
        ClientRequest modifiedRequest = ClientRequest.from(request)
                .header(CORRELATION_ID_HEADER, correlationId)
                .build();

        return next.exchange(modifiedRequest);
    }
}
```

## Building a Response Caching Filter

For idempotent GET requests, caching responses can improve performance significantly.

```java
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.ClientRequest;
import org.springframework.web.reactive.function.client.ClientResponse;
import org.springframework.web.reactive.function.client.ExchangeFilterFunction;
import org.springframework.web.reactive.function.client.ExchangeFunction;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

@Component
public class CachingFilter implements ExchangeFilterFunction {

    private final ConcurrentMap<String, CachedResponse> cache = new ConcurrentHashMap<>();
    private final Duration cacheDuration;

    public CachingFilter() {
        this.cacheDuration = Duration.ofMinutes(5);
    }

    @Override
    public Mono<ClientResponse> filter(ClientRequest request, ExchangeFunction next) {
        // Only cache GET requests
        if (request.method() != HttpMethod.GET) {
            return next.exchange(request);
        }

        String cacheKey = generateCacheKey(request);
        CachedResponse cached = cache.get(cacheKey);

        // Return cached response if valid
        if (cached != null && !cached.isExpired()) {
            return Mono.just(cached.toClientResponse());
        }

        // Make the request and cache the response
        return next.exchange(request)
                .flatMap(response -> {
                    // Only cache successful responses
                    if (response.statusCode().is2xxSuccessful()) {
                        return cacheResponse(cacheKey, response);
                    }
                    return Mono.just(response);
                });
    }

    private String generateCacheKey(ClientRequest request) {
        return request.method() + ":" + request.url().toString();
    }

    private Mono<ClientResponse> cacheResponse(String cacheKey, ClientResponse response) {
        return response.bodyToMono(String.class)
                .map(body -> {
                    CachedResponse cached = new CachedResponse(
                            response.statusCode(),
                            response.headers().asHttpHeaders(),
                            body,
                            System.currentTimeMillis() + cacheDuration.toMillis()
                    );
                    cache.put(cacheKey, cached);
                    return cached.toClientResponse();
                });
    }
}
```

## Building a Circuit Breaker Filter

When a downstream service is failing, continuing to send requests wastes resources. A circuit breaker stops requests after repeated failures.

```java
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.ClientRequest;
import org.springframework.web.reactive.function.client.ClientResponse;
import org.springframework.web.reactive.function.client.ExchangeFilterFunction;
import org.springframework.web.reactive.function.client.ExchangeFunction;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

@Component
public class CircuitBreakerFilter implements ExchangeFilterFunction {

    private static final Logger log = LoggerFactory.getLogger(CircuitBreakerFilter.class);

    private final AtomicInteger failureCount = new AtomicInteger(0);
    private final AtomicReference<CircuitState> state = new AtomicReference<>(CircuitState.CLOSED);
    private final AtomicReference<Instant> openedAt = new AtomicReference<>();

    private final int failureThreshold;
    private final Duration resetTimeout;

    public CircuitBreakerFilter() {
        this.failureThreshold = 5;
        this.resetTimeout = Duration.ofSeconds(30);
    }

    @Override
    public Mono<ClientResponse> filter(ClientRequest request, ExchangeFunction next) {
        // Check circuit state
        if (state.get() == CircuitState.OPEN) {
            // Check if we should try half-open
            if (shouldAttemptReset()) {
                state.set(CircuitState.HALF_OPEN);
                log.info("Circuit breaker transitioning to HALF_OPEN");
            } else {
                // Circuit is open, fail fast
                return Mono.error(new CircuitBreakerOpenException(
                        "Circuit breaker is open for: " + request.url().getHost()));
            }
        }

        return next.exchange(request)
                .doOnSuccess(response -> {
                    if (response.statusCode().is2xxSuccessful()) {
                        onSuccess();
                    } else if (response.statusCode().is5xxServerError()) {
                        onFailure();
                    }
                })
                .doOnError(error -> onFailure());
    }

    private void onSuccess() {
        failureCount.set(0);
        if (state.get() == CircuitState.HALF_OPEN) {
            state.set(CircuitState.CLOSED);
            log.info("Circuit breaker closed after successful request");
        }
    }

    private void onFailure() {
        int failures = failureCount.incrementAndGet();
        if (failures >= failureThreshold && state.get() == CircuitState.CLOSED) {
            state.set(CircuitState.OPEN);
            openedAt.set(Instant.now());
            log.warn("Circuit breaker opened after {} failures", failures);
        }
    }

    private boolean shouldAttemptReset() {
        Instant opened = openedAt.get();
        return opened != null && Instant.now().isAfter(opened.plus(resetTimeout));
    }

    private enum CircuitState {
        CLOSED, OPEN, HALF_OPEN
    }
}
```

## Building a Request/Response Modification Filter

Sometimes you need to modify requests based on certain conditions or add default parameters.

```java
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.ClientRequest;
import org.springframework.web.reactive.function.client.ClientResponse;
import org.springframework.web.reactive.function.client.ExchangeFilterFunction;
import org.springframework.web.reactive.function.client.ExchangeFunction;
import org.springframework.web.util.UriComponentsBuilder;
import reactor.core.publisher.Mono;

import java.net.URI;

@Component
public class RequestModificationFilter implements ExchangeFilterFunction {

    private final String apiVersion;
    private final String clientId;

    public RequestModificationFilter() {
        this.apiVersion = "v2";
        this.clientId = "my-application";
    }

    @Override
    public Mono<ClientResponse> filter(ClientRequest request, ExchangeFunction next) {
        // Add default query parameters
        URI modifiedUri = UriComponentsBuilder.fromUri(request.url())
                .queryParam("api_version", apiVersion)
                .queryParam("client_id", clientId)
                .build()
                .toUri();

        // Build modified request with additional headers
        ClientRequest modifiedRequest = ClientRequest.from(request)
                .url(modifiedUri)
                .header("X-Client-Version", "1.0.0")
                .header("X-Request-Source", "spring-webclient")
                .header("Accept", "application/json")
                .build();

        return next.exchange(modifiedRequest);
    }
}
```

## Building a Metrics Collection Filter

Collecting metrics helps monitor API performance and identify issues.

```java
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.ClientRequest;
import org.springframework.web.reactive.function.client.ClientResponse;
import org.springframework.web.reactive.function.client.ExchangeFilterFunction;
import org.springframework.web.reactive.function.client.ExchangeFunction;
import reactor.core.publisher.Mono;

import java.util.concurrent.TimeUnit;

@Component
public class MetricsFilter implements ExchangeFilterFunction {

    private final MeterRegistry meterRegistry;

    public MetricsFilter(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
    }

    @Override
    public Mono<ClientResponse> filter(ClientRequest request, ExchangeFunction next) {
        long startTime = System.nanoTime();
        String host = request.url().getHost();
        String method = request.method().name();

        return next.exchange(request)
                .doOnSuccess(response -> {
                    recordMetrics(host, method, response.statusCode().value(), startTime);
                })
                .doOnError(error -> {
                    recordErrorMetrics(host, method, error, startTime);
                });
    }

    private void recordMetrics(String host, String method, int status, long startTime) {
        long duration = System.nanoTime() - startTime;

        Timer.builder("webclient.requests")
                .tag("host", host)
                .tag("method", method)
                .tag("status", String.valueOf(status))
                .tag("outcome", status < 400 ? "success" : "error")
                .register(meterRegistry)
                .record(duration, TimeUnit.NANOSECONDS);

        meterRegistry.counter("webclient.requests.total",
                "host", host,
                "method", method,
                "status", String.valueOf(status))
                .increment();
    }

    private void recordErrorMetrics(String host, String method, Throwable error, long startTime) {
        long duration = System.nanoTime() - startTime;

        Timer.builder("webclient.requests")
                .tag("host", host)
                .tag("method", method)
                .tag("status", "0")
                .tag("outcome", "error")
                .tag("exception", error.getClass().getSimpleName())
                .register(meterRegistry)
                .record(duration, TimeUnit.NANOSECONDS);
    }
}
```

## Combining Filters with Proper Ordering

The order of filters matters. Here is a recommended configuration:

```java
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
public class WebClientConfig {

    @Bean
    public WebClient webClient(
            MetricsFilter metricsFilter,
            LoggingFilter loggingFilter,
            CorrelationIdFilter correlationIdFilter,
            AuthenticationFilter authFilter,
            CircuitBreakerFilter circuitBreakerFilter,
            RetryFilter retryFilter) {

        return WebClient.builder()
                .baseUrl("https://api.example.com")
                // Order matters - here is the recommended sequence:
                // 1. Metrics - capture timing for the entire request
                .filter(metricsFilter)
                // 2. Logging - log before any modifications
                .filter(loggingFilter)
                // 3. Correlation ID - add tracking header
                .filter(correlationIdFilter)
                // 4. Authentication - add auth header
                .filter(authFilter)
                // 5. Circuit Breaker - fail fast if service is down
                .filter(circuitBreakerFilter)
                // 6. Retry - retry on transient failures
                .filter(retryFilter)
                .build();
    }
}
```

| Order | Filter | Purpose |
|-------|--------|---------|
| 1 | Metrics | Captures total request duration |
| 2 | Logging | Logs requests before modifications |
| 3 | Correlation ID | Adds tracking header |
| 4 | Authentication | Adds auth token |
| 5 | Circuit Breaker | Prevents requests to failing services |
| 6 | Retry | Handles transient failures |

## Using Static Factory Methods

For simple filters, you can use static factory methods instead of creating full classes:

```java
import org.springframework.web.reactive.function.client.ExchangeFilterFunction;
import reactor.core.publisher.Mono;

public class FilterFactories {

    // Simple header injection filter
    public static ExchangeFilterFunction addHeader(String name, String value) {
        return (request, next) -> {
            var modifiedRequest = ClientRequest.from(request)
                    .header(name, value)
                    .build();
            return next.exchange(modifiedRequest);
        };
    }

    // Simple logging filter using built-in methods
    public static ExchangeFilterFunction logRequest() {
        return ExchangeFilterFunction.ofRequestProcessor(request -> {
            System.out.println("Request: " + request.method() + " " + request.url());
            return Mono.just(request);
        });
    }

    // Simple response logging
    public static ExchangeFilterFunction logResponse() {
        return ExchangeFilterFunction.ofResponseProcessor(response -> {
            System.out.println("Response status: " + response.statusCode());
            return Mono.just(response);
        });
    }

    // Conditional filter that only applies based on a predicate
    public static ExchangeFilterFunction conditionalFilter(
            java.util.function.Predicate<ClientRequest> condition,
            ExchangeFilterFunction filter) {
        return (request, next) -> {
            if (condition.test(request)) {
                return filter.filter(request, next);
            }
            return next.exchange(request);
        };
    }
}
```

Usage example:

```java
WebClient client = WebClient.builder()
        .filter(FilterFactories.addHeader("X-Custom-Header", "value"))
        .filter(FilterFactories.logRequest())
        .filter(FilterFactories.logResponse())
        .filter(FilterFactories.conditionalFilter(
                req -> req.url().getPath().startsWith("/api/v2"),
                FilterFactories.addHeader("X-API-Version", "2")
        ))
        .build();
```

## Testing Filters

Always test your filters. Here is an example using MockWebServer:

```java
import okhttp3.mockwebserver.MockResponse;
import okhttp3.mockwebserver.MockWebServer;
import okhttp3.mockwebserver.RecordedRequest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.test.StepVerifier;

import java.io.IOException;

import static org.assertj.core.api.Assertions.assertThat;

class AuthenticationFilterTest {

    private MockWebServer mockServer;
    private WebClient webClient;

    @BeforeEach
    void setup() throws IOException {
        mockServer = new MockWebServer();
        mockServer.start();

        TokenService tokenService = new FakeTokenService("test-token");
        AuthenticationFilter authFilter = new AuthenticationFilter(tokenService);

        webClient = WebClient.builder()
                .baseUrl(mockServer.url("/").toString())
                .filter(authFilter)
                .build();
    }

    @AfterEach
    void teardown() throws IOException {
        mockServer.shutdown();
    }

    @Test
    void shouldAddAuthorizationHeader() throws InterruptedException {
        mockServer.enqueue(new MockResponse()
                .setResponseCode(200)
                .setBody("{\"status\":\"ok\"}"));

        StepVerifier.create(webClient.get()
                        .uri("/test")
                        .retrieve()
                        .bodyToMono(String.class))
                .expectNext("{\"status\":\"ok\"}")
                .verifyComplete();

        RecordedRequest request = mockServer.takeRequest();
        assertThat(request.getHeader("Authorization"))
                .isEqualTo("Bearer test-token");
    }
}
```

## Summary

Custom WebClient filters provide a clean way to handle cross-cutting concerns in your HTTP communication. By building reusable filters for logging, authentication, retry logic, and metrics, you keep your business logic clean and your infrastructure concerns separated.

Key takeaways:
- Use `ExchangeFilterFunction` to intercept requests and responses
- Order your filters carefully based on their responsibilities
- Use static factory methods for simple, one-off filters
- Always test your filters with MockWebServer
- Consider using established libraries like Resilience4j for production circuit breakers

The filter pattern keeps your WebClient calls simple while handling complex requirements behind the scenes.
