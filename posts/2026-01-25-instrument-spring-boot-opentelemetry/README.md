# How to Instrument Spring Boot with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Java, Spring Boot, OpenTelemetry, Observability, Tracing

Description: A hands-on guide to adding OpenTelemetry instrumentation to Spring Boot applications, covering auto-instrumentation, custom spans, and exporting traces to observability backends.

---

Getting visibility into what your Spring Boot application does in production is not optional. When requests slow down or errors spike, you need traces that show exactly where time is spent and what went wrong. OpenTelemetry has become the standard for this kind of instrumentation, and Spring Boot makes it relatively straightforward to get started.

This guide walks through instrumenting a Spring Boot application with OpenTelemetry, from zero-config auto-instrumentation to custom spans for your business logic.

## Why OpenTelemetry for Spring Boot?

Spring Boot applications often become the backbone of microservices architectures. A single user request might touch your API gateway, authentication service, multiple backend services, and several databases. Without distributed tracing, debugging production issues becomes guesswork.

OpenTelemetry provides vendor-neutral instrumentation. You can send traces to Jaeger, Zipkin, Datadog, or any OTLP-compatible backend without changing your application code. If you decide to switch observability vendors later, your instrumentation stays the same.

## The Quick Path: Auto-Instrumentation with the Java Agent

The fastest way to instrument a Spring Boot application is with the OpenTelemetry Java agent. This approach requires zero code changes - you just attach the agent when starting your application.

### Download the Agent

```bash
# Download the latest OpenTelemetry Java agent
curl -L -o opentelemetry-javaagent.jar \
  https://github.com/open-telemetry/opentelemetry-java-instrumentation/releases/latest/download/opentelemetry-javaagent.jar
```

### Run Your Application with the Agent

```bash
java -javaagent:opentelemetry-javaagent.jar \
  -Dotel.service.name=my-spring-app \
  -Dotel.exporter.otlp.endpoint=http://localhost:4317 \
  -jar my-spring-app.jar
```

That's it. The agent automatically instruments Spring MVC controllers, RestTemplate, WebClient, JDBC, and dozens of other libraries. You get traces for every HTTP request, database query, and outbound HTTP call without writing a single line of instrumentation code.

### Configuration via Environment Variables

For production deployments, environment variables are cleaner than command-line flags:

```bash
export OTEL_SERVICE_NAME=order-service
export OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4317
export OTEL_RESOURCE_ATTRIBUTES=deployment.environment=production,service.version=1.2.3

java -javaagent:opentelemetry-javaagent.jar -jar my-spring-app.jar
```

## The SDK Approach: Programmatic Instrumentation

When you need more control over instrumentation, use the OpenTelemetry SDK directly. This approach requires more setup but gives you fine-grained control over what gets traced and how.

### Add Dependencies

Add these dependencies to your `pom.xml`:

```xml
<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>io.opentelemetry</groupId>
            <artifactId>opentelemetry-bom</artifactId>
            <version>1.35.0</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
    </dependencies>
</dependencyManagement>

<dependencies>
    <!-- OpenTelemetry API and SDK -->
    <dependency>
        <groupId>io.opentelemetry</groupId>
        <artifactId>opentelemetry-api</artifactId>
    </dependency>
    <dependency>
        <groupId>io.opentelemetry</groupId>
        <artifactId>opentelemetry-sdk</artifactId>
    </dependency>
    <dependency>
        <groupId>io.opentelemetry</groupId>
        <artifactId>opentelemetry-exporter-otlp</artifactId>
    </dependency>
    <dependency>
        <groupId>io.opentelemetry</groupId>
        <artifactId>opentelemetry-sdk-extension-autoconfigure</artifactId>
    </dependency>

    <!-- Spring Boot starter for OpenTelemetry (Spring Boot 3.x) -->
    <dependency>
        <groupId>io.opentelemetry.instrumentation</groupId>
        <artifactId>opentelemetry-spring-boot-starter</artifactId>
        <version>2.1.0</version>
    </dependency>
</dependencies>
```

### Configure OpenTelemetry in application.yml

```yaml
otel:
  service:
    name: order-service
  exporter:
    otlp:
      endpoint: http://localhost:4317
  resource:
    attributes:
      deployment.environment: ${ENVIRONMENT:development}
      service.version: ${APP_VERSION:1.0.0}

# Enable trace context propagation
spring:
  application:
    name: order-service
```

