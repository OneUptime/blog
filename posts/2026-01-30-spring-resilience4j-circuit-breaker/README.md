# How to Build Circuit Breaker with Resilience4j

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Java, Spring Boot, Resilience, Microservices

Description: Implement fault tolerance in Spring Boot with Resilience4j circuit breakers, rate limiters, retry mechanisms, and bulkheads for resilient microservices.

---

Remote service calls fail. Networks time out. Downstream dependencies become unavailable. Without fault tolerance patterns, a single failing service can cascade and bring down your entire system. Resilience4j is a lightweight fault tolerance library designed for Java 8 and functional programming that provides circuit breakers, rate limiters, retry mechanisms, bulkheads, and time limiters.

## Why Resilience4j Over Hystrix?

Netflix Hystrix was the go-to library for circuit breakers, but it entered maintenance mode in 2018. Resilience4j was built as a modern replacement with several advantages.

| Feature | Hystrix | Resilience4j |
|---------|---------|--------------|
| **Status** | Maintenance mode | Active development |
| **Dependencies** | Heavy (Archaius, RxJava) | Lightweight (Vavr only) |
| **Configuration** | Archaius properties | Spring Boot native |
| **Functional style** | Limited | Full support |
| **Metrics** | Proprietary | Micrometer native |
| **Modularity** | Monolithic | Pick what you need |

## Getting Started

Add the Resilience4j Spring Boot starter to your project. This brings in circuit breaker, retry, rate limiter, bulkhead, and time limiter modules.

```xml
<!-- pom.xml -->
<dependency>
    <groupId>io.github.resilience4j</groupId>
    <artifactId>resilience4j-spring-boot3</artifactId>
    <version>2.2.0</version>
</dependency>

<!-- For metrics with Micrometer -->
<dependency>
    <groupId>io.github.resilience4j</groupId>
    <artifactId>resilience4j-micrometer</artifactId>
    <version>2.2.0</version>
</dependency>

<!-- Spring Boot Actuator for health endpoints -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>

<!-- AOP support for annotations -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-aop</artifactId>
</dependency>
```

For Gradle projects, add these to your build.gradle file.

```groovy
// build.gradle
implementation 'io.github.resilience4j:resilience4j-spring-boot3:2.2.0'
implementation 'io.github.resilience4j:resilience4j-micrometer:2.2.0'
implementation 'org.springframework.boot:spring-boot-starter-actuator'
implementation 'org.springframework.boot:spring-boot-starter-aop'
```

## Circuit Breaker States

A circuit breaker operates in three states that control whether calls pass through to the protected function.

| State | Behavior | Transition |
|-------|----------|------------|
| **CLOSED** | Calls pass through normally | Opens when failure rate exceeds threshold |
| **OPEN** | Calls fail immediately without executing | Transitions to HALF_OPEN after wait duration |
| **HALF_OPEN** | Limited calls pass through as a test | Closes if test calls succeed, opens if they fail |

The state machine also supports two special states for manual intervention.

| State | Purpose |
|-------|---------|
| **DISABLED** | Always allows calls, no state tracking |
| **FORCED_OPEN** | Always rejects calls, used for testing |

## Basic Circuit Breaker Configuration

Configure circuit breakers in your application.yml file. This configuration creates a circuit breaker named "backendService" with specific thresholds and timing.

```yaml
# application.yml
resilience4j:
  circuitbreaker:
    instances:
      backendService:
        # Number of calls to record for failure rate calculation
        slidingWindowSize: 10
        # Type of sliding window: COUNT_BASED or TIME_BASED
        slidingWindowType: COUNT_BASED
        # Minimum calls before calculating failure rate
        minimumNumberOfCalls: 5
        # Failure rate threshold percentage to open circuit
        failureRateThreshold: 50
        # Time to wait in OPEN state before transitioning to HALF_OPEN
        waitDurationInOpenState: 30s
        # Number of permitted calls in HALF_OPEN state
        permittedNumberOfCallsInHalfOpenState: 3
        # Automatically transition from OPEN to HALF_OPEN
        automaticTransitionFromOpenToHalfOpenEnabled: true
        # Record these exceptions as failures
        recordExceptions:
          - java.io.IOException
          - java.util.concurrent.TimeoutException
          - org.springframework.web.client.HttpServerErrorException
        # Ignore these exceptions (not counted as success or failure)
        ignoreExceptions:
          - com.example.BusinessException
```

