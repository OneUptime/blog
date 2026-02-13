# How to Create Custom Micrometer Metrics in Spring Boot

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Java, Spring Boot, Micrometer, Metrics, Observability, Prometheus, Monitoring, Performance

Description: Learn how to create custom Micrometer metrics in Spring Boot to monitor business KPIs and application performance. This guide covers counters, gauges, timers, and distribution summaries with practical examples.

---

> The default metrics Spring Boot provides are useful, but they only tell part of the story. Custom metrics let you measure what matters to your business: orders processed, payments completed, or cache hit rates. This guide shows you how to create custom Micrometer metrics that give you real visibility into your application.

Micrometer is the metrics facade that Spring Boot uses under the hood. It abstracts away the details of different monitoring systems like Prometheus, Datadog, or CloudWatch, letting you write metrics code once and export to any backend.

---

## Getting Started

### Dependencies

Add the Micrometer dependencies to your `pom.xml`:

```xml
<!-- pom.xml -->
<dependencies>
    <!-- Spring Boot Actuator includes Micrometer -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-actuator</artifactId>
    </dependency>

    <!-- Prometheus registry for exporting metrics -->
    <dependency>
        <groupId>io.micrometer</groupId>
        <artifactId>micrometer-registry-prometheus</artifactId>
    </dependency>
</dependencies>
```

### Configuration

Enable the Prometheus endpoint in `application.yml`:

```yaml
# application.yml
management:
  endpoints:
    web:
      exposure:
        include: health,prometheus,metrics
  metrics:
    tags:
      # Global tags applied to all metrics
      application: ${spring.application.name}
      environment: ${spring.profiles.active:default}
    export:
      prometheus:
        enabled: true
```

---

## Metric Types

Micrometer provides four main metric types, each suited for different use cases.

| Metric Type | Use Case | Example |
|-------------|----------|---------|
| **Counter** | Counts that only increase | Requests processed, errors |
| **Gauge** | Values that can go up or down | Active connections, queue size |
| **Timer** | Duration measurements | Request latency, method execution time |
| **Distribution Summary** | Value distributions | Request sizes, response sizes |

---

## Creating Counters

Counters track values that only increase. They are perfect for counting events like processed orders, failed requests, or user signups.

```java
// OrderMetrics.java
// Custom metrics for order processing
package com.example.metrics;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.stereotype.Component;

@Component
public class OrderMetrics {

    private final Counter ordersPlaced;
    private final Counter ordersCompleted;
    private final Counter ordersFailed;

    public OrderMetrics(MeterRegistry registry) {
        // Counter for orders placed with tags for filtering
        this.ordersPlaced = Counter.builder("orders.placed")
            .description("Total number of orders placed")
            .tag("type", "all")
            .register(registry);

        // Counter for successfully completed orders
        this.ordersCompleted = Counter.builder("orders.completed")
            .description("Total number of orders completed successfully")
            .register(registry);

        // Counter for failed orders
        this.ordersFailed = Counter.builder("orders.failed")
            .description("Total number of failed orders")
            .register(registry);
    }

    // Call this when an order is placed
    public void orderPlaced() {
        ordersPlaced.increment();
    }

    // Call this when an order completes successfully
    public void orderCompleted() {
        ordersCompleted.increment();
    }

    // Call this when an order fails
    public void orderFailed() {
        ordersFailed.increment();
    }
}
```

### Using Counters with Tags

Tags let you slice and dice metrics. For example, you might want to count orders by payment method or product category.

```java
// DynamicOrderMetrics.java
// Counters with dynamic tags
package com.example.metrics;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.stereotype.Component;

@Component
public class DynamicOrderMetrics {

    private final MeterRegistry registry;

    public DynamicOrderMetrics(MeterRegistry registry) {
        this.registry = registry;
    }

    // Track orders by payment method
    public void orderPlaced(String paymentMethod, String region) {
        Counter.builder("orders.placed.detailed")
            .description("Orders placed with payment and region details")
            .tag("payment_method", paymentMethod)  // credit_card, paypal, etc.
            .tag("region", region)  // us-east, eu-west, etc.
            .register(registry)
            .increment();
    }

    // Track order failures by reason
    public void orderFailed(String reason) {
        Counter.builder("orders.failed.detailed")
            .description("Failed orders by failure reason")
            .tag("reason", reason)  // payment_declined, out_of_stock, etc.
            .register(registry)
            .increment();
    }
}
```

