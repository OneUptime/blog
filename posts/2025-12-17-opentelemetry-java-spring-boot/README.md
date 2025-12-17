# OpenTelemetry for Java and Spring Boot: A Complete Instrumentation Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Java, Spring Boot, Observability, Tracing, Metrics, Micrometer

Description: A comprehensive guide to instrumenting Java and Spring Boot applications with OpenTelemetry- from zero-code auto-instrumentation with the Java agent to manual spans, Micrometer metrics integration, and production-ready configurations.

---

> Java powers enterprise systems worldwide. OpenTelemetry's Java instrumentation provides both zero-code auto-instrumentation via a Java agent and fine-grained manual control when you need it.

This guide covers instrumenting Java applications with OpenTelemetry, with special focus on Spring Boot integration, the Java agent, manual instrumentation, and Micrometer metrics bridging.

---

## Table of Contents

1. Why OpenTelemetry for Java?
2. Auto-Instrumentation with Java Agent
3. Spring Boot Starter Integration
4. Manual Instrumentation
5. Micrometer Integration
6. Database Instrumentation
7. HTTP Client Tracing
8. Async and Reactive Tracing
9. Custom Metrics
10. Structured Logging with Trace Context
11. Sampling Configuration
12. Production Deployment
13. Performance Tuning
14. Common Patterns and Best Practices

---

## 1. Why OpenTelemetry for Java?

| Benefit | Description |
|---------|-------------|
| Zero-code option | Java agent instruments without code changes |
| Spring native | First-class Spring Boot integration |
| Micrometer bridge | Leverage existing Micrometer metrics |
| Comprehensive coverage | 100+ auto-instrumented libraries |
| Vendor neutral | Export to any OTLP-compatible backend |

---

## 2. Auto-Instrumentation with Java Agent

The fastest path to observability- no code changes required.

### Download the agent

```bash
# Download latest agent
curl -L -o opentelemetry-javaagent.jar \
  https://github.com/open-telemetry/opentelemetry-java-instrumentation/releases/latest/download/opentelemetry-javaagent.jar
```

### Run with agent

```bash
java -javaagent:opentelemetry-javaagent.jar \
     -Dotel.service.name=my-java-service \
     -Dotel.exporter.otlp.endpoint=https://oneuptime.com/otlp \
     -Dotel.exporter.otlp.headers=x-oneuptime-token=your-token \
     -Dotel.traces.sampler=parentbased_traceidratio \
     -Dotel.traces.sampler.arg=0.1 \
     -jar myapp.jar
```

### Environment variables (alternative)

```bash
export OTEL_SERVICE_NAME=my-java-service
export OTEL_EXPORTER_OTLP_ENDPOINT=https://oneuptime.com/otlp
export OTEL_EXPORTER_OTLP_HEADERS=x-oneuptime-token=your-token
export OTEL_TRACES_SAMPLER=parentbased_traceidratio
export OTEL_TRACES_SAMPLER_ARG=0.1
export OTEL_METRICS_EXPORTER=otlp
export OTEL_LOGS_EXPORTER=otlp

java -javaagent:opentelemetry-javaagent.jar -jar myapp.jar
```

### Auto-instrumented libraries

The agent automatically instruments:
- Spring Web MVC and WebFlux
- Spring Data JPA, JDBC
- Hibernate
- Apache HttpClient, OkHttp
- gRPC
- Kafka, RabbitMQ
- Redis (Jedis, Lettuce)
- MongoDB
- Elasticsearch
- And 100+ more

---

## 3. Spring Boot Starter Integration

For more control, use the Spring Boot starters.

### pom.xml

