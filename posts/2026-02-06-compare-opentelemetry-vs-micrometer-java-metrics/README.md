# How to Compare OpenTelemetry vs Micrometer for Java Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Micrometer, Java, Metrics, Spring Boot, Observability

Description: A practical comparison of OpenTelemetry and Micrometer for Java application metrics, covering APIs, Spring Boot integration, and migration considerations.

---

If you are building Java applications, especially with Spring Boot, you have likely encountered Micrometer. It has been the default metrics facade in the Spring ecosystem since Spring Boot 2.0. Now OpenTelemetry offers its own metrics API and SDK for Java. Both libraries let you create counters, gauges, histograms, and timers, but they come from different worlds. This article compares them so you can decide which fits your project.

## Background

Micrometer was created by the Spring team as a "metrics facade" similar to what SLF4J is for logging. It provides a clean API that abstracts away the details of the metrics backend. You write instrumentation code once, and Micrometer handles exporting to Prometheus, Datadog, CloudWatch, or dozens of other systems through registry implementations.

OpenTelemetry's Java metrics API is part of the broader OpenTelemetry specification. It handles not just metrics but also traces and logs through a unified SDK. The metrics API follows OpenTelemetry's semantic conventions and data model.

## API Comparison

Here is how you create and use a counter in each library.

Micrometer:

```java
// Micrometer counter example
// Uses the MeterRegistry abstraction for backend flexibility
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;

public class OrderService {
    private final Counter ordersProcessed;
    private final Counter ordersFailed;

    // Inject the MeterRegistry (auto-configured in Spring Boot)
    public OrderService(MeterRegistry registry) {
        // Create a counter with tags for dimensional metrics
        this.ordersProcessed = Counter.builder("orders.processed")
                .description("Total orders successfully processed")
                .tag("service", "order-service")
                .register(registry);

        this.ordersFailed = Counter.builder("orders.failed")
                .description("Total orders that failed processing")
                .tag("service", "order-service")
                .register(registry);
    }

    public void processOrder(Order order) {
        try {
            // Business logic here
            doProcess(order);
            ordersProcessed.increment();
        } catch (Exception e) {
            ordersFailed.increment();
            throw e;
        }
    }
}
```

OpenTelemetry:

```java
// OpenTelemetry counter example
// Uses the OTel Meter API with Attributes
import io.opentelemetry.api.metrics.LongCounter;
import io.opentelemetry.api.metrics.Meter;
import io.opentelemetry.api.common.Attributes;
import io.opentelemetry.api.GlobalOpenTelemetry;

public class OrderService {
    private final LongCounter ordersProcessed;
    private final LongCounter ordersFailed;

    public OrderService() {
        // Get a Meter from the global OpenTelemetry instance
        Meter meter = GlobalOpenTelemetry.getMeter("order-service", "1.0.0");

        // Create counters with the OTel API
        this.ordersProcessed = meter.counterBuilder("orders.processed")
                .setDescription("Total orders successfully processed")
                .build();

        this.ordersFailed = meter.counterBuilder("orders.failed")
                .setDescription("Total orders that failed processing")
                .build();
    }

    public void processOrder(Order order) {
        Attributes attrs = Attributes.of(
                AttributeKey.stringKey("service"), "order-service"
        );

        try {
            doProcess(order);
            // OTel counters take attributes at recording time
            ordersProcessed.add(1, attrs);
        } catch (Exception e) {
            ordersFailed.add(1, attrs);
            throw e;
        }
    }
}
```

Both APIs are clean and straightforward. The key difference is that Micrometer binds tags at counter creation time, while OpenTelemetry passes attributes at recording time. OpenTelemetry's approach is more flexible but can lead to higher cardinality if you are not careful.

## Histograms and Timers

Micrometer provides a Timer abstraction that combines duration measurement with histogram recording:

```java
// Micrometer Timer for measuring operation duration
// Integrates cleanly with try-with-resources
import io.micrometer.core.instrument.Timer;

public class PaymentService {
    private final Timer paymentTimer;

    public PaymentService(MeterRegistry registry) {
        this.paymentTimer = Timer.builder("payment.processing.duration")
                .description("Time to process a payment")
                .tag("gateway", "stripe")
                // Configure histogram buckets for Prometheus
                .publishPercentileHistogram()
                .minimumExpectedValue(Duration.ofMillis(1))
                .maximumExpectedValue(Duration.ofSeconds(30))
                .register(registry);
    }

    public PaymentResult processPayment(Payment payment) {
        // Timer.record handles timing and recording automatically
        return paymentTimer.record(() -> {
            // The actual payment processing logic
            return gateway.charge(payment);
        });
    }
}
```

OpenTelemetry uses a histogram instrument for the same purpose:

```java
// OpenTelemetry Histogram for measuring operation duration
// Manual timing with explicit recording
import io.opentelemetry.api.metrics.DoubleHistogram;

public class PaymentService {
    private final DoubleHistogram paymentDuration;

    public PaymentService() {
        Meter meter = GlobalOpenTelemetry.getMeter("payment-service");

        this.paymentDuration = meter.histogramBuilder("payment.processing.duration")
                .setDescription("Time to process a payment")
                .setUnit("s")
                // Configure explicit bucket boundaries
                .setExplicitBucketBoundariesAdvice(
                        Arrays.asList(0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1.0, 5.0, 30.0))
                .build();
    }

    public PaymentResult processPayment(Payment payment) {
        long startTime = System.nanoTime();
        try {
            return gateway.charge(payment);
        } finally {
            double duration = (System.nanoTime() - startTime) / 1_000_000_000.0;
            paymentDuration.record(duration, Attributes.of(
                    AttributeKey.stringKey("gateway"), "stripe"
            ));
        }
    }
}
```

Micrometer's Timer is more ergonomic for this common use case. It handles the timing boilerplate for you. OpenTelemetry requires manual timing, which is more verbose but gives you more control.

## Spring Boot Integration

Micrometer is deeply integrated into Spring Boot:

```java
// Spring Boot application with Micrometer (auto-configured)
// Just add the dependency and metrics are available
@SpringBootApplication
public class Application {
    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }
}

// Spring Boot auto-configures these metrics out of the box:
// - JVM metrics (memory, GC, threads)
// - HTTP server metrics (request count, duration)
// - Database connection pool metrics
// - Cache metrics
// - Spring MVC and WebFlux metrics
// - Tomcat/Jetty/Undertow metrics
```

```yaml
# application.yml for Micrometer with Prometheus export
management:
  endpoints:
    web:
      exposure:
        include: prometheus, health, metrics
  metrics:
    tags:
      # Global tags applied to all metrics
      application: order-service
      environment: production
    distribution:
      percentiles-histogram:
        http.server.requests: true
```

OpenTelemetry integration with Spring Boot requires the OpenTelemetry Spring Boot starter:

```xml
<!-- Maven dependency for OTel Spring Boot starter -->
<dependency>
    <groupId>io.opentelemetry.instrumentation</groupId>
    <artifactId>opentelemetry-spring-boot-starter</artifactId>
    <version>2.12.0-alpha</version>
</dependency>
```

```yaml
# application.yml for OpenTelemetry Spring Boot starter
otel:
  service:
    name: order-service
  exporter:
    otlp:
      endpoint: http://otel-collector:4317
  metrics:
    exporter: otlp
  traces:
    exporter: otlp
```

The Micrometer integration is more mature and provides more auto-configured metrics out of the box. The OpenTelemetry starter is improving rapidly but still has some gaps compared to what Micrometer provides automatically.

## The Bridge: Micrometer to OpenTelemetry

Here is the important news: you do not have to choose exclusively. The OpenTelemetry Java agent includes a Micrometer bridge that automatically converts Micrometer metrics into OpenTelemetry metrics:

```java
// When using the OTel Java agent, Micrometer metrics are
// automatically bridged to OpenTelemetry metrics.
// No code changes needed.

// Your existing Micrometer code:
Counter counter = Counter.builder("my.counter")
        .tag("env", "prod")
        .register(registry);
counter.increment();

// The OTel agent intercepts this and creates an equivalent
// OpenTelemetry metric that gets exported via OTLP.
```

This bridge means you can keep all your existing Micrometer instrumentation and still export through the OpenTelemetry pipeline. It is the most pragmatic migration path for existing Spring Boot applications.

## Feature Comparison

| Feature | Micrometer | OpenTelemetry Metrics |
|---------|-----------|----------------------|
| Counter | Yes | Yes |
| Gauge | Yes | Yes (UpDownCounter) |
| Histogram | Yes (Timer, DistSummary) | Yes |
| Timer utility | Built-in | Manual timing |
| Async instruments | Yes (via gauges) | Yes (Observable) |
| Spring Boot auto-config | Excellent | Good (improving) |
| Backend registries | 20+ | Via OTLP (any backend) |
| Traces integration | No (separate concern) | Yes (unified) |
| Logs integration | No (separate concern) | Yes (unified) |
| Semantic conventions | Micrometer conventions | OTel conventions |

## When to Choose Each

Use Micrometer when:

- You have an existing Spring Boot application with Micrometer metrics
- You want the richest auto-configured metrics for the Spring ecosystem
- Your team is familiar with the Micrometer API
- You are using the OTel Java agent (which bridges Micrometer automatically)

Use OpenTelemetry Metrics API when:

- You want a single API for traces, metrics, and logs
- You are building non-Spring Java applications
- Vendor-neutral instrumentation is a requirement
- You want to follow OpenTelemetry semantic conventions across all languages

Use both (the bridge approach) when:

- You want Spring Boot auto-configured metrics via Micrometer
- You want custom business metrics via OpenTelemetry API
- You are migrating incrementally from Micrometer to OpenTelemetry
- You want OTLP export for all metrics

## Conclusion

Micrometer and OpenTelemetry Metrics are both solid choices for Java metrics. The Micrometer bridge in the OTel Java agent makes the choice less binary than it might seem. For Spring Boot applications, keeping Micrometer for framework-level metrics while using the OpenTelemetry API for custom business metrics is a practical approach that gives you the best of both worlds. Over time, as OpenTelemetry's Spring Boot integration matures, the gap will continue to narrow.
