# How to Create Custom Metrics with Micrometer

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Java, Spring Boot, Metrics, Monitoring

Description: Add custom application metrics in Spring Boot using Micrometer with counters, gauges, timers, and distribution summaries for comprehensive observability.

---

Micrometer is the metrics instrumentation library that powers Spring Boot's metrics subsystem. It provides a vendor-neutral API for recording metrics, letting you switch between monitoring backends like Prometheus, Datadog, or InfluxDB without changing your instrumentation code.

This guide covers how to create custom metrics in Spring Boot applications, from basic counters to complex distribution summaries.

## Why Custom Metrics Matter

Auto-instrumented metrics from Spring Boot Actuator cover the basics - JVM memory, HTTP request counts, and database connection pools. But they do not capture your business logic.

Custom metrics answer questions like:
- How many orders were placed in the last hour?
- What is the 99th percentile of payment processing time?
- How many items are currently in the shopping cart queue?
- What is the distribution of order values?

## Setting Up Micrometer with Prometheus

Add these dependencies to your `pom.xml`:

```xml
<dependencies>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-actuator</artifactId>
    </dependency>
    <dependency>
        <groupId>io.micrometer</groupId>
        <artifactId>micrometer-registry-prometheus</artifactId>
    </dependency>
</dependencies>
```

Configure `application.yml` to expose the Prometheus metrics endpoint:

```yaml
management:
  endpoints:
    web:
      exposure:
        include: prometheus, health, info, metrics
  metrics:
    export:
      prometheus:
        enabled: true
    tags:
      application: ${spring.application.name}
      environment: ${ENVIRONMENT:development}
```

After starting your application, metrics are available at `/actuator/prometheus`.

## Understanding Meter Types

Micrometer provides four core meter types. Each serves a specific purpose.

| Meter Type | Use Case | Examples |
|------------|----------|----------|
| **Counter** | Counts events that only increase | Requests processed, orders placed, errors occurred |
| **Gauge** | Tracks values that can increase or decrease | Queue size, active connections, temperature |
| **Timer** | Measures duration of events | Request latency, processing time, API call duration |
| **Distribution Summary** | Measures distribution of values (not time) | Request payload size, order amounts, batch sizes |

## Working with MeterRegistry

`MeterRegistry` is the central component for creating and managing meters. Spring Boot auto-configures a composite registry that publishes to all enabled backends.

For better performance, create meters once during initialization:

```java
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Service;

@Service
public class PaymentService {

    private final MeterRegistry meterRegistry;
    private Counter paymentSuccessCounter;
    private Counter paymentFailureCounter;
    private Timer paymentProcessingTimer;

    public PaymentService(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
    }

    @PostConstruct
    public void initMetrics() {
        paymentSuccessCounter = Counter.builder("payments.success")
            .description("Number of successful payments")
            .register(meterRegistry);

        paymentFailureCounter = Counter.builder("payments.failure")
            .description("Number of failed payments")
            .register(meterRegistry);

        paymentProcessingTimer = Timer.builder("payments.processing.time")
            .description("Payment processing duration")
            .register(meterRegistry);
    }
}
```

## Counter - Tracking Cumulative Values

Counters track values that only increase. They reset to zero when the application restarts.

```java
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.stereotype.Service;

@Service
public class OrderService {

    private final Counter ordersCreatedCounter;
    private final Counter ordersFailedCounter;

    public OrderService(MeterRegistry meterRegistry) {
        this.ordersCreatedCounter = Counter.builder("orders.created.total")
            .description("Total number of orders created")
            .register(meterRegistry);

        this.ordersFailedCounter = Counter.builder("orders.failed.total")
            .description("Total number of failed order attempts")
            .register(meterRegistry);
    }

    public Order createOrder(OrderRequest request) {
        try {
            Order order = processOrder(request);
            ordersCreatedCounter.increment();
            return order;
        } catch (Exception e) {
            ordersFailedCounter.increment();
            throw e;
        }
    }
}
```