```xml
<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>io.opentelemetry</groupId>
            <artifactId>opentelemetry-bom</artifactId>
            <version>1.34.0</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
        <dependency>
            <groupId>io.opentelemetry.instrumentation</groupId>
            <artifactId>opentelemetry-instrumentation-bom-alpha</artifactId>
            <version>1.34.0-alpha</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
    </dependencies>
</dependencyManagement>

<dependencies>
    <!-- Spring Boot OpenTelemetry Starter -->
    <dependency>
        <groupId>io.opentelemetry.instrumentation</groupId>
        <artifactId>opentelemetry-spring-boot-starter</artifactId>
    </dependency>

    <!-- OTLP Exporter -->
    <dependency>
        <groupId>io.opentelemetry</groupId>
        <artifactId>opentelemetry-exporter-otlp</artifactId>
    </dependency>

    <!-- Micrometer Bridge (optional) -->
    <dependency>
        <groupId>io.opentelemetry.instrumentation</groupId>
        <artifactId>opentelemetry-micrometer-1.5</artifactId>
    </dependency>
</dependencies>
```

### application.yml

```yaml
spring:
  application:
    name: order-service

otel:
  service:
    name: ${spring.application.name}
  exporter:
    otlp:
      endpoint: https://oneuptime.com/otlp
      headers:
        x-oneuptime-token: ${ONEUPTIME_TOKEN}
  traces:
    sampler: parentbased_traceidratio
    sampler.arg: 0.1
  resource:
    attributes:
      deployment.environment: ${ENVIRONMENT:development}
      service.version: ${SERVICE_VERSION:1.0.0}

management:
  tracing:
    sampling:
      probability: 0.1
```

### OtelConfig.java

```java
package com.example.config;

import io.opentelemetry.api.OpenTelemetry;
import io.opentelemetry.api.common.Attributes;
import io.opentelemetry.api.trace.Tracer;
import io.opentelemetry.api.metrics.Meter;
import io.opentelemetry.exporter.otlp.http.trace.OtlpHttpSpanExporter;
import io.opentelemetry.exporter.otlp.http.metrics.OtlpHttpMetricExporter;
import io.opentelemetry.sdk.OpenTelemetrySdk;
import io.opentelemetry.sdk.resources.Resource;
import io.opentelemetry.sdk.trace.SdkTracerProvider;
import io.opentelemetry.sdk.trace.export.BatchSpanProcessor;
import io.opentelemetry.sdk.trace.samplers.Sampler;
import io.opentelemetry.sdk.metrics.SdkMeterProvider;
import io.opentelemetry.sdk.metrics.export.PeriodicMetricReader;
import io.opentelemetry.semconv.ResourceAttributes;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;

@Configuration
public class OtelConfig {

    @Value("${otel.service.name:java-service}")
    private String serviceName;

    @Value("${otel.exporter.otlp.endpoint:https://oneuptime.com/otlp}")
    private String otlpEndpoint;

    @Value("${ONEUPTIME_TOKEN:}")
    private String oneuptimeToken;

    @Value("${otel.traces.sampler.arg:0.1}")
    private double samplingRate;

    @Bean
    public OpenTelemetry openTelemetry() {
        Resource resource = Resource.getDefault()
            .merge(Resource.create(Attributes.builder()
                .put(ResourceAttributes.SERVICE_NAME, serviceName)
                .put(ResourceAttributes.SERVICE_VERSION, "1.0.0")
                .put(ResourceAttributes.DEPLOYMENT_ENVIRONMENT, "production")
                .build()));

        // Trace exporter
        OtlpHttpSpanExporter spanExporter = OtlpHttpSpanExporter.builder()
            .setEndpoint(otlpEndpoint + "/v1/traces")
            .addHeader("x-oneuptime-token", oneuptimeToken)
            .build();

        SdkTracerProvider tracerProvider = SdkTracerProvider.builder()
            .setResource(resource)
            .addSpanProcessor(BatchSpanProcessor.builder(spanExporter)
                .setScheduleDelay(Duration.ofSeconds(5))
                .setMaxExportBatchSize(512)
                .build())
            .setSampler(Sampler.parentBased(Sampler.traceIdRatioBased(samplingRate)))
            .build();

        // Metric exporter
        OtlpHttpMetricExporter metricExporter = OtlpHttpMetricExporter.builder()
            .setEndpoint(otlpEndpoint + "/v1/metrics")
            .addHeader("x-oneuptime-token", oneuptimeToken)
            .build();

        SdkMeterProvider meterProvider = SdkMeterProvider.builder()
            .setResource(resource)
            .registerMetricReader(PeriodicMetricReader.builder(metricExporter)
                .setInterval(Duration.ofMinutes(1))
                .build())
            .build();

        return OpenTelemetrySdk.builder()
            .setTracerProvider(tracerProvider)
            .setMeterProvider(meterProvider)
            .buildAndRegisterGlobal();
    }

    @Bean
    public Tracer tracer(OpenTelemetry openTelemetry) {
        return openTelemetry.getTracer(serviceName);
    }

    @Bean
    public Meter meter(OpenTelemetry openTelemetry) {
        return openTelemetry.getMeter(serviceName);
    }
}
```

