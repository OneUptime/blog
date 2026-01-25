# How to Build Resilient Microservices with Spring Cloud

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Java, Spring Cloud, Microservices, Resilience, Circuit Breaker

Description: A hands-on guide to building fault-tolerant microservices with Spring Cloud, covering circuit breakers, retries, rate limiters, and bulkheads with working code examples.

---

When I first started building microservices, everything worked fine in development. Then production happened. Services went down. Networks got flaky. Databases became unresponsive. And suddenly, one failing service took down the entire system like dominoes.

That experience taught me that building microservices is not just about splitting your monolith into smaller pieces. It is about designing for failure from day one. Spring Cloud provides battle-tested patterns to handle these failures gracefully, and this guide walks through implementing them with practical, working code.

## Why Resilience Patterns Matter

In a microservices architecture, your application depends on dozens of external calls - databases, caches, third-party APIs, and other services. Each call is a potential failure point. Without proper resilience patterns:

- A slow downstream service can exhaust your thread pool
- A failed service can cascade failures upstream
- Temporary network blips can cause unnecessary errors
- Resource exhaustion in one component can bring down everything

Spring Cloud addresses these concerns through Resilience4j integration, which provides circuit breakers, retries, rate limiters, bulkheads, and time limiters.

## Setting Up Your Project

First, add the necessary dependencies to your `pom.xml`:

```xml
<dependencies>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.cloud</groupId>
        <artifactId>spring-cloud-starter-circuitbreaker-resilience4j</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-aop</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-actuator</artifactId>
    </dependency>
</dependencies>
```

The AOP starter is essential since Resilience4j uses aspect-oriented programming for its annotations.

## Implementing Circuit Breakers

The circuit breaker pattern prevents cascading failures by failing fast when a downstream service is struggling. Think of it like an electrical circuit breaker - when things go wrong, it trips open to prevent further damage.

Here is a service that calls an external payment API:

```java
@Service
public class PaymentService {

    private final RestTemplate restTemplate;

    public PaymentService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    // Circuit breaker with fallback method
    @CircuitBreaker(name = "paymentService", fallbackMethod = "processPaymentFallback")
    public PaymentResponse processPayment(PaymentRequest request) {
        return restTemplate.postForObject(
            "http://payment-api/process",
            request,
            PaymentResponse.class
        );
    }

    // Fallback executes when circuit is open or call fails
    private PaymentResponse processPaymentFallback(PaymentRequest request, Exception ex) {
        // Log the failure for monitoring
        log.warn("Payment service unavailable, queuing for retry: {}", ex.getMessage());

        // Queue payment for async processing instead of failing completely
        paymentQueue.add(request);

        return PaymentResponse.builder()
            .status("QUEUED")
            .message("Payment queued for processing")
            .build();
    }
}
```

Configure the circuit breaker behavior in `application.yml`:

```yaml
resilience4j:
  circuitbreaker:
    instances:
      paymentService:
        # Number of calls to evaluate before deciding state
        slidingWindowSize: 10
        # Percentage of failures that trips the circuit
        failureRateThreshold: 50
        # How long to stay open before trying again
        waitDurationInOpenState: 30s
        # Calls allowed in half-open state to test recovery
        permittedNumberOfCallsInHalfOpenState: 3
        # Which exceptions count as failures
        recordExceptions:
          - java.io.IOException
          - java.util.concurrent.TimeoutException
          - org.springframework.web.client.HttpServerErrorException
```

The circuit breaker has three states:
- **Closed**: Normal operation, calls go through
- **Open**: Service is failing, calls fail immediately
- **Half-Open**: Testing if service recovered

## Adding Retry Logic

Not every failure is permanent. Network hiccups, temporary overload, or brief outages often resolve themselves. The retry pattern handles these transient failures:

```java
@Service
public class InventoryService {

    @Retry(name = "inventoryService", fallbackMethod = "getInventoryFallback")
    @CircuitBreaker(name = "inventoryService")
    public InventoryStatus checkInventory(String productId) {
        // This call will be retried on failure
        return restTemplate.getForObject(
            "http://inventory-api/check/" + productId,
            InventoryStatus.class
        );
    }

    private InventoryStatus getInventoryFallback(String productId, Exception ex) {
        // Return cached data or pessimistic response
        return cachedInventory.getOrDefault(productId,
            InventoryStatus.unknown());
    }
}
```

Configure retries with exponential backoff:

```yaml
resilience4j:
  retry:
    instances:
      inventoryService:
        maxAttempts: 3
        waitDuration: 500ms
        # Each retry waits longer than the previous
        enableExponentialBackoff: true
        exponentialBackoffMultiplier: 2
        # Only retry on specific exceptions
        retryExceptions:
          - java.io.IOException
          - java.net.SocketTimeoutException
        # Never retry these - they won't succeed anyway
        ignoreExceptions:
          - com.example.BusinessValidationException
```

**Important**: Order matters when combining patterns. Retry should be the outermost decorator, followed by circuit breaker. This way, retries happen before the circuit breaker evaluates the result.

## Implementing Bulkheads for Isolation

Bulkheads isolate different parts of your system so that a failure in one area does not consume all resources. The name comes from ship design, where compartments prevent a single breach from sinking the entire vessel.

```java
@Service
public class OrderService {

    // Semaphore bulkhead limits concurrent calls
    @Bulkhead(name = "orderService", type = Bulkhead.Type.SEMAPHORE)
    @CircuitBreaker(name = "orderService")
    public Order createOrder(OrderRequest request) {
        // Only a limited number of concurrent calls allowed
        return orderClient.create(request);
    }
}
```

Configure the bulkhead limits:

```yaml
resilience4j:
  bulkhead:
    instances:
      orderService:
        # Maximum concurrent calls
        maxConcurrentCalls: 20
        # How long to wait for a permit
        maxWaitDuration: 100ms
```

For thread pool isolation, which provides stronger isolation but higher overhead:

```yaml
resilience4j:
  thread-pool-bulkhead:
    instances:
      orderService:
        maxThreadPoolSize: 10
        coreThreadPoolSize: 5
        queueCapacity: 50
```

## Rate Limiting External Calls

When calling external APIs with usage limits, or when you need to protect downstream services from excessive load, rate limiting prevents you from overwhelming your dependencies:

```java
@Service
public class NotificationService {

    @RateLimiter(name = "emailService", fallbackMethod = "queueNotification")
    public void sendEmail(EmailRequest request) {
        emailClient.send(request);
    }

    private void queueNotification(EmailRequest request, RequestNotPermitted ex) {
        // Queue for later when rate limit is hit
        notificationQueue.add(request);
        log.info("Rate limit reached, notification queued");
    }
}
```

```yaml
resilience4j:
  ratelimiter:
    instances:
      emailService:
        # Calls allowed per period
        limitForPeriod: 100
        # The rate limit period
        limitRefreshPeriod: 1m
        # How long to wait for permission
        timeoutDuration: 500ms
```

## Monitoring Your Resilience Patterns

Resilience patterns are useless if you cannot observe them. Spring Boot Actuator exposes Resilience4j metrics out of the box:

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,metrics,circuitbreakers,retries
  health:
    circuitbreakers:
      enabled: true
```

Access circuit breaker state at `/actuator/circuitbreakers` and detailed metrics at `/actuator/metrics/resilience4j.circuitbreaker.calls`.

For production systems, export these metrics to your observability platform. With OpenTelemetry, these metrics integrate seamlessly with tools like OneUptime for alerting when circuits open or retry rates spike.

## Putting It All Together

Here is a complete example combining multiple patterns:

```java
@Service
@Slf4j
public class ProductService {

    private final WebClient webClient;

    // Patterns are applied in order: Bulkhead -> RateLimiter -> Retry -> CircuitBreaker
    @Bulkhead(name = "productService")
    @RateLimiter(name = "productService")
    @Retry(name = "productService")
    @CircuitBreaker(name = "productService", fallbackMethod = "getProductFallback")
    public Product getProduct(String productId) {
        log.debug("Fetching product: {}", productId);
        return webClient.get()
            .uri("/products/{id}", productId)
            .retrieve()
            .bodyToMono(Product.class)
            .block();
    }

    private Product getProductFallback(String productId, Exception ex) {
        log.warn("Returning cached product for {}: {}", productId, ex.getMessage());
        return productCache.get(productId);
    }
}
```

## Key Takeaways

Building resilient microservices requires thinking about failure modes upfront:

1. **Use circuit breakers** to prevent cascade failures and give struggling services time to recover
2. **Implement retries with backoff** for transient failures, but skip retries for business logic errors
3. **Apply bulkheads** to isolate critical paths from less important ones
4. **Rate limit** calls to external services to respect their limits and protect your budget
5. **Monitor everything** so you know when patterns activate and can tune thresholds

Start with circuit breakers on all external calls. Add retries for idempotent operations. Layer in bulkheads and rate limiters as you identify bottlenecks. And always, always have fallback behavior defined - even if it is just returning a cached response or a graceful error message.

The goal is not to prevent all failures. That is impossible. The goal is to fail gracefully, recover quickly, and keep your users happy even when parts of your system are struggling.