### Create a Configuration Class

```java
import io.opentelemetry.api.OpenTelemetry;
import io.opentelemetry.api.trace.Tracer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenTelemetryConfig {

    // The OpenTelemetry instance is auto-configured by the starter
    // This bean makes the tracer available for injection
    @Bean
    public Tracer tracer(OpenTelemetry openTelemetry) {
        return openTelemetry.getTracer("order-service");
    }
}
```

## Creating Custom Spans

Auto-instrumentation captures HTTP requests and database calls, but your business logic often needs explicit spans. Custom spans help you understand where time goes within a request.

### Basic Span Creation

```java
import io.opentelemetry.api.trace.Span;
import io.opentelemetry.api.trace.Tracer;
import io.opentelemetry.context.Scope;
import org.springframework.stereotype.Service;

@Service
public class OrderService {

    private final Tracer tracer;
    private final PaymentClient paymentClient;
    private final InventoryClient inventoryClient;

    public OrderService(Tracer tracer, PaymentClient paymentClient,
                        InventoryClient inventoryClient) {
        this.tracer = tracer;
        this.paymentClient = paymentClient;
        this.inventoryClient = inventoryClient;
    }

    public Order createOrder(OrderRequest request) {
        // Start a span for the entire order creation process
        Span span = tracer.spanBuilder("createOrder")
            .setAttribute("order.customer_id", request.getCustomerId())
            .setAttribute("order.item_count", request.getItems().size())
            .startSpan();

        // Use try-with-resources to ensure the span is properly closed
        try (Scope scope = span.makeCurrent()) {
            // Validate the order
            validateOrder(request);

            // Reserve inventory
            reserveInventory(request.getItems());

            // Process payment
            PaymentResult payment = processPayment(request);

            // Create the order record
            Order order = saveOrder(request, payment);

            span.setAttribute("order.id", order.getId());
            span.setAttribute("order.total", order.getTotal().doubleValue());

            return order;

        } catch (Exception e) {
            // Record the exception on the span
            span.recordException(e);
            span.setStatus(io.opentelemetry.api.trace.StatusCode.ERROR,
                          e.getMessage());
            throw e;
        } finally {
            span.end();
        }
    }

    private void validateOrder(OrderRequest request) {
        Span span = tracer.spanBuilder("validateOrder").startSpan();
        try (Scope scope = span.makeCurrent()) {
            // Validation logic here
            if (request.getItems().isEmpty()) {
                throw new IllegalArgumentException("Order must have items");
            }
        } finally {
            span.end();
        }
    }

    private void reserveInventory(List<OrderItem> items) {
        Span span = tracer.spanBuilder("reserveInventory")
            .setAttribute("inventory.item_count", items.size())
            .startSpan();
        try (Scope scope = span.makeCurrent()) {
            inventoryClient.reserve(items);
        } finally {
            span.end();
        }
    }

    private PaymentResult processPayment(OrderRequest request) {
        Span span = tracer.spanBuilder("processPayment")
            .setAttribute("payment.method", request.getPaymentMethod())
            .startSpan();
        try (Scope scope = span.makeCurrent()) {
            return paymentClient.charge(request.getPaymentDetails());
        } catch (PaymentException e) {
            span.recordException(e);
            span.setStatus(io.opentelemetry.api.trace.StatusCode.ERROR);
            throw e;
        } finally {
            span.end();
        }
    }
}
```

### Using Annotations for Cleaner Code

The OpenTelemetry Spring Boot starter supports annotations that reduce boilerplate:

```java
import io.opentelemetry.instrumentation.annotations.SpanAttribute;
import io.opentelemetry.instrumentation.annotations.WithSpan;
import org.springframework.stereotype.Service;

@Service
public class UserService {

    @WithSpan("fetchUser")
    public User getUser(@SpanAttribute("user.id") String userId) {
        // Method body is automatically wrapped in a span
        return userRepository.findById(userId)
            .orElseThrow(() -> new UserNotFoundException(userId));
    }

    @WithSpan
    public List<User> searchUsers(
            @SpanAttribute("search.query") String query,
            @SpanAttribute("search.limit") int limit) {
        return userRepository.search(query, limit);
    }
}
```

## Context Propagation Across Services

When your Spring Boot service calls another service, trace context must propagate so spans are connected into a single trace. The OpenTelemetry instrumentation handles this automatically for RestTemplate and WebClient.