### Counter with Tags

Tags add context to metrics. They allow filtering and grouping in your monitoring system.

```java
@Service
public class NotificationService {

    private final MeterRegistry meterRegistry;

    public NotificationService(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
    }

    public void sendNotification(String type, String channel) {
        boolean success = doSendNotification(type, channel);

        // Counter with dynamic tags - creates separate time series per combination
        Counter.builder("notifications.sent.total")
            .description("Total notifications sent")
            .tag("type", type)           // email, sms, push
            .tag("channel", channel)     // marketing, transactional
            .tag("status", success ? "success" : "failure")
            .register(meterRegistry)
            .increment();
    }
}
```

## Gauge - Tracking Current State

Gauges represent a value that can go up or down. Unlike counters, gauges sample the current value when scraped.

```java
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Component
public class QueueMetrics {

    private final AtomicInteger queueSize = new AtomicInteger(0);
    private final Map<String, UserSession> activeSessions = new ConcurrentHashMap<>();

    public QueueMetrics(MeterRegistry meterRegistry) {
        // Gauge observes the AtomicInteger value on each scrape
        Gauge.builder("queue.size", queueSize, AtomicInteger::get)
            .description("Current number of items in the processing queue")
            .register(meterRegistry);

        // Gauge directly observes the map size
        Gauge.builder("sessions.active", activeSessions, Map::size)
            .description("Number of active user sessions")
            .register(meterRegistry);
    }

    public void enqueue(Item item) {
        queueSize.incrementAndGet();
    }

    public Item dequeue() {
        queueSize.decrementAndGet();
        return item;
    }
}
```

## Timer - Measuring Duration

Timers measure the duration and frequency of events. They record both the count and total time.

```java
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.springframework.stereotype.Service;

@Service
public class ExternalApiService {

    private final Timer apiCallTimer;

    public ExternalApiService(MeterRegistry meterRegistry) {
        this.apiCallTimer = Timer.builder("external.api.call.duration")
            .description("Duration of external API calls")
            .register(meterRegistry);
    }

    public ApiResponse callExternalApi(ApiRequest request) {
        // record() wraps the call and measures its duration
        return apiCallTimer.record(() -> {
            return httpClient.post(request);
        });
    }
}
```

### Timer with Manual Start/Stop

For more control over timing boundaries:

```java
@Service
public class OrderProcessor {

    private final Timer processingTimer;

    public OrderProcessor(MeterRegistry meterRegistry) {
        this.processingTimer = Timer.builder("order.processing.duration")
            .description("Order processing duration")
            .register(meterRegistry);
    }

    public void processOrder(Order order) {
        Timer.Sample sample = Timer.start();

        try {
            validateOrder(order);
            reserveInventory(order);
            processPayment(order);
        } finally {
            sample.stop(processingTimer);
        }
    }
}
```

### Timer with Percentile Histograms

Configure timers to publish percentile data for Prometheus:

```java
import java.time.Duration;

@Service
public class PaymentGatewayService {

    private final Timer paymentTimer;

    public PaymentGatewayService(MeterRegistry meterRegistry) {
        this.paymentTimer = Timer.builder("payment.gateway.duration")
            .description("Payment gateway response time")
            .tag("gateway", "stripe")
            .publishPercentileHistogram()
            .publishPercentiles(0.5, 0.75, 0.95, 0.99)
            .serviceLevelObjectives(
                Duration.ofMillis(100),
                Duration.ofMillis(500),
                Duration.ofSeconds(1)
            )
            .minimumExpectedValue(Duration.ofMillis(10))
            .maximumExpectedValue(Duration.ofSeconds(10))
            .register(meterRegistry);
    }

    public PaymentResult processPayment(PaymentRequest request) {
        return paymentTimer.record(() -> paymentGateway.charge(request));
    }
}
```

### Using @Timed Annotation

Micrometer provides an annotation for declarative timing:

```java
import io.micrometer.core.annotation.Timed;
import org.springframework.stereotype.Service;

@Service
public class ReportService {

    @Timed(
        value = "report.generation.duration",
        description = "Report generation time",
        percentiles = {0.5, 0.95, 0.99},
        histogram = true
    )
    public Report generateReport(ReportRequest request) {
        return buildReport(request);
    }
}
```

Enable the annotation by registering the aspect:

```java
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

## Distribution Summary - Non-Time Distributions

Distribution summaries track the distribution of values that are not durations.

```java
import io.micrometer.core.instrument.DistributionSummary;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.stereotype.Service;

@Service
public class OrderAnalyticsService {

    private final DistributionSummary orderValueSummary;

    public OrderAnalyticsService(MeterRegistry meterRegistry) {
        this.orderValueSummary = DistributionSummary
            .builder("order.value")
            .description("Distribution of order values")
            .baseUnit("usd")
            .publishPercentileHistogram()
            .publishPercentiles(0.5, 0.9, 0.95, 0.99)
            .serviceLevelObjectives(10, 50, 100, 250, 500, 1000)
            .register(meterRegistry);
    }

    public void recordOrder(Order order) {
        orderValueSummary.record(order.getTotalAmount().doubleValue());
    }
}
```

## Metric Naming Conventions

Consistent naming makes metrics discoverable and queryable.

| Rule | Good Example | Bad Example |
|------|--------------|-------------|
| Use lowercase | `http.requests.total` | `HTTP.Requests.Total` |
| Use dots as separators | `order.processing.time` | `order_processing_time` |
| Include unit in name | `http.request.duration.seconds` | `http.request.duration` |
| End counters with total | `payment.failed.total` | `payment.failed.count` |
| Be specific | `db.query.duration` | `duration` |

## Tags and Dimensions Best Practices

Tags add dimensions to metrics but increase cardinality. High cardinality leads to memory issues.

```java
// Good: bounded, low cardinality tags
.tag("status", "success")           // limited values
.tag("method", "GET")               // limited values
.tag("environment", "production")   // single value per deployment

// Bad: unbounded, high cardinality tags
.tag("user_id", userId)             // millions of unique values
.tag("order_id", orderId)           // unbounded
.tag("request_id", requestId)       // unique per request
```

When you need dynamic values, bucket them into categories:

```java
private String categorizeStatus(int statusCode) {
    if (statusCode >= 200 && statusCode < 300) return "2xx";
    if (statusCode >= 300 && statusCode < 400) return "3xx";
    if (statusCode >= 400 && statusCode < 500) return "4xx";
    if (statusCode >= 500) return "5xx";
    return "other";
}
```

## Prometheus Queries for Custom Metrics

After setting up metrics, query them in Prometheus:

```promql
# Orders per second (rate over 5 minutes)
rate(orders_created_total[5m])

# 99th percentile checkout duration
histogram_quantile(0.99, rate(payment_gateway_duration_seconds_bucket[5m]))

# Average checkout duration
rate(payment_gateway_duration_seconds_sum[5m]) / rate(payment_gateway_duration_seconds_count[5m])

# Median order value
histogram_quantile(0.5, rate(order_value_bucket[5m]))

# Current queue size
queue_size
```

## Grafana Dashboard Configuration

Create Grafana panels to visualize your metrics:

```json
{
  "panels": [
    {
      "title": "Orders Per Minute",
      "type": "stat",
      "targets": [{
        "expr": "sum(rate(orders_created_total[5m])) * 60"
      }]
    },
    {
      "title": "Payment Duration (p99)",
      "type": "gauge",
      "targets": [{
        "expr": "histogram_quantile(0.99, rate(payment_gateway_duration_seconds_bucket[5m]))"
      }],
      "fieldConfig": {
        "defaults": {
          "unit": "s",
          "thresholds": {
            "steps": [
              {"value": 0, "color": "green"},
              {"value": 2, "color": "yellow"},
              {"value": 5, "color": "red"}
            ]
          }
        }
      }
    }
  ]
}
```

## Complete Example: E-Commerce Metrics

Here is a complete example showing all meter types working together:

```java
import io.micrometer.core.instrument.*;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.concurrent.atomic.AtomicInteger;

