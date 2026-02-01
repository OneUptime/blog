# How to Use Resilience4j for Circuit Breakers in Spring Boot

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Java, Spring Boot, Resilience4j, Circuit Breaker, Fault Tolerance, Retry

Description: A practical guide to implementing circuit breakers, retries, and rate limiters with Resilience4j in Spring Boot.

---

Distributed systems fail. Services go down, networks partition, and databases timeout. The question is not whether your dependencies will fail, but how your application responds when they do.

Resilience4j is a lightweight fault tolerance library designed for Java 8 and functional programming. Unlike Hystrix (which Netflix put into maintenance mode), Resilience4j provides a modular approach where you pick only the patterns you need. In this guide, we will implement circuit breakers, retries, rate limiters, and bulkheads in a Spring Boot application.

## Why Circuit Breakers Matter

Imagine your payment service calls an external fraud detection API. When that API slows down or fails, requests pile up. Threads block waiting for responses. Your payment service becomes unresponsive. Users cannot checkout. Revenue drops.

A circuit breaker prevents this cascade. When failures exceed a threshold, the circuit "opens" and fails fast - returning an error immediately instead of waiting for timeouts. After a configured wait period, it allows a few test requests through. If those succeed, the circuit closes and normal operation resumes.

## Project Setup

Start with a Spring Boot project. Add these dependencies to your `pom.xml`:

```xml
<!-- Resilience4j Spring Boot starter with all modules -->
<dependency>
    <groupId>io.github.resilience4j</groupId>
    <artifactId>resilience4j-spring-boot3</artifactId>
    <version>2.2.0</version>
</dependency>

<!-- Spring Boot AOP for annotation-based configuration -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-aop</artifactId>
</dependency>

<!-- Actuator for monitoring circuit breaker states -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
```

For Gradle users:

```groovy
// Resilience4j with Spring Boot 3 support
implementation 'io.github.resilience4j:resilience4j-spring-boot3:2.2.0'

// Required for @CircuitBreaker and other annotations
implementation 'org.springframework.boot:spring-boot-starter-aop'

// Exposes circuit breaker metrics via endpoints
implementation 'org.springframework.boot:spring-boot-starter-actuator'
```

## Configuring Circuit Breakers

Resilience4j can be configured through `application.yml`. Here is a production-ready configuration:

```yaml
# Circuit breaker configuration in application.yml
resilience4j:
  circuitbreaker:
    instances:
      # Name this instance - we will reference it in code
      paymentService:
        # Use count-based sliding window (alternative: TIME_BASED)
        sliding-window-type: COUNT_BASED
        # Evaluate the last 10 calls to determine failure rate
        sliding-window-size: 10
        # Minimum calls before the circuit breaker can calculate failure rate
        minimum-number-of-calls: 5
        # Open the circuit when 50% of calls fail
        failure-rate-threshold: 50
        # Wait 30 seconds before allowing test requests
        wait-duration-in-open-state: 30s
        # Allow 3 calls in half-open state to test recovery
        permitted-number-of-calls-in-half-open-state: 3
        # Automatically transition from open to half-open
        automatic-transition-from-open-to-half-open-enabled: true
        # Record these exceptions as failures
        record-exceptions:
          - java.io.IOException
          - java.util.concurrent.TimeoutException
          - org.springframework.web.client.HttpServerErrorException
        # Ignore these exceptions - they won't count as failures
        ignore-exceptions:
          - com.example.BusinessException
```

The configuration above creates a circuit breaker that monitors the last 10 calls. When 5 or more of those calls fail (50% threshold), the circuit opens. After 30 seconds, it transitions to half-open and allows 3 test requests through.

## Implementing a Circuit Breaker

Create a service that calls an external API with circuit breaker protection:

```java
// PaymentService.java - Service with circuit breaker protection
@Service
@Slf4j
public class PaymentService {

    private final RestTemplate restTemplate;
    
    public PaymentService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    // The @CircuitBreaker annotation wraps this method
    // "paymentService" references the instance name in application.yml
    // fallbackMethod specifies what to call when the circuit is open
    @CircuitBreaker(name = "paymentService", fallbackMethod = "processPaymentFallback")
    public PaymentResponse processPayment(PaymentRequest request) {
        log.info("Processing payment for order: {}", request.getOrderId());
        
        // This call is protected by the circuit breaker
        return restTemplate.postForObject(
            "https://fraud-api.example.com/check",
            request,
            PaymentResponse.class
        );
    }

    // Fallback method must have the same return type
    // Exception parameter is optional but useful for logging
    private PaymentResponse processPaymentFallback(PaymentRequest request, Exception ex) {
        log.warn("Circuit breaker active for order: {}. Reason: {}", 
                 request.getOrderId(), ex.getMessage());
        
        // Return a safe default or cached response
        return PaymentResponse.builder()
            .orderId(request.getOrderId())
            .status("PENDING_REVIEW")
            .message("Payment queued for manual review")
            .build();
    }
}
```

The fallback method kicks in when:
- The circuit is open (failing fast)
- The wrapped method throws a recorded exception
- The call times out

## Adding Retry Logic

Network issues are often transient. A retry pattern handles temporary failures:

```yaml
# Add retry configuration to application.yml
resilience4j:
  retry:
    instances:
      paymentService:
        # Maximum number of attempts (including the initial call)
        max-attempts: 3
        # Wait 500ms between retries
        wait-duration: 500ms
        # Exponential backoff - each wait is multiplied by this
        exponential-backoff-multiplier: 2
        # Retry on these exceptions
        retry-exceptions:
          - java.io.IOException
          - java.util.concurrent.TimeoutException
        # Never retry on these - fail immediately
        ignore-exceptions:
          - com.example.InvalidRequestException
```

Apply the retry annotation to your service method:

```java
// Combining retry with circuit breaker
// Order matters: retry happens first, then circuit breaker evaluates
@Retry(name = "paymentService", fallbackMethod = "processPaymentFallback")
@CircuitBreaker(name = "paymentService", fallbackMethod = "processPaymentFallback")
public PaymentResponse processPayment(PaymentRequest request) {
    log.info("Processing payment attempt for order: {}", request.getOrderId());
    return restTemplate.postForObject(
        "https://fraud-api.example.com/check",
        request,
        PaymentResponse.class
    );
}
```

With the configuration above, a failing call will retry 3 times with waits of 500ms, 1000ms, and 2000ms. Only after all retries fail does it count as a circuit breaker failure.

## Rate Limiting External Calls

When calling third-party APIs with rate limits, protect yourself from hitting quotas:

```yaml
# Rate limiter configuration
resilience4j:
  ratelimiter:
    instances:
      externalApi:
        # Allow 100 calls per refresh period
        limit-for-period: 100
        # Refresh the limit every 1 second
        limit-refresh-period: 1s
        # Wait up to 500ms if limit is exhausted
        timeout-duration: 500ms
```

```java
// Service using rate limiter
@Service
public class ExternalApiService {

    // Rate limiter ensures we don't exceed 100 calls/second
    @RateLimiter(name = "externalApi", fallbackMethod = "rateLimitFallback")
    public ApiResponse callExternalApi(String endpoint) {
        return restTemplate.getForObject(endpoint, ApiResponse.class);
    }

    private ApiResponse rateLimitFallback(String endpoint, RequestNotPermitted ex) {
        log.warn("Rate limit exceeded for endpoint: {}", endpoint);
        throw new ServiceUnavailableException("API rate limit reached. Try again later.");
    }
}
```

## Bulkhead Pattern for Isolation

Bulkheads prevent one slow dependency from consuming all your threads. Resilience4j offers two types:

**Semaphore Bulkhead** - limits concurrent calls:

```yaml
# Semaphore bulkhead configuration
resilience4j:
  bulkhead:
    instances:
      paymentService:
        # Maximum 10 concurrent calls allowed
        max-concurrent-calls: 10
        # Wait up to 100ms if bulkhead is full
        max-wait-duration: 100ms
```

**Thread Pool Bulkhead** - uses a separate thread pool:

```yaml
# Thread pool bulkhead for complete isolation
resilience4j:
  thread-pool-bulkhead:
    instances:
      paymentService:
        # Core thread pool size
        core-thread-pool-size: 5
        # Maximum threads when queue is full
        max-thread-pool-size: 10
        # Queue capacity before rejecting
        queue-capacity: 20
        # How long excess threads stay alive
        keep-alive-duration: 20ms
```