---

## 4. Manual Instrumentation

### Basic span creation

```java
package com.example.service;

import io.opentelemetry.api.trace.Span;
import io.opentelemetry.api.trace.SpanKind;
import io.opentelemetry.api.trace.StatusCode;
import io.opentelemetry.api.trace.Tracer;
import io.opentelemetry.context.Context;
import io.opentelemetry.context.Scope;
import org.springframework.stereotype.Service;

@Service
public class OrderService {

    private final Tracer tracer;

    public OrderService(Tracer tracer) {
        this.tracer = tracer;
    }

    public OrderResult processOrder(Order order) {
        Span span = tracer.spanBuilder("order.process")
            .setSpanKind(SpanKind.INTERNAL)
            .setAttribute("order.id", order.getId())
            .setAttribute("order.items", order.getItems().size())
            .setAttribute("order.total", order.getTotal())
            .startSpan();

        try (Scope scope = span.makeCurrent()) {
            // Validation
            validateOrder(order);

            // Payment
            PaymentResult payment = processPayment(order);
            span.setAttribute("payment.id", payment.getId());

            // Fulfillment
            fulfillOrder(order);

            span.addEvent("order.completed");
            span.setStatus(StatusCode.OK);

            return new OrderResult(order.getId(), payment.getId(), "completed");

        } catch (Exception e) {
            span.recordException(e);
            span.setStatus(StatusCode.ERROR, e.getMessage());
            throw e;
        } finally {
            span.end();
        }
    }

    private void validateOrder(Order order) {
        Span span = tracer.spanBuilder("order.validate")
            .startSpan();

        try (Scope scope = span.makeCurrent()) {
            if (order.getItems().isEmpty()) {
                throw new IllegalArgumentException("Order has no items");
            }
            span.addEvent("validation.passed");
        } catch (Exception e) {
            span.recordException(e);
            span.setStatus(StatusCode.ERROR, e.getMessage());
            throw e;
        } finally {
            span.end();
        }
    }

    private PaymentResult processPayment(Order order) {
        Span span = tracer.spanBuilder("payment.process")
            .setSpanKind(SpanKind.CLIENT)
            .setAttribute("payment.amount", order.getTotal())
            .setAttribute("payment.currency", "USD")
            .startSpan();

        try (Scope scope = span.makeCurrent()) {
            // Call payment gateway
            PaymentResult result = paymentGateway.charge(order.getTotal());
            span.setAttribute("payment.transaction_id", result.getTransactionId());
            return result;
        } catch (Exception e) {
            span.recordException(e);
            span.setStatus(StatusCode.ERROR, e.getMessage());
            throw e;
        } finally {
            span.end();
        }
    }
}
```

### Annotation-based tracing with Spring AOP