## Using Circuit Breaker with Annotations

The simplest way to apply a circuit breaker is with the @CircuitBreaker annotation. The annotation wraps the method and tracks its success and failure states.

```java
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
public class PaymentService {

    private final RestTemplate restTemplate;

    public PaymentService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    // Apply circuit breaker named "backendService" with fallback method
    @CircuitBreaker(name = "backendService", fallbackMethod = "processPaymentFallback")
    public PaymentResponse processPayment(PaymentRequest request) {
        // This call is protected by the circuit breaker
        return restTemplate.postForObject(
            "http://payment-gateway/api/payments",
            request,
            PaymentResponse.class
        );
    }

    // Fallback method must have same return type and accept Throwable as last param
    private PaymentResponse processPaymentFallback(PaymentRequest request, Throwable t) {
        // Log the failure for debugging
        log.warn("Payment service unavailable, returning cached response: {}", t.getMessage());

        // Return a graceful degradation response
        return PaymentResponse.builder()
            .status("PENDING")
            .message("Payment queued for processing")
            .retryAfter(30)
            .build();
    }
}
```

## Programmatic Circuit Breaker Usage

For more control, use the CircuitBreakerRegistry to create and manage circuit breakers programmatically. This approach gives you access to events and metrics.

```java
import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.circuitbreaker.CircuitBreakerConfig;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import io.vavr.control.Try;

import java.time.Duration;
import java.util.function.Supplier;

@Service
public class InventoryService {

    private final CircuitBreaker circuitBreaker;
    private final RestTemplate restTemplate;

    public InventoryService(CircuitBreakerRegistry registry, RestTemplate restTemplate) {
        // Get or create circuit breaker from registry
        this.circuitBreaker = registry.circuitBreaker("inventoryService");
        this.restTemplate = restTemplate;

        // Register event handlers for monitoring
        circuitBreaker.getEventPublisher()
            .onStateTransition(event ->
                log.info("Circuit breaker state changed: {} -> {}",
                    event.getStateTransition().getFromState(),
                    event.getStateTransition().getToState()))
            .onFailureRateExceeded(event ->
                log.warn("Failure rate exceeded: {}%", event.getFailureRate()))
            .onCallNotPermitted(event ->
                log.warn("Call not permitted, circuit is OPEN"));
    }

    public InventoryResponse checkInventory(String productId) {
        // Wrap the supplier with circuit breaker
        Supplier<InventoryResponse> decoratedSupplier = CircuitBreaker
            .decorateSupplier(circuitBreaker, () ->
                restTemplate.getForObject(
                    "http://inventory-service/api/products/" + productId,
                    InventoryResponse.class
                ));

        // Execute with fallback using Vavr Try
        return Try.ofSupplier(decoratedSupplier)
            .recover(throwable -> {
                log.warn("Inventory check failed: {}", throwable.getMessage());
                return InventoryResponse.unknown(productId);
            })
            .get();
    }

    // Check current circuit breaker state
    public CircuitBreakerStatus getStatus() {
        CircuitBreaker.Metrics metrics = circuitBreaker.getMetrics();
        return CircuitBreakerStatus.builder()
            .state(circuitBreaker.getState().name())
            .failureRate(metrics.getFailureRate())
            .slowCallRate(metrics.getSlowCallRate())
            .numberOfBufferedCalls(metrics.getNumberOfBufferedCalls())
            .numberOfFailedCalls(metrics.getNumberOfFailedCalls())
            .numberOfSuccessfulCalls(metrics.getNumberOfSuccessfulCalls())
            .build();
    }
}
```

## Custom Circuit Breaker Configuration

Create custom configurations programmatically when you need different settings for different services.