---

## Creating Gauges

Gauges track values that can go up or down, like active users, queue depth, or cache size.

```java
// SystemMetrics.java
// Gauges for system state monitoring
package com.example.metrics;

import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.stereotype.Component;

import java.util.concurrent.atomic.AtomicInteger;

@Component
public class SystemMetrics {

    // AtomicInteger for thread-safe gauge updates
    private final AtomicInteger activeConnections = new AtomicInteger(0);
    private final AtomicInteger queueSize = new AtomicInteger(0);

    public SystemMetrics(MeterRegistry registry) {
        // Gauge that tracks active database connections
        Gauge.builder("db.connections.active", activeConnections, AtomicInteger::get)
            .description("Number of active database connections")
            .tag("pool", "primary")
            .register(registry);

        // Gauge that tracks job queue size
        Gauge.builder("jobs.queue.size", queueSize, AtomicInteger::get)
            .description("Number of jobs waiting in the queue")
            .register(registry);
    }

    public void connectionOpened() {
        activeConnections.incrementAndGet();
    }

    public void connectionClosed() {
        activeConnections.decrementAndGet();
    }

    public void jobEnqueued() {
        queueSize.incrementAndGet();
    }

    public void jobDequeued() {
        queueSize.decrementAndGet();
    }
}
```

### Gauges from Collections

You can also create gauges that read from collections directly:

```java
// CacheMetrics.java
// Gauges that read from collections
package com.example.metrics;

import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class CacheMetrics {

    // In-memory cache for demonstration
    private final Map<String, Object> cache = new ConcurrentHashMap<>();

    public CacheMetrics(MeterRegistry registry) {
        // Gauge reads directly from collection size
        Gauge.builder("cache.size", cache, Map::size)
            .description("Number of items in the cache")
            .tag("cache", "primary")
            .register(registry);
    }

    public void put(String key, Object value) {
        cache.put(key, value);
    }

    public Object get(String key) {
        return cache.get(key);
    }

    public void remove(String key) {
        cache.remove(key);
    }
}
```

---

## Creating Timers

Timers measure duration. They automatically track count, total time, and max time, making them ideal for measuring latency.

```java
// PaymentMetrics.java
// Timers for measuring operation duration
package com.example.metrics;

import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.springframework.stereotype.Component;

import java.util.concurrent.Callable;

@Component
public class PaymentMetrics {

    private final Timer paymentProcessingTimer;
    private final Timer fraudCheckTimer;
    private final MeterRegistry registry;

    public PaymentMetrics(MeterRegistry registry) {
        this.registry = registry;

        // Timer for payment processing duration
        this.paymentProcessingTimer = Timer.builder("payment.processing.duration")
            .description("Time taken to process payments")
            .publishPercentiles(0.5, 0.95, 0.99)  // Report p50, p95, p99
            .publishPercentileHistogram()  // Enable histogram for percentile calculations
            .register(registry);

        // Timer for fraud check duration
        this.fraudCheckTimer = Timer.builder("payment.fraud.check.duration")
            .description("Time taken for fraud checks")
            .publishPercentiles(0.5, 0.95, 0.99)
            .register(registry);
    }

    // Time a code block using lambda
    public void processPayment(Runnable paymentLogic) {
        paymentProcessingTimer.record(paymentLogic);
    }

    // Time a code block that returns a value
    public <T> T processPaymentWithResult(Callable<T> paymentLogic) throws Exception {
        return paymentProcessingTimer.recordCallable(paymentLogic);
    }

    // Time fraud check with payment method tag
    public void recordFraudCheck(String paymentMethod, Runnable checkLogic) {
        Timer.builder("payment.fraud.check.duration")
            .description("Time taken for fraud checks")
            .tag("payment_method", paymentMethod)
            .publishPercentiles(0.5, 0.95, 0.99)
            .register(registry)
            .record(checkLogic);
    }
}
```