```java
package com.example.aspect;

import io.opentelemetry.api.trace.Span;
import io.opentelemetry.api.trace.StatusCode;
import io.opentelemetry.api.trace.Tracer;
import io.opentelemetry.context.Scope;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.stereotype.Component;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface Traced {
    String value() default "";
}

@Aspect
@Component
public class TracingAspect {

    private final Tracer tracer;

    public TracingAspect(Tracer tracer) {
        this.tracer = tracer;
    }

    @Around("@annotation(traced)")
    public Object traceMethod(ProceedingJoinPoint joinPoint, Traced traced) throws Throwable {
        String spanName = traced.value().isEmpty()
            ? joinPoint.getSignature().getDeclaringType().getSimpleName() + "." + joinPoint.getSignature().getName()
            : traced.value();

        Span span = tracer.spanBuilder(spanName).startSpan();

        try (Scope scope = span.makeCurrent()) {
            Object result = joinPoint.proceed();
            span.setStatus(StatusCode.OK);
            return result;
        } catch (Throwable t) {
            span.recordException(t);
            span.setStatus(StatusCode.ERROR, t.getMessage());
            throw t;
        } finally {
            span.end();
        }
    }
}

// Usage
@Service
public class UserService {

    @Traced("user.fetch")
    public User getUser(String userId) {
        // Implementation
        return userRepository.findById(userId);
    }

    @Traced
    public List<User> searchUsers(String query) {
        // Span name will be "UserService.searchUsers"
        return userRepository.search(query);
    }
}
```

---

## 5. Micrometer Integration

Bridge existing Micrometer metrics to OpenTelemetry.

```java
package com.example.config;

import io.micrometer.core.instrument.MeterRegistry;
import io.opentelemetry.api.OpenTelemetry;
import io.opentelemetry.instrumentation.micrometer.v1_5.OpenTelemetryMeterRegistry;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class MicrometerConfig {

    @Bean
    public MeterRegistry meterRegistry(OpenTelemetry openTelemetry) {
        return OpenTelemetryMeterRegistry.builder(openTelemetry).build();
    }
}
```

### Using Micrometer metrics

```java
package com.example.service;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.springframework.stereotype.Service;

@Service
public class PaymentService {

    private final Counter paymentsTotal;
    private final Counter paymentsFailedTotal;
    private final Timer paymentDuration;

    public PaymentService(MeterRegistry registry) {
        this.paymentsTotal = Counter.builder("payments.total")
            .description("Total payment attempts")
            .register(registry);

        this.paymentsFailedTotal = Counter.builder("payments.failed.total")
            .description("Failed payment attempts")
            .register(registry);

        this.paymentDuration = Timer.builder("payments.duration")
            .description("Payment processing duration")
            .register(registry);
    }

    public PaymentResult processPayment(PaymentRequest request) {
        return paymentDuration.record(() -> {
            try {
                paymentsTotal.increment();
                PaymentResult result = gateway.charge(request);
                return result;
            } catch (Exception e) {
                paymentsFailedTotal.increment();
                throw e;
            }
        });
    }
}
```

---

## 6. Database Instrumentation

### JPA/Hibernate (auto-instrumented with agent)

When using the Java agent, JPA/Hibernate queries are automatically traced. For manual setup:

```java
package com.example.repository;

import io.opentelemetry.api.trace.Span;
import io.opentelemetry.api.trace.SpanKind;
import io.opentelemetry.api.trace.Tracer;
import io.opentelemetry.context.Scope;
import io.opentelemetry.semconv.SemanticAttributes;
import org.springframework.stereotype.Repository;

import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;

@Repository
public class UserRepository {

    @PersistenceContext
    private EntityManager entityManager;

    private final Tracer tracer;

    public UserRepository(Tracer tracer) {
        this.tracer = tracer;
    }

    public User findById(String id) {
        Span span = tracer.spanBuilder("db.query.users.select")
            .setSpanKind(SpanKind.CLIENT)
            .setAttribute(SemanticAttributes.DB_SYSTEM, "postgresql")
            .setAttribute(SemanticAttributes.DB_NAME, "mydb")
            .setAttribute(SemanticAttributes.DB_OPERATION, "SELECT")
            .setAttribute(SemanticAttributes.DB_SQL_TABLE, "users")
            .startSpan();

        try (Scope scope = span.makeCurrent()) {
            User user = entityManager.find(User.class, id);
            span.setAttribute("db.rows.found", user != null);
            return user;
        } catch (Exception e) {
            span.recordException(e);
            throw e;
        } finally {
            span.end();
        }
    }
}
```

### JDBC Template instrumentation