### RestTemplate Configuration

```java
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

@Configuration
public class HttpClientConfig {

    @Bean
    public RestTemplate restTemplate(RestTemplateBuilder builder) {
        // OpenTelemetry auto-instrumentation will add trace headers
        return builder
            .setConnectTimeout(Duration.ofSeconds(5))
            .setReadTimeout(Duration.ofSeconds(30))
            .build();
    }
}
```

### WebClient Configuration

```java
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
public class WebClientConfig {

    @Bean
    public WebClient webClient(WebClient.Builder builder) {
        // Trace context is automatically injected into headers
        return builder
            .baseUrl("http://inventory-service:8080")
            .build();
    }
}
```

## Adding Span Events and Attributes

Span events mark significant points within a span's lifetime. They are useful for recording discrete occurrences like cache hits, retries, or state transitions.

```java
@WithSpan
public Order processOrder(OrderRequest request) {
    Span currentSpan = Span.current();

    // Add an event when validation starts
    currentSpan.addEvent("validation.started");

    validateOrder(request);

    currentSpan.addEvent("validation.completed");

    // Check inventory with event logging
    boolean inStock = checkInventory(request.getItems());
    currentSpan.addEvent("inventory.checked",
        io.opentelemetry.api.common.Attributes.of(
            io.opentelemetry.api.common.AttributeKey.booleanKey("in_stock"),
            inStock
        ));

    if (!inStock) {
        currentSpan.addEvent("inventory.backorder_triggered");
        // Handle backorder
    }

    return createOrderRecord(request);
}
```

## Connecting Logs to Traces

Correlating logs with traces makes debugging much easier. Add trace and span IDs to your log output.

### Logback Configuration

Add this to your `logback-spring.xml`:

```xml
<configuration>
    <appender name="CONSOLE" class="ch.qos.logback.core.ConsoleAppender">
        <encoder>
            <pattern>
                %d{yyyy-MM-dd HH:mm:ss.SSS} [%thread] %-5level %logger{36}
                [traceId=%X{trace_id} spanId=%X{span_id}] - %msg%n
            </pattern>
        </encoder>
    </appender>

    <root level="INFO">
        <appender-ref ref="CONSOLE"/>
    </root>
</configuration>
```

The OpenTelemetry instrumentation automatically populates the MDC with trace context when you include the logging instrumentation.

## Production Considerations

### Sampling

In production, you probably do not want to capture every single trace. Sampling reduces overhead and storage costs while still providing visibility.

```yaml
otel:
  traces:
    sampler:
      # Sample 10% of traces
      probability: 0.1
```

For more sophisticated sampling, you can sample all errors and a percentage of successful requests:

```java
import io.opentelemetry.sdk.trace.samplers.Sampler;

@Bean
public Sampler sampler() {
    return Sampler.parentBased(
        Sampler.traceIdRatioBased(0.1)  // 10% sampling for root spans
    );
}
```

### Resource Attributes

Add deployment context to all your telemetry:

```yaml
otel:
  resource:
    attributes:
      service.name: order-service
      service.namespace: ecommerce
      deployment.environment: production
      service.version: 2.1.0
      host.name: ${HOSTNAME}
      k8s.pod.name: ${POD_NAME:unknown}
```

## Testing Your Instrumentation

Before deploying, verify your instrumentation works locally. Run an OpenTelemetry Collector and Jaeger for visualization:

```yaml
# docker-compose.yml
services:
  otel-collector:
    image: otel/opentelemetry-collector:latest
    ports:
      - "4317:4317"    # OTLP gRPC
      - "4318:4318"    # OTLP HTTP
    volumes:
      - ./otel-config.yaml:/etc/otelcol/config.yaml

  jaeger:
    image: jaegertracing/all-in-one:latest
    ports:
      - "16686:16686"  # Jaeger UI
```

Hit your endpoints and watch traces appear in the Jaeger UI at `http://localhost:16686`.

## Wrapping Up

OpenTelemetry instrumentation in Spring Boot ranges from zero-effort auto-instrumentation to detailed custom spans. Start with the Java agent to get immediate visibility, then add custom spans where you need deeper insight into business logic.

The key points to remember: attach the Java agent for automatic instrumentation of frameworks and libraries, use `@WithSpan` annotations for clean custom instrumentation, and always propagate context when calling other services. With these patterns, you will have the observability foundation needed to debug and optimize your Spring Boot applications in production.