@Service
public class ECommerceMetricsService {

    private final MeterRegistry meterRegistry;
    private final AtomicInteger cartItemCount = new AtomicInteger(0);

    private Counter ordersPlacedCounter;
    private Timer checkoutTimer;
    private DistributionSummary orderValueSummary;

    public ECommerceMetricsService(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
    }

    @PostConstruct
    public void initializeMetrics() {
        ordersPlacedCounter = Counter.builder("ecommerce.orders.placed.total")
            .description("Total number of orders placed")
            .register(meterRegistry);

        Gauge.builder("ecommerce.cart.items", cartItemCount, AtomicInteger::get)
            .description("Current number of items across all shopping carts")
            .register(meterRegistry);

        checkoutTimer = Timer.builder("ecommerce.checkout.duration")
            .description("Checkout process duration")
            .publishPercentileHistogram()
            .publishPercentiles(0.5, 0.95, 0.99)
            .serviceLevelObjectives(
                Duration.ofMillis(500),
                Duration.ofSeconds(1),
                Duration.ofSeconds(2)
            )
            .register(meterRegistry);

        orderValueSummary = DistributionSummary.builder("ecommerce.order.value")
            .description("Distribution of order values")
            .baseUnit("usd")
            .publishPercentileHistogram()
            .publishPercentiles(0.5, 0.75, 0.9, 0.95)
            .register(meterRegistry);
    }

    public Order placeOrder(OrderRequest request) {
        return checkoutTimer.record(() -> {
            Order order = processOrder(request);

            ordersPlacedCounter.increment();
            orderValueSummary.record(order.getTotalAmount());
            cartItemCount.addAndGet(-order.getItems().size());

            return order;
        });
    }

    public void addToCart(String productId, int quantity) {
        cartItemCount.addAndGet(quantity);
    }

    public void removeFromCart(String productId, int quantity) {
        cartItemCount.addAndGet(-quantity);
    }

    public void recordOrderByType(Order order) {
        Counter.builder("ecommerce.orders.by.type.total")
            .description("Orders by type")
            .tag("type", order.getType())
            .tag("channel", order.getChannel())
            .register(meterRegistry)
            .increment();
    }
}
```

## Common Pitfalls and Solutions

| Problem | Cause | Solution |
|---------|-------|----------|
| High memory usage | Too many unique tag combinations | Limit cardinality, bucket dynamic values |
| Missing metrics | Meter not registered | Register at startup, not on first use |
| Zero values | Counter reset on restart | Use rate() in Prometheus, not raw values |
| Wrong percentiles | Bucket boundaries mismatch | Configure SLO buckets matching your data |
| Metrics not exposed | Endpoint not enabled | Check management.endpoints.web.exposure |

## Summary

Micrometer provides a powerful abstraction for application metrics in Spring Boot:

- **Counters** track cumulative values like request counts and errors
- **Gauges** observe current state like queue depths and connection counts
- **Timers** measure duration and frequency of operations
- **Distribution Summaries** track distributions of non-time values

Key practices:
- Register meters at startup for better performance
- Follow naming conventions for discoverability
- Use bounded tags to control cardinality
- Configure percentile histograms for SLO tracking
- Query with Prometheus and visualize in Grafana

Custom metrics transform your monitoring from infrastructure-only to business-aware observability. They enable SLOs based on real user experience and help you understand what your application actually does, not just how it runs.

For more on observability, see our guides on [the three pillars of observability](https://oneuptime.com/blog/post/2025-08-20-three-pillars-of-observability-logs-metrics-traces/view) and [OpenTelemetry instrumentation](https://oneuptime.com/blog/post/2026-01-06-nodejs-express-opentelemetry-instrumentation/view).