```java
package com.example.repository;

import io.opentelemetry.api.trace.Span;
import io.opentelemetry.api.trace.SpanKind;
import io.opentelemetry.api.trace.Tracer;
import io.opentelemetry.context.Scope;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class OrderRepository {

    private final JdbcTemplate jdbcTemplate;
    private final Tracer tracer;

    public OrderRepository(JdbcTemplate jdbcTemplate, Tracer tracer) {
        this.jdbcTemplate = jdbcTemplate;
        this.tracer = tracer;
    }

    public List<Order> findByUserId(String userId) {
        String sql = "SELECT * FROM orders WHERE user_id = ?";

        Span span = tracer.spanBuilder("db.query.orders.select")
            .setSpanKind(SpanKind.CLIENT)
            .setAttribute("db.system", "postgresql")
            .setAttribute("db.operation", "SELECT")
            .startSpan();

        try (Scope scope = span.makeCurrent()) {
            List<Order> orders = jdbcTemplate.query(sql, orderRowMapper, userId);
            span.setAttribute("db.rows.returned", orders.size());
            return orders;
        } finally {
            span.end();
        }
    }
}
```

---

## 7. HTTP Client Tracing

### RestTemplate

```java
package com.example.config;

import io.opentelemetry.api.OpenTelemetry;
import io.opentelemetry.instrumentation.spring.web.v3_1.SpringWebTelemetry;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

@Configuration
public class RestTemplateConfig {

    @Bean
    public RestTemplate restTemplate(OpenTelemetry openTelemetry) {
        RestTemplate restTemplate = new RestTemplate();
        SpringWebTelemetry telemetry = SpringWebTelemetry.create(openTelemetry);
        restTemplate.getInterceptors().add(telemetry.newInterceptor());
        return restTemplate;
    }
}
```

### WebClient (reactive)

```java
package com.example.config;

import io.opentelemetry.api.OpenTelemetry;
import io.opentelemetry.instrumentation.spring.webflux.v5_3.SpringWebfluxTelemetry;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
public class WebClientConfig {

    @Bean
    public WebClient webClient(OpenTelemetry openTelemetry) {
        SpringWebfluxTelemetry telemetry = SpringWebfluxTelemetry.create(openTelemetry);
        return WebClient.builder()
            .filter(telemetry.newExchangeFilterFunction())
            .build();
    }
}
```

### Manual HTTP client tracing

```java
package com.example.client;

import io.opentelemetry.api.trace.Span;
import io.opentelemetry.api.trace.SpanKind;
import io.opentelemetry.api.trace.StatusCode;
import io.opentelemetry.api.trace.Tracer;
import io.opentelemetry.context.Context;
import io.opentelemetry.context.Scope;
import io.opentelemetry.context.propagation.TextMapPropagator;
import io.opentelemetry.context.propagation.TextMapSetter;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

@Component
public class PaymentGatewayClient {

    private final RestTemplate restTemplate;
    private final Tracer tracer;
    private final TextMapPropagator propagator;

    public PaymentGatewayClient(RestTemplate restTemplate, Tracer tracer, OpenTelemetry openTelemetry) {
        this.restTemplate = restTemplate;
        this.tracer = tracer;
        this.propagator = openTelemetry.getPropagators().getTextMapPropagator();
    }

    public PaymentResponse charge(double amount) {
        Span span = tracer.spanBuilder("payment.gateway.charge")
            .setSpanKind(SpanKind.CLIENT)
            .setAttribute("http.method", "POST")
            .setAttribute("http.url", "https://payments.example.com/charge")
            .setAttribute("payment.amount", amount)
            .startSpan();

        try (Scope scope = span.makeCurrent()) {
            HttpHeaders headers = new HttpHeaders();

            // Inject trace context into headers
            propagator.inject(Context.current(), headers, HttpHeaders::add);

            HttpEntity<PaymentRequest> entity = new HttpEntity<>(
                new PaymentRequest(amount), headers
            );

            ResponseEntity<PaymentResponse> response = restTemplate.exchange(
                "https://payments.example.com/charge",
                HttpMethod.POST,
                entity,
                PaymentResponse.class
            );

            span.setAttribute("http.status_code", response.getStatusCodeValue());
            return response.getBody();

        } catch (Exception e) {
            span.recordException(e);
            span.setStatus(StatusCode.ERROR, e.getMessage());
            throw e;
        } finally {
            span.end();
        }
    }
}
```