```java
import io.github.resilience4j.circuitbreaker.CircuitBreakerConfig;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;

@Configuration
public class Resilience4jConfig {

    @Bean
    public CircuitBreakerRegistry circuitBreakerRegistry() {
        // Default configuration for all circuit breakers
        CircuitBreakerConfig defaultConfig = CircuitBreakerConfig.custom()
            .slidingWindowType(CircuitBreakerConfig.SlidingWindowType.COUNT_BASED)
            .slidingWindowSize(10)
            .minimumNumberOfCalls(5)
            .failureRateThreshold(50)
            .waitDurationInOpenState(Duration.ofSeconds(30))
            .permittedNumberOfCallsInHalfOpenState(3)
            .automaticTransitionFromOpenToHalfOpenEnabled(true)
            .build();

        // Configuration for critical payment services with stricter thresholds
        CircuitBreakerConfig paymentConfig = CircuitBreakerConfig.custom()
            .slidingWindowType(CircuitBreakerConfig.SlidingWindowType.TIME_BASED)
            .slidingWindowSize(60) // 60 seconds window
            .minimumNumberOfCalls(10)
            .failureRateThreshold(30) // Open at 30% failure rate
            .slowCallRateThreshold(50) // Also open if 50% of calls are slow
            .slowCallDurationThreshold(Duration.ofSeconds(2))
            .waitDurationInOpenState(Duration.ofSeconds(60))
            .permittedNumberOfCallsInHalfOpenState(5)
            .recordExceptions(IOException.class, TimeoutException.class)
            .ignoreExceptions(ValidationException.class)
            .build();

        // Configuration for non-critical services with relaxed thresholds
        CircuitBreakerConfig analyticsConfig = CircuitBreakerConfig.custom()
            .slidingWindowSize(20)
            .failureRateThreshold(70) // More tolerant of failures
            .waitDurationInOpenState(Duration.ofSeconds(10))
            .build();

        return CircuitBreakerRegistry.of(defaultConfig)
            .addConfiguration("payment", paymentConfig)
            .addConfiguration("analytics", analyticsConfig);
    }
}
```

## Combining Circuit Breaker with Retry

Retry handles transient failures while circuit breaker handles prolonged outages. The order matters: retry should be inside the circuit breaker so that all retry attempts count as a single call for the circuit breaker.

```yaml
# application.yml
resilience4j:
  circuitbreaker:
    instances:
      orderService:
        slidingWindowSize: 10
        failureRateThreshold: 50
        waitDurationInOpenState: 30s

  retry:
    instances:
      orderService:
        # Maximum retry attempts including initial call
        maxAttempts: 3
        # Wait between retries
        waitDuration: 500ms
        # Exponential backoff multiplier
        enableExponentialBackoff: true
        exponentialBackoffMultiplier: 2
        # Maximum wait time between retries
        exponentialMaxWaitDuration: 5s
        # Only retry on these exceptions
        retryExceptions:
          - java.io.IOException
          - java.util.concurrent.TimeoutException
        # Never retry on these exceptions
        ignoreExceptions:
          - com.example.ValidationException
```

Apply both annotations to a method. The aspect order determines which pattern wraps which.

```java
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;

@Service
public class OrderService {

    private final RestTemplate restTemplate;

    public OrderService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    // Retry is applied first (innermost), then circuit breaker wraps retry
    // So: CircuitBreaker -> Retry -> actual call
    @CircuitBreaker(name = "orderService", fallbackMethod = "createOrderFallback")
    @Retry(name = "orderService")
    public OrderResponse createOrder(OrderRequest request) {
        return restTemplate.postForObject(
            "http://order-service/api/orders",
            request,
            OrderResponse.class
        );
    }

    private OrderResponse createOrderFallback(OrderRequest request, Throwable t) {
        log.error("Order creation failed after retries: {}", t.getMessage());

        // Queue order for async processing
        orderQueue.enqueue(request);

        return OrderResponse.builder()
            .status("QUEUED")
            .message("Order received, processing delayed")
            .build();
    }
}
```

## Rate Limiter

Rate limiter restricts the number of calls in a time period. This protects your service from being overwhelmed and can help comply with third-party API rate limits.

```yaml
# application.yml
resilience4j:
  ratelimiter:
    instances:
      externalApi:
        # Maximum calls allowed in the period
        limitForPeriod: 100
        # Time period for rate limiting
        limitRefreshPeriod: 1s
        # Maximum time a thread waits for permission
        timeoutDuration: 500ms
```

Apply rate limiting with the annotation.

