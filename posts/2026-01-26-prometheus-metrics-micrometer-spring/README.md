# How to Export Prometheus Metrics with Micrometer in Spring

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Java, Spring Boot, Prometheus, Micrometer, Metrics, Observability, Monitoring

Description: Learn how to expose Prometheus metrics from Spring Boot applications using Micrometer. This guide covers counters, gauges, timers, histograms, custom metrics, and best practices for production monitoring.

---

Prometheus has become the standard for metrics collection in cloud-native environments. Spring Boot integrates with Prometheus through Micrometer, a metrics facade that provides a vendor-neutral API for collecting application metrics. This guide shows you how to expose metrics that help you understand your application's health and performance.

---

## Setting Up Micrometer with Prometheus

Add the required dependencies to your `pom.xml`:

```xml
<!-- pom.xml -->
<dependencies>
    <!-- Spring Boot Actuator provides health and metrics endpoints -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-actuator</artifactId>
    </dependency>

    <!-- Micrometer registry for Prometheus format -->
    <dependency>
        <groupId>io.micrometer</groupId>
        <artifactId>micrometer-registry-prometheus</artifactId>
    </dependency>
</dependencies>
```

For Gradle users:

```groovy
// build.gradle
dependencies {
    implementation 'org.springframework.boot:spring-boot-starter-actuator'
    implementation 'io.micrometer:micrometer-registry-prometheus'
}
```

Configure the Prometheus endpoint in `application.yml`:

```yaml
# application.yml
management:
  endpoints:
    web:
      exposure:
        include: prometheus,health,info,metrics
  endpoint:
    prometheus:
      enabled: true
    health:
      show-details: always
  metrics:
    export:
      prometheus:
        enabled: true
    tags:
      application: ${spring.application.name}
      environment: ${ENVIRONMENT:development}
```

Your metrics are now available at `/actuator/prometheus` in the format Prometheus expects.

---

## Understanding Metric Types

Micrometer supports four primary metric types, each suited for different measurements:

| Metric Type | Use Case | Example |
|-------------|----------|---------|
| Counter | Cumulative count that only increases | Total requests, errors, items processed |
| Gauge | Point-in-time value that can increase or decrease | Active connections, queue size, memory usage |
| Timer | Duration and count of events | Request latency, method execution time |
| Distribution Summary | Distribution of values | Request sizes, response payload sizes |

---

## Working with Counters

Counters track cumulative values that only go up. They reset when the application restarts, which is normal - Prometheus handles this with the `increase()` and `rate()` functions.

```java
// OrderMetrics.java
// Track order-related business metrics
package com.example.metrics;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.stereotype.Component;

@Component
public class OrderMetrics {

    private final Counter ordersCreated;
    private final Counter ordersFailed;
    private final Counter ordersCompleted;

    public OrderMetrics(MeterRegistry registry) {
        // Create counters with descriptive names and tags
        // Convention: use snake_case and prefix with domain
        this.ordersCreated = Counter.builder("orders_created_total")
            .description("Total number of orders created")
            .tag("application", "order-service")
            .register(registry);

        this.ordersFailed = Counter.builder("orders_failed_total")
            .description("Total number of failed orders")
            .tag("application", "order-service")
            .register(registry);

        this.ordersCompleted = Counter.builder("orders_completed_total")
            .description("Total number of completed orders")
            .tag("application", "order-service")
            .register(registry);
    }

    public void orderCreated() {
        ordersCreated.increment();
    }

    public void orderFailed() {
        ordersFailed.increment();
    }

    public void orderCompleted() {
        ordersCompleted.increment();
    }
}
```

Use counters with dynamic tags for more granular tracking:

```java
// PaymentMetrics.java
// Track payment metrics with dynamic tags for different payment methods
package com.example.metrics;

import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.stereotype.Component;

@Component
public class PaymentMetrics {

    private final MeterRegistry registry;

    public PaymentMetrics(MeterRegistry registry) {
        this.registry = registry;
    }

    // Record payment with dynamic tags
    // Creates separate counter series for each payment method and status
    public void recordPayment(String paymentMethod, String status, double amount) {
        registry.counter("payments_total",
            "method", paymentMethod,    // credit_card, paypal, bank_transfer
            "status", status            // success, failed, pending
        ).increment();

        // Also track payment amounts
        registry.counter("payments_amount_total",
            "method", paymentMethod,
            "status", status
        ).increment(amount);
    }

    // Usage example:
    // paymentMetrics.recordPayment("credit_card", "success", 99.99);
}
```

---

## Working with Gauges

Gauges represent current values that can go up or down. They are useful for measuring things like queue sizes, active connections, or cache sizes.

```java
// SystemMetrics.java
// Track system-level metrics using gauges
package com.example.metrics;

import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.stereotype.Component;

import java.util.concurrent.BlockingQueue;
import java.util.concurrent.atomic.AtomicInteger;

@Component
public class SystemMetrics {

    private final AtomicInteger activeConnections = new AtomicInteger(0);
    private final AtomicInteger pendingTasks = new AtomicInteger(0);

    public SystemMetrics(MeterRegistry registry, BlockingQueue<?> taskQueue) {
        // Gauge that reads from AtomicInteger
        Gauge.builder("active_connections", activeConnections, AtomicInteger::get)
            .description("Number of active client connections")
            .register(registry);

        // Gauge that directly observes a collection size
        Gauge.builder("pending_tasks", taskQueue, BlockingQueue::size)
            .description("Number of tasks waiting to be processed")
            .register(registry);

        // Gauge for JVM memory usage
        Gauge.builder("jvm_memory_used_bytes", Runtime.getRuntime(),
                runtime -> runtime.totalMemory() - runtime.freeMemory())
            .description("JVM memory currently in use")
            .baseUnit("bytes")
            .register(registry);
    }

    public void connectionOpened() {
        activeConnections.incrementAndGet();
    }

    public void connectionClosed() {
        activeConnections.decrementAndGet();
    }

    public void taskAdded() {
        pendingTasks.incrementAndGet();
    }

    public void taskCompleted() {
        pendingTasks.decrementAndGet();
    }
}
```

---

## Working with Timers

Timers measure both the duration and count of events. They are essential for tracking latency and throughput of operations.

```java
// ApiMetrics.java
// Track API request timing and throughput
package com.example.metrics;

import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.concurrent.Callable;
import java.util.function.Supplier;

@Component
public class ApiMetrics {

    private final MeterRegistry registry;

    public ApiMetrics(MeterRegistry registry) {
        this.registry = registry;
    }

    // Create a timer for specific endpoints
    public Timer getEndpointTimer(String endpoint, String method) {
        return Timer.builder("http_request_duration_seconds")
            .description("HTTP request duration in seconds")
            .tag("endpoint", endpoint)
            .tag("method", method)
            .publishPercentiles(0.5, 0.95, 0.99)  // Report p50, p95, p99
            .publishPercentileHistogram()          // Enable histogram buckets
            .serviceLevelObjectives(
                Duration.ofMillis(100),            // SLO: 100ms
                Duration.ofMillis(500),            // SLO: 500ms
                Duration.ofSeconds(1)              // SLO: 1s
            )
            .register(registry);
    }

    // Wrap a callable with timing
    public <T> T timeOperation(String name, Callable<T> operation) throws Exception {
        Timer timer = Timer.builder("operation_duration_seconds")
            .description("Operation duration")
            .tag("operation", name)
            .register(registry);

        return timer.recordCallable(operation);
    }

    // Wrap a supplier with timing (no checked exceptions)
    public <T> T timeSupplier(String name, Supplier<T> supplier) {
        return Timer.builder("operation_duration_seconds")
            .tag("operation", name)
            .register(registry)
            .record(supplier);
    }

    // Record duration manually when you cannot wrap the operation
    public void recordDuration(String operation, Duration duration, String status) {
        Timer.builder("operation_duration_seconds")
            .tag("operation", operation)
            .tag("status", status)
            .register(registry)
            .record(duration);
    }
}
```

---

## Using the @Timed Annotation

Micrometer provides an annotation-based approach for timing methods automatically:

```java
// OrderService.java
// Service with automatic timing via @Timed annotation
package com.example.service;

import io.micrometer.core.annotation.Timed;
import org.springframework.stereotype.Service;

@Service
public class OrderService {

    private final OrderRepository orderRepository;
    private final PaymentService paymentService;

    public OrderService(OrderRepository orderRepository, PaymentService paymentService) {
        this.orderRepository = orderRepository;
        this.paymentService = paymentService;
    }

    // Automatically times this method
    // Creates metric: order_service_create_order_seconds
    @Timed(
        value = "order_service_create_order",
        description = "Time to create an order",
        percentiles = {0.5, 0.95, 0.99}
    )
    public Order createOrder(OrderRequest request) {
        Order order = new Order(request);
        order = orderRepository.save(order);
        paymentService.processPayment(order);
        return order;
    }

    // Timer with extra tags
    @Timed(
        value = "order_service_get_order",
        extraTags = {"layer", "service"}
    )
    public Order getOrder(String orderId) {
        return orderRepository.findById(orderId)
            .orElseThrow(() -> new OrderNotFoundException(orderId));
    }
}
```

Enable the `@Timed` annotation by registering the aspect:

```java
// MetricsConfig.java
// Enable @Timed annotation processing
package com.example.config;

import io.micrometer.core.aop.TimedAspect;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class MetricsConfig {

    // This bean enables @Timed annotation processing
    @Bean
    public TimedAspect timedAspect(MeterRegistry registry) {
        return new TimedAspect(registry);
    }
}
```

---

## Distribution Summaries

Distribution summaries track the distribution of values without timing. They are useful for measuring sizes, counts, or other numeric values.

```java
// RequestMetrics.java
// Track request and response sizes
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
        this.requestSize = DistributionSummary.builder("http_request_size_bytes")
            .description("HTTP request body size in bytes")
            .baseUnit("bytes")
            .publishPercentiles(0.5, 0.95, 0.99)
            .publishPercentileHistogram()
            .serviceLevelObjectives(1024, 10240, 102400)  // 1KB, 10KB, 100KB buckets
            .register(registry);

        // Track response body sizes
        this.responseSize = DistributionSummary.builder("http_response_size_bytes")
            .description("HTTP response body size in bytes")
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

## HTTP Request Metrics Filter

Create a filter to automatically capture metrics for all HTTP requests:

```java
// MetricsFilter.java
// Filter that captures metrics for all HTTP requests
package com.example.filter;

import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class MetricsFilter extends OncePerRequestFilter {

    private final MeterRegistry registry;

    public MetricsFilter(MeterRegistry registry) {
        this.registry = registry;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain chain) throws ServletException, IOException {

        // Skip actuator endpoints to avoid metric explosion
        if (request.getRequestURI().startsWith("/actuator")) {
            chain.doFilter(request, response);
            return;
        }

        Timer.Sample sample = Timer.start(registry);

        try {
            chain.doFilter(request, response);
        } finally {
            // Normalize URI to avoid high cardinality
            // /users/123 becomes /users/{id}
            String normalizedUri = normalizeUri(request.getRequestURI());

            sample.stop(Timer.builder("http_server_requests")
                .description("HTTP server request duration")
                .tag("method", request.getMethod())
                .tag("uri", normalizedUri)
                .tag("status", String.valueOf(response.getStatus()))
                .tag("outcome", getOutcome(response.getStatus()))
                .register(registry));
        }
    }

    // Normalize URIs to prevent cardinality explosion
    // /users/123 -> /users/{id}
    // /orders/abc-def-ghi/items/456 -> /orders/{id}/items/{id}
    private String normalizeUri(String uri) {
        return uri
            .replaceAll("/\\d+", "/{id}")
            .replaceAll("/[a-f0-9-]{36}", "/{uuid}")
            .replaceAll("/[a-zA-Z0-9-]+(?=/|$)", "/{id}");
    }

    private String getOutcome(int status) {
        if (status < 200) return "INFORMATIONAL";
        if (status < 300) return "SUCCESS";
        if (status < 400) return "REDIRECTION";
        if (status < 500) return "CLIENT_ERROR";
        return "SERVER_ERROR";
    }
}
```

---

## Business Metrics

Track business-specific metrics that matter to your domain:

```java
// BusinessMetrics.java
// Domain-specific business metrics
package com.example.metrics;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.DistributionSummary;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.springframework.stereotype.Component;