---

## 8. Async and Reactive Tracing

### @Async methods

```java
package com.example.service;

import io.opentelemetry.api.trace.Span;
import io.opentelemetry.api.trace.Tracer;
import io.opentelemetry.context.Context;
import io.opentelemetry.context.Scope;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.concurrent.CompletableFuture;

@Service
public class NotificationService {

    private final Tracer tracer;

    public NotificationService(Tracer tracer) {
        this.tracer = tracer;
    }

    @Async
    public CompletableFuture<Void> sendNotification(String userId, String message, Context parentContext) {
        // Restore parent context in async thread
        try (Scope scope = parentContext.makeCurrent()) {
            Span span = tracer.spanBuilder("notification.send")
                .startSpan();

            try (Scope spanScope = span.makeCurrent()) {
                span.setAttribute("user.id", userId);
                // Send notification
                emailService.send(userId, message);
                return CompletableFuture.completedFuture(null);
            } finally {
                span.end();
            }
        }
    }
}

// Caller
public void processOrder(Order order) {
    // Capture current context
    Context currentContext = Context.current();

    // Pass context to async method
    notificationService.sendNotification(
        order.getUserId(),
        "Your order is confirmed",
        currentContext
    );
}
```

### WebFlux reactive tracing

```java
package com.example.controller;

import io.opentelemetry.api.trace.Span;
import io.opentelemetry.api.trace.Tracer;
import io.opentelemetry.context.Context;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

@RestController
public class UserController {

    private final UserService userService;
    private final Tracer tracer;

    @GetMapping("/users/{id}")
    public Mono<User> getUser(@PathVariable String id) {
        return Mono.deferContextual(ctx -> {
            // Extract OpenTelemetry context from Reactor context
            Context otelContext = ctx.getOrDefault(Context.class, Context.current());

            Span span = tracer.spanBuilder("user.fetch")
                .setParent(otelContext)
                .startSpan();

            return userService.findById(id)
                .doOnSuccess(user -> {
                    span.setAttribute("user.found", user != null);
                    span.end();
                })
                .doOnError(error -> {
                    span.recordException(error);
                    span.end();
                });
        });
    }
}
```

---

## 9. Custom Metrics

```java
package com.example.metrics;

import io.opentelemetry.api.common.AttributeKey;
import io.opentelemetry.api.common.Attributes;
import io.opentelemetry.api.metrics.DoubleHistogram;
import io.opentelemetry.api.metrics.LongCounter;
import io.opentelemetry.api.metrics.LongUpDownCounter;
import io.opentelemetry.api.metrics.Meter;
import org.springframework.stereotype.Component;

import javax.annotation.PostConstruct;

@Component
public class OrderMetrics {

    private final Meter meter;
    private LongCounter ordersCreated;
    private LongCounter ordersFailed;
    private DoubleHistogram orderValue;
    private LongUpDownCounter ordersInProcess;

    public OrderMetrics(Meter meter) {
        this.meter = meter;
    }

    @PostConstruct
    public void init() {
        ordersCreated = meter.counterBuilder("orders.created.total")
            .setDescription("Total orders created")
            .setUnit("1")
            .build();

        ordersFailed = meter.counterBuilder("orders.failed.total")
            .setDescription("Total orders failed")
            .setUnit("1")
            .build();

        orderValue = meter.histogramBuilder("orders.value")
            .setDescription("Distribution of order values")
            .setUnit("USD")
            .build();

        ordersInProcess = meter.upDownCounterBuilder("orders.in_process")
            .setDescription("Orders currently being processed")
            .setUnit("1")
            .build();
    }

    public void recordOrderCreated(String orderType, String region, double value) {
        Attributes attrs = Attributes.of(
            AttributeKey.stringKey("order.type"), orderType,
            AttributeKey.stringKey("order.region"), region
        );

        ordersCreated.add(1, attrs);
        orderValue.record(value, attrs);
    }

    public void recordOrderFailed(String orderType, String reason) {
        Attributes attrs = Attributes.of(
            AttributeKey.stringKey("order.type"), orderType,
            AttributeKey.stringKey("failure.reason"), reason
        );

        ordersFailed.add(1, attrs);
    }

    public void incrementInProcess() {
        ordersInProcess.add(1);
    }

    public void decrementInProcess() {
        ordersInProcess.add(-1);
    }
}
```