```java
import io.github.resilience4j.ratelimiter.annotation.RateLimiter;

@Service
public class ExternalApiService {

    private final RestTemplate restTemplate;

    public ExternalApiService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    // Limit calls to external API to stay within their rate limits
    @RateLimiter(name = "externalApi", fallbackMethod = "getDataFallback")
    public ApiResponse getData(String query) {
        return restTemplate.getForObject(
            "https://api.external.com/data?q=" + query,
            ApiResponse.class
        );
    }

    private ApiResponse getDataFallback(String query, RequestNotPermitted e) {
        log.warn("Rate limit exceeded for external API");
        throw new ServiceUnavailableException("Rate limit exceeded, try again later");
    }
}
```

## Bulkhead

Bulkhead limits concurrent calls to prevent resource exhaustion. Named after ship compartments that prevent flooding, bulkheads isolate failures to prevent them from consuming all available threads.

```yaml
# application.yml
resilience4j:
  bulkhead:
    instances:
      heavyOperation:
        # Maximum concurrent calls
        maxConcurrentCalls: 10
        # Maximum time to wait for permission
        maxWaitDuration: 100ms

  thread-pool-bulkhead:
    instances:
      asyncOperation:
        # Thread pool core size
        coreThreadPoolSize: 5
        # Thread pool maximum size
        maxThreadPoolSize: 10
        # Queue capacity for waiting tasks
        queueCapacity: 20
        # Keep alive time for idle threads
        keepAliveDuration: 20ms
```

Apply bulkhead to limit concurrent executions.

```java
import io.github.resilience4j.bulkhead.annotation.Bulkhead;

@Service
public class ReportService {

    // Limit concurrent report generations to 10
    @Bulkhead(name = "heavyOperation", fallbackMethod = "generateReportFallback")
    public Report generateReport(ReportRequest request) {
        // CPU and memory intensive operation
        return reportGenerator.generate(request);
    }

    private Report generateReportFallback(ReportRequest request, BulkheadFullException e) {
        log.warn("Bulkhead full, cannot generate report");
        throw new ServiceBusyException("System busy, please try again later");
    }

    // Async bulkhead with thread pool isolation
    @Bulkhead(name = "asyncOperation", type = Bulkhead.Type.THREADPOOL)
    public CompletableFuture<Report> generateReportAsync(ReportRequest request) {
        return CompletableFuture.supplyAsync(() -> reportGenerator.generate(request));
    }
}
```

## Time Limiter

Time limiter restricts execution time. Unlike connection and read timeouts, time limiter wraps the entire operation including retries.

```yaml
# application.yml
resilience4j:
  timelimiter:
    instances:
      slowService:
        # Maximum duration for the call
        timeoutDuration: 5s
        # Cancel the running future when timeout occurs
        cancelRunningFuture: true
```

Time limiter works with CompletableFuture or reactive types.

```java
import io.github.resilience4j.timelimiter.annotation.TimeLimiter;

@Service
public class SearchService {

    private final AsyncSearchClient searchClient;

    public SearchService(AsyncSearchClient searchClient) {
        this.searchClient = searchClient;
    }

    // Limit search execution to 5 seconds
    @TimeLimiter(name = "slowService", fallbackMethod = "searchFallback")
    public CompletableFuture<SearchResults> search(String query) {
        return searchClient.searchAsync(query);
    }

    private CompletableFuture<SearchResults> searchFallback(String query, TimeoutException e) {
        log.warn("Search timed out for query: {}", query);
        return CompletableFuture.completedFuture(SearchResults.empty());
    }
}
```

## Combining All Patterns

For maximum resilience, combine multiple patterns. The default aspect order from outermost to innermost is: Retry, CircuitBreaker, RateLimiter, TimeLimiter, Bulkhead.

```yaml
# application.yml
resilience4j:
  circuitbreaker:
    instances:
      criticalService:
        slidingWindowSize: 10
        failureRateThreshold: 50
        waitDurationInOpenState: 30s

  retry:
    instances:
      criticalService:
        maxAttempts: 3
        waitDuration: 500ms
        enableExponentialBackoff: true
        exponentialBackoffMultiplier: 2

  ratelimiter:
    instances:
      criticalService:
        limitForPeriod: 50
        limitRefreshPeriod: 1s
        timeoutDuration: 0ms

  bulkhead:
    instances:
      criticalService:
        maxConcurrentCalls: 20
        maxWaitDuration: 0ms

  timelimiter:
    instances:
      criticalService:
        timeoutDuration: 10s
```