```java
// Using bulkhead annotation - limits concurrent executions
@Bulkhead(name = "paymentService", fallbackMethod = "bulkheadFallback")
@CircuitBreaker(name = "paymentService", fallbackMethod = "processPaymentFallback")
public PaymentResponse processPayment(PaymentRequest request) {
    return restTemplate.postForObject(
        "https://fraud-api.example.com/check",
        request,
        PaymentResponse.class
    );
}

private PaymentResponse bulkheadFallback(PaymentRequest request, BulkheadFullException ex) {
    log.warn("Bulkhead full - too many concurrent requests");
    throw new ServiceUnavailableException("Service busy. Please retry.");
}
```

## Combining Multiple Patterns

Real applications need multiple resilience patterns working together. The execution order matters:

```
Bulkhead -> TimeLimiter -> RateLimiter -> CircuitBreaker -> Retry -> Method
```

This means Retry wraps the method call first, then CircuitBreaker evaluates, and so on outward.

Here is a service combining all patterns:

```java
// Full resilience stack on a single method
@Service
@Slf4j
public class ResilientPaymentService {

    private final RestTemplate restTemplate;

    public ResilientPaymentService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    // Patterns execute from right to left in the call chain
    // Retry -> CircuitBreaker -> Bulkhead -> RateLimiter
    @Retry(name = "paymentService")
    @CircuitBreaker(name = "paymentService", fallbackMethod = "fallback")
    @Bulkhead(name = "paymentService")
    @RateLimiter(name = "paymentService")
    public PaymentResponse processPayment(PaymentRequest request) {
        log.info("Attempting payment for order: {}", request.getOrderId());
        
        ResponseEntity<PaymentResponse> response = restTemplate.exchange(
            "https://fraud-api.example.com/check",
            HttpMethod.POST,
            new HttpEntity<>(request),
            PaymentResponse.class
        );
        
        return response.getBody();
    }

    // Generic fallback handles any exception type
    private PaymentResponse fallback(PaymentRequest request, Throwable t) {
        log.error("All resilience patterns exhausted for order: {}. Error: {}", 
                  request.getOrderId(), t.getMessage());
        
        // Queue for async processing or return cached result
        return PaymentResponse.builder()
            .orderId(request.getOrderId())
            .status("DEFERRED")
            .message("Payment will be processed shortly")
            .build();
    }
}
```

## Monitoring with Spring Actuator

Resilience4j integrates with Spring Boot Actuator for runtime visibility. Enable the endpoints:

```yaml
# Expose resilience4j actuator endpoints
management:
  endpoints:
    web:
      exposure:
        include: health,circuitbreakers,circuitbreakerevents,retries,ratelimiters
  endpoint:
    health:
      show-details: always
  health:
    circuitbreakers:
      enabled: true
    ratelimiters:
      enabled: true
```

Now you can query circuit breaker states:

```bash
# Get all circuit breaker states
curl http://localhost:8080/actuator/circuitbreakers

# Response shows current state for each instance
{
  "circuitBreakers": {
    "paymentService": {
      "failureRate": "25.0%",
      "slowCallRate": "0.0%",
      "slowCallRateThreshold": "100.0%",
      "bufferedCalls": 4,
      "slowCalls": 0,
      "slowFailedCalls": 0,
      "failedCalls": 1,
      "notPermittedCalls": 0,
      "state": "CLOSED"
    }
  }
}
```

View recent events to debug issues:

```bash
# Get circuit breaker events (state transitions, failures)
curl http://localhost:8080/actuator/circuitbreakerevents/paymentService

# Filter by event type
curl http://localhost:8080/actuator/circuitbreakerevents/paymentService?eventType=ERROR
```

## Programmatic Access to Circuit Breaker State

Sometimes you need to check circuit breaker state in code:

```java
// Injecting the circuit breaker registry for programmatic access
@Service
public class CircuitBreakerMonitor {

    private final CircuitBreakerRegistry circuitBreakerRegistry;

    public CircuitBreakerMonitor(CircuitBreakerRegistry circuitBreakerRegistry) {
        this.circuitBreakerRegistry = circuitBreakerRegistry;
    }

    public CircuitBreakerStatus getStatus(String name) {
        CircuitBreaker circuitBreaker = circuitBreakerRegistry.circuitBreaker(name);
        CircuitBreaker.Metrics metrics = circuitBreaker.getMetrics();

        return CircuitBreakerStatus.builder()
            .name(name)
            .state(circuitBreaker.getState().name())
            .failureRate(metrics.getFailureRate())
            .slowCallRate(metrics.getSlowCallRate())
            .bufferedCalls(metrics.getNumberOfBufferedCalls())
            .failedCalls(metrics.getNumberOfFailedCalls())
            .build();
    }

    // Register event listeners for alerting
    @PostConstruct
    public void registerEventListeners() {
        circuitBreakerRegistry.getAllCircuitBreakers().forEach(cb -> {
            cb.getEventPublisher()
                .onStateTransition(event -> 
                    log.warn("Circuit breaker {} transitioned from {} to {}",
                        event.getCircuitBreakerName(),
                        event.getStateTransition().getFromState(),
                        event.getStateTransition().getToState()));
        });
    }
}
```

## Testing Circuit Breakers

Write tests to verify your circuit breaker configuration:

```java
// Integration test for circuit breaker behavior
@SpringBootTest
class PaymentServiceCircuitBreakerTest {

    @Autowired
    private PaymentService paymentService;

    @Autowired
    private CircuitBreakerRegistry circuitBreakerRegistry;

    @MockBean
    private RestTemplate restTemplate;

    @Test
    void shouldOpenCircuitAfterFailures() {
        // Arrange - configure mock to always fail
        when(restTemplate.postForObject(anyString(), any(), eq(PaymentResponse.class)))
            .thenThrow(new HttpServerErrorException(HttpStatus.SERVICE_UNAVAILABLE));

        CircuitBreaker circuitBreaker = circuitBreakerRegistry.circuitBreaker("paymentService");
        
        // Act - make enough calls to trigger the circuit breaker
        // With sliding-window-size=10, minimum-calls=5, threshold=50%
        // We need at least 5 failures to open the circuit
        for (int i = 0; i < 6; i++) {
            try {
                paymentService.processPayment(new PaymentRequest("order-" + i));
            } catch (Exception ignored) {
                // Expected failures
            }
        }

        // Assert - circuit should be open
        assertThat(circuitBreaker.getState()).isEqualTo(CircuitBreaker.State.OPEN);
    }

    @Test
    void shouldCallFallbackWhenCircuitOpen() {
        // Arrange - manually open the circuit
        CircuitBreaker circuitBreaker = circuitBreakerRegistry.circuitBreaker("paymentService");
        circuitBreaker.transitionToOpenState();

        // Act
        PaymentResponse response = paymentService.processPayment(
            new PaymentRequest("test-order"));

        // Assert - fallback should return PENDING_REVIEW status
        assertThat(response.getStatus()).isEqualTo("PENDING_REVIEW");
        
        // Verify the external API was never called
        verifyNoInteractions(restTemplate);
    }
}
```

## Common Pitfalls

**Fallback method signature mismatch** - The fallback must have the same parameters as the original method, optionally followed by an Exception/Throwable parameter. Return types must match exactly.

**Annotation order confusion** - Remember that annotations execute from bottom to top (innermost to outermost). Place `@Retry` below `@CircuitBreaker` so retries happen before circuit breaker evaluation.

**Ignoring the wrong exceptions** - Be careful with `ignore-exceptions`. If you ignore `RuntimeException`, most failures will not trigger the circuit breaker.

**Too aggressive thresholds** - A 10% failure threshold with a sliding window of 5 means just one failure opens the circuit. Start conservative and tune based on real traffic patterns.

## Wrapping Up

Resilience4j gives you fine-grained control over failure handling in Spring Boot applications. Start with circuit breakers on your most critical external dependencies. Add retries for transient failures. Use rate limiters when calling APIs with quotas. Apply bulkheads to isolate slow dependencies.

The key is measuring and iterating. Watch your circuit breaker metrics in production. Tune thresholds based on actual failure rates. A circuit breaker that never opens provides no protection. One that opens too often degrades user experience.

Build resilience into your services from day one. Your future self - and your on-call rotation - will thank you.

---

*Monitor circuit breaker states with [OneUptime](https://oneuptime.com) - track failures and recovery patterns.*