---

## 10. Structured Logging with Trace Context

### Logback with trace injection

```xml
<!-- logback-spring.xml -->
<configuration>
    <appender name="JSON" class="ch.qos.logback.core.ConsoleAppender">
        <encoder class="net.logstash.logback.encoder.LogstashEncoder">
            <provider class="net.logstash.logback.composite.loggingevent.LoggingEventPatternJsonProvider">
                <pattern>
                    {
                        "trace_id": "%mdc{trace_id}",
                        "span_id": "%mdc{span_id}"
                    }
                </pattern>
            </provider>
        </encoder>
    </appender>

    <root level="INFO">
        <appender-ref ref="JSON"/>
    </root>
</configuration>
```

### MDC trace context injection

```java
package com.example.filter;

import io.opentelemetry.api.trace.Span;
import io.opentelemetry.api.trace.SpanContext;
import org.slf4j.MDC;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import javax.servlet.FilterChain;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;

@Component
public class TraceContextFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        try {
            Span currentSpan = Span.current();
            SpanContext spanContext = currentSpan.getSpanContext();

            if (spanContext.isValid()) {
                MDC.put("trace_id", spanContext.getTraceId());
                MDC.put("span_id", spanContext.getSpanId());
            }

            filterChain.doFilter(request, response);
        } finally {
            MDC.remove("trace_id");
            MDC.remove("span_id");
        }
    }
}

// Usage in code
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class OrderService {
    private static final Logger log = LoggerFactory.getLogger(OrderService.class);

    public void processOrder(Order order) {
        // trace_id and span_id automatically included in logs
        log.info("Processing order: {}", order.getId());
    }
}
```

---

## 11. Sampling Configuration

### Via system properties

```bash
# Ratio-based sampling (10%)
-Dotel.traces.sampler=parentbased_traceidratio
-Dotel.traces.sampler.arg=0.1

# Always sample
-Dotel.traces.sampler=always_on

# Never sample
-Dotel.traces.sampler=always_off
```

### Programmatic sampling

```java
import io.opentelemetry.sdk.trace.samplers.Sampler;

// Ratio-based
Sampler ratioSampler = Sampler.traceIdRatioBased(0.1);

// Parent-based with fallback
Sampler productionSampler = Sampler.parentBased(
    Sampler.traceIdRatioBased(0.1)
);

// Custom sampler
public class ErrorBiasedSampler implements Sampler {
    private final Sampler baseSampler;

    public ErrorBiasedSampler(double ratio) {
        this.baseSampler = Sampler.traceIdRatioBased(ratio);
    }

    @Override
    public SamplingResult shouldSample(Context parentContext, String traceId,
                                       String name, SpanKind spanKind,
                                       Attributes attributes, List<LinkData> links) {
        // Always sample errors
        if (attributes.get(AttributeKey.booleanKey("error")) == Boolean.TRUE) {
            return SamplingResult.recordAndSample();
        }

        return baseSampler.shouldSample(parentContext, traceId, name, spanKind, attributes, links);
    }

    @Override
    public String getDescription() {
        return "ErrorBiasedSampler";
    }
}
```

---

## 12. Production Deployment

### Dockerfile with Java agent

```dockerfile
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

# Download OpenTelemetry Java agent
ADD https://github.com/open-telemetry/opentelemetry-java-instrumentation/releases/latest/download/opentelemetry-javaagent.jar /app/opentelemetry-javaagent.jar

COPY target/*.jar app.jar

ENV JAVA_TOOL_OPTIONS="-javaagent:/app/opentelemetry-javaagent.jar"

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
```