Apply all patterns to a single method.

```java
import io.github.resilience4j.bulkhead.annotation.Bulkhead;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.ratelimiter.annotation.RateLimiter;
import io.github.resilience4j.retry.annotation.Retry;
import io.github.resilience4j.timelimiter.annotation.TimeLimiter;

@Service
public class CriticalService {

    private final WebClient webClient;

    public CriticalService(WebClient webClient) {
        this.webClient = webClient;
    }

    // All patterns applied - order matters for how they wrap each other
    @Bulkhead(name = "criticalService")
    @TimeLimiter(name = "criticalService")
    @RateLimiter(name = "criticalService")
    @CircuitBreaker(name = "criticalService", fallbackMethod = "fallback")
    @Retry(name = "criticalService")
    public CompletableFuture<Response> execute(Request request) {
        return webClient.post()
            .uri("/api/critical")
            .bodyValue(request)
            .retrieve()
            .bodyToMono(Response.class)
            .toFuture();
    }

    private CompletableFuture<Response> fallback(Request request, Throwable t) {
        log.error("Critical service call failed: {}", t.getMessage());
        return CompletableFuture.completedFuture(Response.degraded());
    }
}
```

## Monitoring with Actuator

Expose Resilience4j health indicators and metrics through Spring Boot Actuator.

```yaml
# application.yml
management:
  endpoints:
    web:
      exposure:
        include: health, metrics, circuitbreakers, ratelimiters, retries, bulkheads
  endpoint:
    health:
      show-details: always
  health:
    circuitbreakers:
      enabled: true
    ratelimiters:
      enabled: true

resilience4j:
  circuitbreaker:
    configs:
      default:
        registerHealthIndicator: true
```

The health endpoint shows circuit breaker states.

```json
{
  "status": "UP",
  "components": {
    "circuitBreakers": {
      "status": "UP",
      "details": {
        "backendService": {
          "status": "UP",
          "details": {
            "failureRate": "0.0%",
            "slowCallRate": "0.0%",
            "bufferedCalls": 8,
            "failedCalls": 0,
            "slowCalls": 0,
            "notPermittedCalls": 0,
            "state": "CLOSED"
          }
        }
      }
    }
  }
}
```

## Micrometer Metrics

Resilience4j publishes metrics to Micrometer, which can export to Prometheus, Datadog, or any supported monitoring system.

```java
import io.micrometer.core.instrument.MeterRegistry;
import io.github.resilience4j.micrometer.tagged.TaggedCircuitBreakerMetrics;
import io.github.resilience4j.micrometer.tagged.TaggedRetryMetrics;
import io.github.resilience4j.micrometer.tagged.TaggedRateLimiterMetrics;
import io.github.resilience4j.micrometer.tagged.TaggedBulkheadMetrics;

@Configuration
public class MetricsConfig {

    @Bean
    public TaggedCircuitBreakerMetrics taggedCircuitBreakerMetrics(
            CircuitBreakerRegistry registry, MeterRegistry meterRegistry) {
        return TaggedCircuitBreakerMetrics.ofCircuitBreakerRegistry(registry, meterRegistry);
    }

    @Bean
    public TaggedRetryMetrics taggedRetryMetrics(
            RetryRegistry registry, MeterRegistry meterRegistry) {
        return TaggedRetryMetrics.ofRetryRegistry(registry, meterRegistry);
    }

    @Bean
    public TaggedRateLimiterMetrics taggedRateLimiterMetrics(
            RateLimiterRegistry registry, MeterRegistry meterRegistry) {
        return TaggedRateLimiterMetrics.ofRateLimiterRegistry(registry, meterRegistry);
    }

    @Bean
    public TaggedBulkheadMetrics taggedBulkheadMetrics(
            BulkheadRegistry registry, MeterRegistry meterRegistry) {
        return TaggedBulkheadMetrics.ofBulkheadRegistry(registry, meterRegistry);
    }
}
```

Key metrics to monitor.