@Component
public class BusinessMetrics {

    private final MeterRegistry registry;
    private final DistributionSummary orderValue;
    private final Counter revenueCounter;

    public BusinessMetrics(MeterRegistry registry) {
        this.registry = registry;

        // Track order values distribution
        this.orderValue = DistributionSummary.builder("order_value_dollars")
            .description("Order value in dollars")
            .baseUnit("dollars")
            .publishPercentiles(0.5, 0.75, 0.9, 0.95)
            .register(registry);

        // Track total revenue
        this.revenueCounter = Counter.builder("revenue_total_dollars")
            .description("Total revenue in dollars")
            .register(registry);
    }

    // Track user signups by source
    public void userSignedUp(String source, String plan) {
        registry.counter("user_signups_total",
            "source", source,     // organic, paid, referral
            "plan", plan          // free, pro, enterprise
        ).increment();
    }

    // Track order completion with value
    public void orderCompleted(double value, String category) {
        orderValue.record(value);
        revenueCounter.increment(value);

        registry.counter("orders_completed_total",
            "category", category
        ).increment();
    }

    // Track feature usage
    public void featureUsed(String feature, String userId) {
        registry.counter("feature_usage_total",
            "feature", feature
        ).increment();
    }

    // Track subscription changes
    public void subscriptionChanged(String fromPlan, String toPlan) {
        registry.counter("subscription_changes_total",
            "from_plan", fromPlan,
            "to_plan", toPlan
        ).increment();
    }
}
```

---

## Prometheus Scrape Configuration

Configure Prometheus to scrape your Spring Boot application:

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'spring-boot-app'
    metrics_path: '/actuator/prometheus'
    scrape_interval: 15s
    static_configs:
      - targets: ['localhost:8080']
        labels:
          application: 'order-service'
          environment: 'production'

  # For Kubernetes service discovery
  - job_name: 'kubernetes-pods'
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      # Only scrape pods with prometheus.io/scrape annotation
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true
      # Use custom path if specified
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
        action: replace
        target_label: __metrics_path__
        regex: (.+)
```

For Kubernetes deployments, add annotations to your pod spec:

```yaml
# kubernetes deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
spec:
  template:
    metadata:
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/path: "/actuator/prometheus"
        prometheus.io/port: "8080"
```

---

## Best Practices

1. **Use consistent naming** - Follow Prometheus naming conventions: `snake_case`, suffix with unit (e.g., `_seconds`, `_bytes`, `_total`)

2. **Avoid high cardinality** - Do not use unbounded values as tags (user IDs, request IDs). Normalize URIs.

3. **Add meaningful descriptions** - Help future you and your team understand what metrics measure

4. **Use appropriate metric types** - Counters for cumulative values, gauges for current state, timers for duration

5. **Include percentiles for latency** - p50, p95, p99 are more useful than averages

6. **Tag consistently** - Use the same tag names across related metrics

---

## Conclusion

Micrometer makes it straightforward to expose Prometheus metrics from Spring Boot applications. Start with the built-in metrics, add counters and timers for your business operations, and avoid the common pitfall of high-cardinality tags. Well-instrumented applications make debugging and capacity planning much easier.

---

*Good metrics are the foundation of observability. [OneUptime](https://oneuptime.com) can ingest your Prometheus metrics and provide dashboards, alerts, and long-term storage to help you monitor your applications effectively.*

**Related Reading:**
- [How to Implement Circuit Breakers with Resilience4j in Spring](https://oneuptime.com/blog/post/2026-01-25-circuit-breakers-resilience4j-spring/view)
- [How to Add Custom Metrics to Python Applications with Prometheus](https://oneuptime.com/blog/post/2025-01-06-python-custom-metrics-prometheus/view)