### Kubernetes deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: java-service
spec:
  template:
    spec:
      containers:
        - name: app
          image: my-java-service:latest
          env:
            - name: OTEL_SERVICE_NAME
              value: "java-service"
            - name: OTEL_EXPORTER_OTLP_ENDPOINT
              value: "http://otel-collector.monitoring:4317"
            - name: ONEUPTIME_TOKEN
              valueFrom:
                secretKeyRef:
                  name: oneuptime-credentials
                  key: token
            - name: OTEL_RESOURCE_ATTRIBUTES
              value: "k8s.pod.name=$(POD_NAME),k8s.namespace.name=$(POD_NAMESPACE)"
            - name: POD_NAME
              valueFrom:
                fieldRef:
                  fieldPath: metadata.name
            - name: POD_NAMESPACE
              valueFrom:
                fieldRef:
                  fieldPath: metadata.namespace
            - name: JAVA_TOOL_OPTIONS
              value: "-javaagent:/app/opentelemetry-javaagent.jar"
          resources:
            limits:
              memory: "1Gi"
              cpu: "1000m"
```

---

## 13. Performance Tuning

### Batch processor configuration

```java
BatchSpanProcessor.builder(spanExporter)
    .setScheduleDelay(Duration.ofSeconds(5))    // Flush interval
    .setMaxExportBatchSize(512)                  // Max spans per batch
    .setMaxQueueSize(2048)                       // Internal queue size
    .setExporterTimeout(Duration.ofSeconds(30)) // Export timeout
    .build();
```

### Agent configuration for performance

```bash
# Reduce instrumentation overhead
-Dotel.instrumentation.common.default-enabled=false
-Dotel.instrumentation.spring-web.enabled=true
-Dotel.instrumentation.jdbc.enabled=true

# Increase batch sizes
-Dotel.bsp.schedule.delay=5000
-Dotel.bsp.max.export.batch.size=1024
-Dotel.bsp.max.queue.size=4096
```

---

## 14. Common Patterns and Best Practices

| Pattern | Description |
|---------|-------------|
| Initialize early | Configure OpenTelemetry before Spring context loads |
| Use annotations | `@Traced` annotation for cleaner code |
| Propagate context | Pass `Context` explicitly in async operations |
| Set status on error | Always `span.setStatus(StatusCode.ERROR)` on failures |
| Use semantic conventions | Standard attribute names for interoperability |
| Sample appropriately | 10% base + tail sampling for errors |

### Error handling pattern

```java
public Result doWork() {
    Span span = tracer.spanBuilder("operation").startSpan();
    try (Scope scope = span.makeCurrent()) {
        Result result = performWork();
        span.setStatus(StatusCode.OK);
        return result;
    } catch (Exception e) {
        span.recordException(e);
        span.setStatus(StatusCode.ERROR, e.getMessage());
        throw e;
    } finally {
        span.end();
    }
}
```

---

## Summary

| Approach | Use Case |
|----------|----------|
| Java Agent | Zero-code instrumentation, fastest to deploy |
| Spring Boot Starter | Spring-native with programmatic control |
| Manual instrumentation | Fine-grained control over spans |
| Micrometer bridge | Leverage existing metrics infrastructure |

Java's OpenTelemetry ecosystem provides flexible options from zero-code auto-instrumentation to deep manual control. Start with the Java agent for immediate visibility, then add manual spans for business-critical paths.

---

*Ready to observe your Java services? Send telemetry to [OneUptime](https://oneuptime.com) and correlate traces with metrics and logs.*

---

### See Also

- [What are Traces and Spans in OpenTelemetry](/blog/post/2025-08-27-traces-and-spans-in-opentelemetry/)
- [OpenTelemetry Collector: What It Is and When You Need It](/blog/post/2025-09-18-what-is-opentelemetry-collector-and-why-use-one/)
- [Database Tracing with OpenTelemetry](/blog/post/2025-12-17-opentelemetry-database-tracing/)