| Metric | Description |
|--------|-------------|
| `resilience4j_circuitbreaker_state` | Current state (0=closed, 1=open, 2=half_open) |
| `resilience4j_circuitbreaker_calls_total` | Total calls by outcome (successful, failed, not_permitted) |
| `resilience4j_circuitbreaker_failure_rate` | Current failure rate percentage |
| `resilience4j_retry_calls_total` | Total retry calls by outcome |
| `resilience4j_ratelimiter_available_permissions` | Available rate limit permits |
| `resilience4j_bulkhead_available_concurrent_calls` | Available bulkhead slots |

## Fallback Strategies

Design fallbacks that provide value even when the primary service fails.

```java
@Service
public class ProductService {

    private final ProductRepository repository;
    private final CacheManager cacheManager;
    private final RestTemplate restTemplate;

    public ProductService(ProductRepository repository,
                          CacheManager cacheManager,
                          RestTemplate restTemplate) {
        this.repository = repository;
        this.cacheManager = cacheManager;
        this.restTemplate = restTemplate;
    }

    @CircuitBreaker(name = "productService", fallbackMethod = "getProductFallback")
    public Product getProduct(String productId) {
        // Primary: fetch from remote service
        return restTemplate.getForObject(
            "http://product-service/api/products/" + productId,
            Product.class
        );
    }

    // Fallback chain: cache -> database -> static default
    private Product getProductFallback(String productId, Throwable t) {
        log.warn("Primary product service failed: {}", t.getMessage());

        // Try cache first
        Cache cache = cacheManager.getCache("products");
        if (cache != null) {
            Product cached = cache.get(productId, Product.class);
            if (cached != null) {
                log.info("Returning cached product: {}", productId);
                return cached.withStale(true);
            }
        }

        // Try local database
        return repository.findById(productId)
            .map(p -> p.withStale(true))
            .orElseGet(() -> {
                log.warn("Product not found in any fallback source: {}", productId);
                return Product.unavailable(productId);
            });
    }
}
```

## Testing Circuit Breakers

Test circuit breaker behavior with controlled failures.

```java
import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@SpringBootTest
class PaymentServiceTest {

    @Autowired
    private PaymentService paymentService;

    @Autowired
    private CircuitBreakerRegistry circuitBreakerRegistry;

    @MockBean
    private RestTemplate restTemplate;

    private CircuitBreaker circuitBreaker;

    @BeforeEach
    void setUp() {
        // Get the circuit breaker instance and reset its state
        circuitBreaker = circuitBreakerRegistry.circuitBreaker("backendService");
        circuitBreaker.reset();
    }

    @Test
    void shouldOpenCircuitAfterFailures() {
        // Arrange: configure mock to fail
        when(restTemplate.postForObject(anyString(), any(), eq(PaymentResponse.class)))
            .thenThrow(new RuntimeException("Service unavailable"));

        // Act: make enough calls to exceed failure threshold
        for (int i = 0; i < 10; i++) {
            try {
                paymentService.processPayment(new PaymentRequest());
            } catch (Exception ignored) {
            }
        }

        // Assert: circuit breaker should be open
        assertThat(circuitBreaker.getState())
            .isEqualTo(CircuitBreaker.State.OPEN);
    }

    @Test
    void shouldReturnFallbackWhenCircuitOpen() {
        // Arrange: force circuit open
        circuitBreaker.transitionToOpenState();

        // Act: make a call when circuit is open
        PaymentResponse response = paymentService.processPayment(new PaymentRequest());

        // Assert: fallback response returned, remote not called
        assertThat(response.getStatus()).isEqualTo("PENDING");
        verify(restTemplate, never()).postForObject(anyString(), any(), any());
    }

    @Test
    void shouldRecoverAfterWaitDuration() throws InterruptedException {
        // Arrange: mock to fail then succeed
        when(restTemplate.postForObject(anyString(), any(), eq(PaymentResponse.class)))
            .thenThrow(new RuntimeException("Service unavailable"))
            .thenReturn(new PaymentResponse("SUCCESS"));

        // Fill sliding window with failures to open circuit
        for (int i = 0; i < 10; i++) {
            try {
                paymentService.processPayment(new PaymentRequest());
            } catch (Exception ignored) {
            }
        }

        assertThat(circuitBreaker.getState()).isEqualTo(CircuitBreaker.State.OPEN);

        // Wait for circuit to transition to half-open
        Thread.sleep(31000); // waitDurationInOpenState + buffer

        // Make a successful call
        PaymentResponse response = paymentService.processPayment(new PaymentRequest());

        // Circuit should close after successful calls in half-open state
        assertThat(response.getStatus()).isEqualTo("SUCCESS");
    }
}
```

