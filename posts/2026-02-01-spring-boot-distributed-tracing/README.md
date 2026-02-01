# How to Implement Distributed Tracing in Spring Boot

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Java, Spring Boot, Distributed Tracing, Micrometer, OpenTelemetry, Observability

Description: A practical guide to implementing distributed tracing in Spring Boot using Micrometer Tracing and OpenTelemetry.

---

When you have a single monolithic application, debugging is straightforward. You check the logs, find the error, and fix it. But in a microservices architecture, a single user request might touch five, ten, or even twenty different services. When something goes wrong, figuring out where the problem occurred becomes a nightmare.

Distributed tracing solves this by giving you a complete picture of how requests flow through your system. Each request gets a unique trace ID that follows it across all services, letting you see the entire journey from start to finish.

In this guide, we will implement distributed tracing in Spring Boot using Micrometer Tracing with OpenTelemetry. By the end, you will have a working setup that captures traces, propagates context between services, and exports data to backends like Zipkin or Jaeger.

## Understanding the Building Blocks

Before diving into code, let's clarify the key concepts:

- **Trace**: The complete journey of a request through your system
- **Span**: A single unit of work within a trace (e.g., a database query or HTTP call)
- **Trace ID**: A unique identifier shared by all spans in a trace
- **Span ID**: A unique identifier for each individual span
- **Parent Span ID**: Links child spans to their parent, creating a hierarchy
- **Baggage**: Key-value pairs that propagate across service boundaries

Spring Boot 3.x uses Micrometer Tracing as its tracing facade. Think of Micrometer Tracing like SLF4J for logging - it provides a common API while letting you choose the underlying implementation. We will use OpenTelemetry as our tracer implementation.

## Project Setup

Let's start with a fresh Spring Boot project. Add these dependencies to your `pom.xml`:

```xml
<!-- Core dependencies for Spring Boot web application with tracing support -->
<dependencies>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    
    <!-- Actuator provides production-ready features including tracing endpoints -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-actuator</artifactId>
    </dependency>
    
    <!-- Micrometer Tracing bridge for OpenTelemetry - connects Spring's tracing API to OTel -->
    <dependency>
        <groupId>io.micrometer</groupId>
        <artifactId>micrometer-tracing-bridge-otel</artifactId>
    </dependency>
    
    <!-- OpenTelemetry exporter for OTLP protocol - sends traces to collectors -->
    <dependency>
        <groupId>io.opentelemetry</groupId>
        <artifactId>opentelemetry-exporter-otlp</artifactId>
    </dependency>
</dependencies>
```

If you prefer Gradle, here is the equivalent:

```groovy
// Build.gradle dependencies for distributed tracing
dependencies {
    implementation 'org.springframework.boot:spring-boot-starter-web'
    implementation 'org.springframework.boot:spring-boot-starter-actuator'
    implementation 'io.micrometer:micrometer-tracing-bridge-otel'
    implementation 'io.opentelemetry:opentelemetry-exporter-otlp'
}
```

## Basic Configuration

Configure your tracing settings in `application.yml`:

```yaml
# Application identification - this name appears in your tracing backend
spring:
  application:
    name: order-service

# Tracing configuration
management:
  tracing:
    # Sample 100% of requests in development - reduce this in production
    sampling:
      probability: 1.0
  # Configure OTLP exporter endpoint
  otlp:
    tracing:
      endpoint: http://localhost:4318/v1/traces

# Include trace IDs in logs for correlation
logging:
  pattern:
    level: "%5p [${spring.application.name:},%X{traceId:-},%X{spanId:-}]"
```

The sampling probability determines what percentage of traces get recorded. Setting it to 1.0 captures everything, which is useful for development but can overwhelm your storage in production. Start with 0.1 (10%) in production and adjust based on your needs.

## Automatic Instrumentation

One of the best things about Spring Boot's tracing support is that many things work automatically. Once you add the dependencies and configuration, Spring automatically traces:

- Incoming HTTP requests to your controllers
- Outgoing HTTP calls made with RestTemplate or WebClient
- Database queries (with additional configuration)
- Message queue operations

Here is a simple controller that gets traced automatically:

```java
// Spring automatically creates spans for incoming HTTP requests
@RestController
@RequestMapping("/api/orders")
public class OrderController {
    
    private final OrderService orderService;
    
    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }
    
    // This endpoint automatically gets a span with HTTP method, path, and status
    @GetMapping("/{orderId}")
    public Order getOrder(@PathVariable String orderId) {
        return orderService.findOrder(orderId);
    }
    
    @PostMapping
    public Order createOrder(@RequestBody OrderRequest request) {
        return orderService.createOrder(request);
    }
}
```

## Creating Custom Spans

Automatic instrumentation covers the basics, but you often need more granular visibility. Use the `Tracer` or `@Observed` annotation to create custom spans.

Using the Tracer directly:

```java
@Service
public class OrderService {
    
    // Inject the Micrometer Tracer - this is the main entry point for manual tracing
    private final Tracer tracer;
    private final InventoryClient inventoryClient;
    private final PaymentClient paymentClient;
    
    public OrderService(Tracer tracer, InventoryClient inventoryClient, 
                        PaymentClient paymentClient) {
        this.tracer = tracer;
        this.inventoryClient = inventoryClient;
        this.paymentClient = paymentClient;
    }
    
    public Order createOrder(OrderRequest request) {
        // Create a new span for the order creation process
        // The span name should describe the operation being performed
        Span orderSpan = tracer.nextSpan().name("create-order");
        
        // Use try-with-resources to ensure the span is properly closed
        try (Tracer.SpanInScope ws = tracer.withSpan(orderSpan.start())) {
            // Add attributes to provide context - these appear as tags in your backend
            orderSpan.tag("order.customer_id", request.getCustomerId());
            orderSpan.tag("order.item_count", String.valueOf(request.getItems().size()));
            
            // Each of these calls will create child spans automatically
            // if the clients are properly instrumented
            boolean available = inventoryClient.checkAvailability(request.getItems());
            if (!available) {
                orderSpan.tag("order.status", "failed");
                orderSpan.event("inventory_check_failed");
                throw new InsufficientInventoryException("Items not available");
            }
            
            PaymentResult payment = paymentClient.processPayment(request.getPaymentInfo());
            
            Order order = saveOrder(request, payment);
            orderSpan.tag("order.id", order.getId());
            orderSpan.tag("order.status", "completed");
            
            return order;
        } catch (Exception e) {
            // Mark the span as errored and record the exception
            orderSpan.error(e);
            throw e;
        } finally {
            // Always end the span, even if an exception occurred
            orderSpan.end();
        }
    }
}
```

The `@Observed` annotation provides a cleaner approach for simple cases:

```java
@Service
public class PaymentService {
    
    // The @Observed annotation creates a span automatically
    // lowCardinalityKeyValues adds tags that won't create too many unique combinations
    @Observed(
        name = "payment.process",
        lowCardinalityKeyValues = {"payment.type", "credit_card"}
    )
    public PaymentResult processPayment(PaymentInfo info) {
        // Your payment logic here
        return executePayment(info);
    }
}
```

For `@Observed` to work, you need to register an ObservedAspect bean:

```java
// Configuration class to enable @Observed annotation support
@Configuration
public class ObservationConfig {
    
    // This aspect intercepts methods annotated with @Observed
    // and creates spans automatically
    @Bean
    public ObservedAspect observedAspect(ObservationRegistry registry) {
        return new ObservedAspect(registry);
    }
}
```

## Trace Context Propagation

When Service A calls Service B, the trace context must be passed along. This happens automatically with RestTemplate and WebClient if you configure them properly.

Setting up an instrumented RestTemplate:

```java
@Configuration
public class RestTemplateConfig {
    
    // RestTemplateBuilder from Spring Boot automatically adds tracing interceptors
    // when micrometer-tracing is on the classpath
    @Bean
    public RestTemplate restTemplate(RestTemplateBuilder builder) {
        return builder
            .setConnectTimeout(Duration.ofSeconds(5))
            .setReadTimeout(Duration.ofSeconds(10))
            .build();
    }
}
```

For WebClient (reactive):

```java
@Configuration
public class WebClientConfig {
    
    // WebClient.Builder is auto-configured with tracing support
    @Bean
    public WebClient webClient(WebClient.Builder builder) {
        return builder
            .baseUrl("http://inventory-service")
            .build();
    }
}
```

The trace context is propagated via HTTP headers. By default, Spring uses the W3C Trace Context format, which adds these headers:

- `traceparent`: Contains trace ID, parent span ID, and trace flags
- `tracestate`: Optional vendor-specific data

## Working with Baggage

Baggage lets you attach data that travels with the trace across all services. This is useful for things like user IDs, tenant IDs, or request correlation IDs.

```java
@Component
public class BaggageService {
    
    private final Tracer tracer;
    
    public BaggageService(Tracer tracer) {
        this.tracer = tracer;
    }
    
    // Add baggage that will propagate to all downstream services
    public void setUserContext(String userId, String tenantId) {
        // Baggage is attached to the current span and propagated automatically
        tracer.createBaggage("user.id", userId);
        tracer.createBaggage("tenant.id", tenantId);
    }
    
    // Read baggage that was set by an upstream service
    public String getCurrentUserId() {
        Baggage baggage = tracer.getBaggage("user.id");
        return baggage != null ? baggage.get() : null;
    }
}
```

Configure which baggage fields to propagate in `application.yml`:

```yaml
# Specify which baggage fields should be propagated to downstream services
management:
  tracing:
    baggage:
      remote-fields:
        - user.id
        - tenant.id
        - request.id
      # Also make baggage available in MDC for logging
      correlation:
        fields:
          - user.id
          - tenant.id
```

## Integrating with Zipkin

Zipkin is a popular open-source distributed tracing system. To send traces to Zipkin instead of using OTLP:

Add the Zipkin reporter dependency:

```xml
<!-- Zipkin reporter sends traces directly to Zipkin server -->
<dependency>
    <groupId>io.zipkin.reporter2</groupId>
    <artifactId>zipkin-reporter-brave</artifactId>
</dependency>

<!-- Use Brave bridge instead of OTel for Zipkin -->
<dependency>
    <groupId>io.micrometer</groupId>
    <artifactId>micrometer-tracing-bridge-brave</artifactId>
</dependency>
```

Configure the Zipkin endpoint:

```yaml
# Zipkin configuration - replace OTLP settings with this
management:
  zipkin:
    tracing:
      endpoint: http://localhost:9411/api/v2/spans
```

Start Zipkin with Docker for local development:

```bash
# Run Zipkin in a container - traces will be available at http://localhost:9411
docker run -d -p 9411:9411 openzipkin/zipkin
```

## Integrating with Jaeger

Jaeger is another popular tracing backend, originally developed by Uber. It supports OTLP natively, so you can use the standard OpenTelemetry configuration:

```yaml
# Jaeger accepts OTLP traces on port 4318 (HTTP) or 4317 (gRPC)
management:
  otlp:
    tracing:
      endpoint: http://localhost:4318/v1/traces
```

Run Jaeger locally:

```bash
# Jaeger all-in-one image includes collector, query, and UI
# UI available at http://localhost:16686
docker run -d --name jaeger \
  -p 16686:16686 \
  -p 4317:4317 \
  -p 4318:4318 \
  jaegertracing/all-in-one:latest
```

## Database Tracing

To trace database queries, add the appropriate instrumentation. For JDBC:

```xml
<!-- Datasource proxy intercepts JDBC calls and creates spans -->
<dependency>
    <groupId>net.ttddyy.observation</groupId>
    <artifactId>datasource-micrometer-spring-boot</artifactId>
    <version>1.0.3</version>
</dependency>
```

This wraps your datasource and automatically creates spans for each query, including the SQL statement and execution time.

## Practical Tips for Production

Here are some lessons learned from running distributed tracing in production:

**Adjust sampling wisely.** Start with a low sampling rate and increase it for specific conditions. You can implement custom samplers that always capture traces for errors or slow requests:

```java
// Custom sampler that captures all errors and samples 10% of successful requests
@Bean
public Sampler customSampler() {
    return new Sampler() {
        @Override
        public SamplingResult shouldSample(
                Context parentContext,
                String traceId,
                String name,
                SpanKind spanKind,
                Attributes attributes,
                List<LinkData> parentLinks) {
            
            // Always sample if there's an error indicator
            if (attributes.get(AttributeKey.booleanKey("error")) != null) {
                return SamplingResult.recordAndSample();
            }
            
            // Otherwise, sample 10% of requests
            return Math.random() < 0.1 
                ? SamplingResult.recordAndSample() 
                : SamplingResult.drop();
        }
    };
}
```

**Keep span names low-cardinality.** Do not include variable data like IDs in span names. Use tags for that. Bad: `get-order-12345`. Good: `get-order` with tag `order.id=12345`.

**Add meaningful tags.** Tags help you filter and analyze traces. Include business context like customer tier, order type, or feature flags.

**Handle async code carefully.** Trace context does not propagate automatically across thread boundaries. Use `Tracer.withSpan()` or context propagation utilities when spawning new threads.

## Putting It All Together

Here is a complete example of a traced service:

```java
@SpringBootApplication
public class OrderServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(OrderServiceApplication.class, args);
    }
}

@RestController
@RequestMapping("/api/orders")
class OrderController {
    
    private final OrderService orderService;
    private final Tracer tracer;
    
    OrderController(OrderService orderService, Tracer tracer) {
        this.orderService = orderService;
        this.tracer = tracer;
    }
    
    @PostMapping
    public ResponseEntity<Order> createOrder(@RequestBody OrderRequest request) {
        // Set baggage for downstream services
        tracer.createBaggage("customer.tier", request.getCustomerTier());
        
        Order order = orderService.createOrder(request);
        return ResponseEntity.ok(order);
    }
}
```

With this setup, you get a complete trace showing:
1. The incoming HTTP request
2. Custom business logic spans
3. Outgoing calls to other services
4. Database queries
5. The response back to the client

Each trace can be viewed in Zipkin, Jaeger, or any OpenTelemetry-compatible backend, giving you full visibility into your distributed system.

## Conclusion

Distributed tracing is essential for understanding and debugging microservices architectures. With Spring Boot 3.x and Micrometer Tracing, implementing it is straightforward:

1. Add the dependencies for Micrometer Tracing and your chosen backend
2. Configure sampling and export endpoints
3. Use automatic instrumentation for common operations
4. Add custom spans for business-critical code paths
5. Propagate baggage for cross-service context

Start simple with automatic instrumentation, then add custom spans as you identify areas that need more visibility. Your future self will thank you when debugging that 3 AM production incident.

---

*Get end-to-end distributed tracing with [OneUptime](https://oneuptime.com) - visualize request flows across microservices.*