### Using Timer Samples

For cases where you cannot wrap code in a lambda, use Timer.Sample:

```java
// AsyncOperationMetrics.java
// Timing async operations with Timer.Sample
package com.example.metrics;

import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.springframework.stereotype.Component;

@Component
public class AsyncOperationMetrics {

    private final MeterRegistry registry;

    public AsyncOperationMetrics(MeterRegistry registry) {
        this.registry = registry;
    }

    // Start timing - returns a sample to stop later
    public Timer.Sample startTiming() {
        return Timer.start(registry);
    }

    // Stop timing and record the duration
    public void stopTiming(Timer.Sample sample, String operationType, boolean success) {
        Timer timer = Timer.builder("async.operation.duration")
            .description("Duration of async operations")
            .tag("operation", operationType)
            .tag("success", String.valueOf(success))
            .publishPercentiles(0.5, 0.95, 0.99)
            .register(registry);

        sample.stop(timer);
    }
}
```

---

## Creating Distribution Summaries

Distribution summaries track the distribution of values like request sizes or response times.

```java
// RequestMetrics.java
// Distribution summaries for request/response sizes
package com.example.metrics;

import io.micrometer.core.instrument.DistributionSummary;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.stereotype.Component;

@Component
public class RequestMetrics {

    private final DistributionSummary requestSize;
    private final DistributionSummary responseSize;

    public RequestMetrics(MeterRegistry registry) {
        // Track request body sizes
        this.requestSize = DistributionSummary.builder("http.request.size")
            .description("Size of HTTP request bodies in bytes")
            .baseUnit("bytes")
            .publishPercentiles(0.5, 0.95, 0.99)
            .publishPercentileHistogram()
            .minimumExpectedValue(100.0)  // Expected minimum 100 bytes
            .maximumExpectedValue(10_000_000.0)  // Expected max 10MB
            .register(registry);

        // Track response body sizes
        this.responseSize = DistributionSummary.builder("http.response.size")
            .description("Size of HTTP response bodies in bytes")
            .baseUnit("bytes")
            .publishPercentiles(0.5, 0.95, 0.99)
            .register(registry);
    }

    public void recordRequestSize(long bytes) {
        requestSize.record(bytes);
    }

    public void recordResponseSize(long bytes) {
        responseSize.record(bytes);
    }
}
```

---

## Integration with Services

Here is how to integrate custom metrics into a typical service class:

```java
// OrderService.java
// Service with integrated custom metrics
package com.example.service;

import com.example.metrics.OrderMetrics;
import com.example.metrics.PaymentMetrics;
import io.micrometer.core.instrument.Timer;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class OrderService {

    private static final Logger log = LoggerFactory.getLogger(OrderService.class);

    private final OrderMetrics orderMetrics;
    private final PaymentMetrics paymentMetrics;

    public OrderService(OrderMetrics orderMetrics, PaymentMetrics paymentMetrics) {
        this.orderMetrics = orderMetrics;
        this.paymentMetrics = paymentMetrics;
    }

    public Order createOrder(OrderRequest request) {
        // Record that an order was placed
        orderMetrics.orderPlaced();

        try {
            // Time the payment processing
            paymentMetrics.processPayment(() -> {
                processPayment(request);
            });

            // Record successful completion
            orderMetrics.orderCompleted();

            return new Order(request);

        } catch (PaymentException e) {
            // Record the failure
            orderMetrics.orderFailed();
            log.error("Order failed due to payment error", e);
            throw e;
        }
    }

    private void processPayment(OrderRequest request) {
        // Payment processing logic
    }
}
```

---

## Using @Timed Annotation

For simpler cases, you can use the `@Timed` annotation to automatically time methods:

```java
// AnnotatedService.java
// Using @Timed annotation for automatic timing
package com.example.service;

import io.micrometer.core.annotation.Timed;
import org.springframework.stereotype.Service;

@Service
public class AnnotatedService {

    // Automatically times this method
    @Timed(
        value = "user.registration.duration",
        description = "Time taken to register a user",
        percentiles = {0.5, 0.95, 0.99}
    )
    public User registerUser(RegistrationRequest request) {
        // Registration logic
        validateRequest(request);
        User user = createUser(request);
        sendWelcomeEmail(user);
        return user;
    }

    @Timed(
        value = "email.send.duration",
        description = "Time taken to send emails",
        extraTags = {"type", "welcome"}  // Additional tags
    )
    private void sendWelcomeEmail(User user) {
        // Email sending logic
    }
}
```

Enable `@Timed` annotation support with this configuration:

```java
// MetricsConfig.java
// Enable @Timed annotation support
package com.example.config;

import io.micrometer.core.aop.TimedAspect;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class MetricsConfig {

    @Bean
    public TimedAspect timedAspect(MeterRegistry registry) {
        return new TimedAspect(registry);
    }
}
```

---

## Metrics Architecture

The following diagram shows how custom metrics flow from your application to your monitoring system:

```mermaid
flowchart LR
    subgraph Application
        S[Service] --> M[Custom Metrics]
        M --> MR[MeterRegistry]
    end

    subgraph Micrometer
        MR --> PR[Prometheus Registry]
        MR --> DR[Datadog Registry]
        MR --> CW[CloudWatch Registry]
    end

    subgraph Export
        PR --> PE[/metrics endpoint]
        DR --> DA[Datadog API]
        CW --> AWS[AWS CloudWatch]
    end

    PE --> Prom[Prometheus Server]
    Prom --> Grafana[Grafana Dashboard]

    style S fill:#e3f2fd
    style M fill:#fff3e0
    style MR fill:#e8f5e9
    style Grafana fill:#f3e5f5
```

---

## Best Practices

### 1. Use Meaningful Names

Follow a consistent naming convention:

```java
// Good: Clear hierarchy with dots
Timer.builder("payment.processing.duration")
Counter.builder("orders.placed")
Gauge.builder("cache.items.count")

// Avoid: Inconsistent or unclear names
Timer.builder("paymentTime")
Counter.builder("orderCounter")
```

### 2. Use Tags Wisely

Tags enable filtering but create unique time series. Too many unique tag values cause cardinality explosion.

```java
// Good: Known, bounded values
.tag("status", "success")  // Only "success" or "failure"
.tag("region", "us-east")  // Limited regions

// Avoid: Unbounded values
.tag("user_id", userId)  // Millions of users = millions of series
.tag("order_id", orderId)  // Creates new series for every order
```

### 3. Set Appropriate Histogram Buckets

Configure histogram buckets based on your expected value ranges:

```java
Timer.builder("http.request.duration")
    .serviceLevelObjectives(
        Duration.ofMillis(50),   // p50 target
        Duration.ofMillis(100),  // p90 target
        Duration.ofMillis(200)   // p99 target
    )
    .register(registry);
```

### 4. Document Your Metrics

Use descriptions and base units for clarity:

```java
DistributionSummary.builder("file.upload.size")
    .description("Size of uploaded files")
    .baseUnit("bytes")  // Makes unit clear in documentation
    .register(registry);
```

---

## Conclusion

Custom Micrometer metrics give you visibility into what your application is actually doing. Key points:

- Use **counters** for events that only increase
- Use **gauges** for values that fluctuate
- Use **timers** for measuring duration and latency
- Use **distribution summaries** for value distributions
- Keep tag cardinality under control

With good custom metrics, you can answer questions like "How many orders per minute?" or "What is our p99 payment latency?" without digging through logs.

---

*Want to visualize your custom metrics? [OneUptime](https://oneuptime.com) provides dashboards and alerting for Micrometer metrics, helping you turn raw numbers into actionable insights.*

**Related Reading:**
- [How to Add Custom Metrics to Python Applications with Prometheus](https://oneuptime.com/blog/post/2025-01-06-python-custom-metrics-prometheus/view)
- [Basics of Profiling](https://oneuptime.com/blog/post/2025-09-09-basics-of-profiling/view)