## Configuration Properties Reference

Complete reference for all Resilience4j configuration options.

### Circuit Breaker Properties

| Property | Default | Description |
|----------|---------|-------------|
| `slidingWindowSize` | 100 | Size of sliding window for recording calls |
| `slidingWindowType` | COUNT_BASED | COUNT_BASED or TIME_BASED |
| `minimumNumberOfCalls` | 100 | Minimum calls before calculating failure rate |
| `failureRateThreshold` | 50 | Failure percentage to open circuit |
| `slowCallRateThreshold` | 100 | Slow call percentage to open circuit |
| `slowCallDurationThreshold` | 60s | Duration to consider a call slow |
| `waitDurationInOpenState` | 60s | Time to wait before transitioning to half-open |
| `permittedNumberOfCallsInHalfOpenState` | 10 | Calls allowed in half-open state |
| `automaticTransitionFromOpenToHalfOpenEnabled` | false | Auto transition to half-open |

### Retry Properties

| Property | Default | Description |
|----------|---------|-------------|
| `maxAttempts` | 3 | Maximum retry attempts |
| `waitDuration` | 500ms | Wait between retries |
| `enableExponentialBackoff` | false | Enable exponential backoff |
| `exponentialBackoffMultiplier` | 2 | Backoff multiplier |
| `exponentialMaxWaitDuration` | - | Maximum wait duration |
| `enableRandomizedWait` | false | Add jitter to wait time |
| `randomizedWaitFactor` | 0.5 | Jitter factor |

### Rate Limiter Properties

| Property | Default | Description |
|----------|---------|-------------|
| `limitForPeriod` | 50 | Calls allowed per period |
| `limitRefreshPeriod` | 500ns | Rate limit period |
| `timeoutDuration` | 5s | Wait time for permission |

### Bulkhead Properties

| Property | Default | Description |
|----------|---------|-------------|
| `maxConcurrentCalls` | 25 | Maximum concurrent calls |
| `maxWaitDuration` | 0 | Wait time for permission |

## Best Practices

When implementing Resilience4j in production, follow these guidelines.

**Set realistic thresholds.** Base your failure rate threshold on normal error rates. If your service normally has 5% errors, a 10% threshold is appropriate. Setting it too low causes unnecessary circuit opens.

**Use time-based sliding windows for high-traffic services.** Count-based windows can fill quickly under load, making the circuit too sensitive. A 60-second time-based window provides more stable behavior.

**Always implement meaningful fallbacks.** A fallback that just rethrows the exception or returns null does not add value. Return cached data, default values, or queue the operation for later.

**Monitor circuit breaker states.** Alert when circuits open frequently or stay open too long. This indicates upstream service issues that need investigation.

**Test failure scenarios.** Use chaos engineering to verify your resilience patterns work as expected. Inject failures in non-production environments to validate fallback behavior.

**Configure different patterns for different services.** Critical payment services need stricter thresholds than analytics calls. Non-critical operations can tolerate higher failure rates.

**Consider the interaction between patterns.** Retry inside circuit breaker means retries count as one call. Retry outside means each retry is a separate call that can open the circuit faster.

## Summary

Resilience4j provides essential patterns for building fault-tolerant microservices.

| Pattern | Problem Solved | When to Use |
|---------|---------------|-------------|
| **Circuit Breaker** | Prolonged outages cascading | All remote calls |
| **Retry** | Transient failures | Idempotent operations |
| **Rate Limiter** | Overwhelming upstream services | External API calls |
| **Bulkhead** | Resource exhaustion | CPU or memory intensive operations |
| **Time Limiter** | Unbounded call duration | Async operations with SLAs |

Combining these patterns creates services that degrade gracefully under failure, recover automatically when dependencies return, and protect both your service and its dependencies from cascading failures.
