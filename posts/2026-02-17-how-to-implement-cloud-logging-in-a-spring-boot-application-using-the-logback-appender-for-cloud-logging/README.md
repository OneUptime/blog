# How to Implement Cloud Logging in a Spring Boot Application Using the Logback Appender for Cloud Logging

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Logging, Spring Boot, Logback, Observability, Java

Description: Set up structured logging in a Spring Boot application using the Logback appender for Google Cloud Logging with trace correlation, severity mapping, and custom labels.

---

When you deploy a Spring Boot application to GCP, you want your logs to show up in Cloud Logging with proper severity levels, structured JSON format, and trace correlation. The standard console output works, but you lose the ability to filter by severity, search structured fields, and correlate logs with Cloud Trace spans. The Logback appender for Cloud Logging sends your logs directly to the Cloud Logging API with all that metadata intact.

In this post, I will show you how to configure the Logback appender for Cloud Logging in a Spring Boot application.

## Two Approaches to Cloud Logging

There are two ways to get logs into Cloud Logging from a Spring Boot application:

1. **Structured JSON to stdout** - Write logs as JSON to standard output. Cloud Run and GKE automatically pick up stdout logs and send them to Cloud Logging. This is simpler but requires a specific JSON format.

2. **Direct API with the Logback appender** - Send logs directly to the Cloud Logging API using the Logback appender. This gives you more control over labels, resource types, and custom fields.

I will cover both approaches, but focus on the Logback appender.

## Dependencies

```xml
<!-- Spring Cloud GCP Logging starter -->
<dependency>
    <groupId>com.google.cloud</groupId>
    <artifactId>spring-cloud-gcp-starter-logging</artifactId>
</dependency>

<!-- Google Cloud Logging Logback appender -->
<dependency>
    <groupId>com.google.cloud</groupId>
    <artifactId>google-cloud-logging-logback</artifactId>
</dependency>

<!-- Spring Boot Web -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
</dependency>
```

## Logback Configuration

Create `src/main/resources/logback-spring.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
    <!-- Include Spring Boot defaults -->
    <include resource="org/springframework/boot/logging/logback/defaults.xml"/>

    <!-- Cloud Logging appender for production -->
    <springProfile name="cloud">
        <appender name="CLOUD" class="com.google.cloud.logging.logback.LoggingAppender">
            <!-- Cloud Logging configuration -->
            <log>my-application-log</log>
            <resourceType>cloud_run_revision</resourceType>
            <flushLevel>WARNING</flushLevel>

            <!-- Custom enhancers for adding trace and request info -->
            <enhancer>com.google.cloud.logging.TraceLoggingEnhancer</enhancer>

            <!-- Custom labels applied to all log entries -->
            <loggingEventEnhancer>com.example.logging.CustomLabelEnhancer</loggingEventEnhancer>
        </appender>

        <root level="INFO">
            <appender-ref ref="CLOUD"/>
        </root>
    </springProfile>

    <!-- Console appender for local development -->
    <springProfile name="!cloud">
        <appender name="CONSOLE" class="ch.qos.logback.core.ConsoleAppender">
            <encoder>
                <pattern>%d{yyyy-MM-dd HH:mm:ss.SSS} [%thread] %-5level %logger{36} - %msg%n</pattern>
            </encoder>
        </appender>

        <root level="INFO">
            <appender-ref ref="CONSOLE"/>
        </root>
    </springProfile>
</configuration>
```

## Structured JSON Logging for Cloud Run

If you prefer the stdout approach (which works without the API appender), configure Logback to output JSON that Cloud Logging understands:

```xml
<!-- JSON appender for stdout-based logging on Cloud Run -->
<springProfile name="cloudrun">
    <appender name="CLOUD_JSON" class="ch.qos.logback.core.ConsoleAppender">
        <encoder class="ch.qos.logback.core.encoder.LayoutWrappingEncoder">
            <layout class="com.google.cloud.logging.logback.LoggingAppender">
                <!-- Outputs structured JSON that Cloud Run picks up -->
            </layout>
        </encoder>
    </appender>
</springProfile>
```

Or use the Spring Cloud GCP JSON layout:

```properties
# application-cloudrun.properties
# Enable JSON logging for Cloud Run
logging.config=classpath:logback-json.xml
```

## Custom Label Enhancer

Add custom labels to every log entry for easier filtering in Cloud Logging:

```java
// Custom enhancer that adds application-specific labels to log entries
public class CustomLabelEnhancer implements LoggingEventEnhancer {

    @Override
    public void enhanceLogEntry(LogEntry.Builder builder, ILoggingEvent event) {
        // Add application name as a label
        builder.addLabel("app", "my-application");
        builder.addLabel("environment", System.getenv().getOrDefault("ENV", "unknown"));

        // Add version info
        String version = System.getenv().getOrDefault("APP_VERSION", "dev");
        builder.addLabel("version", version);

        // Add MDC values as labels
        Map<String, String> mdc = event.getMDCPropertyMap();
        if (mdc.containsKey("requestId")) {
            builder.addLabel("request_id", mdc.get("requestId"));
        }
        if (mdc.containsKey("userId")) {
            builder.addLabel("user_id", mdc.get("userId"));
        }
    }
}
```

## Using MDC for Request Context

Add contextual information to logs using the Mapped Diagnostic Context:

```java
// Filter that sets MDC context for each request
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class RequestContextFilter implements Filter {

    @Override
    public void doFilter(ServletRequest request, ServletResponse response,
                         FilterChain chain) throws IOException, ServletException {
        HttpServletRequest httpRequest = (HttpServletRequest) request;

        try {
            // Set a unique request ID
            String requestId = httpRequest.getHeader("X-Request-ID");
            if (requestId == null) {
                requestId = UUID.randomUUID().toString();
            }
            MDC.put("requestId", requestId);

            // Set Cloud Trace context for trace correlation
            String traceHeader = httpRequest.getHeader("X-Cloud-Trace-Context");
            if (traceHeader != null) {
                String traceId = traceHeader.split("/")[0];
                MDC.put("traceId", traceId);
                // This enables log-trace correlation in Cloud Logging
                TraceLoggingEnhancer.setCurrentTraceId(
                        "projects/my-project/traces/" + traceId);
            }

            // Set user info if available
            String userId = httpRequest.getHeader("X-User-ID");
            if (userId != null) {
                MDC.put("userId", userId);
            }

            chain.doFilter(request, response);

        } finally {
            // Clean up MDC to prevent context leaking between requests
            MDC.clear();
        }
    }
}
```

## Logging in Application Code

Use standard SLF4J logging. The appender handles formatting and shipping:

```java
@RestController
@RequestMapping("/api/orders")
public class OrderController {

    // Standard SLF4J logger
    private static final Logger log = LoggerFactory.getLogger(OrderController.class);

    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @PostMapping
    public ResponseEntity<Order> createOrder(@RequestBody OrderRequest request) {
        // Info level logs show as INFO severity in Cloud Logging
        log.info("Creating order for customer: {}", request.getCustomerId());

        try {
            Order order = orderService.createOrder(request);
            log.info("Order created successfully: orderId={}, total={}",
                    order.getId(), order.getTotal());
            return ResponseEntity.ok(order);

        } catch (InsufficientInventoryException e) {
            // Warning level logs show as WARNING severity
            log.warn("Insufficient inventory for order: customerId={}, items={}",
                    request.getCustomerId(), request.getItems());
            return ResponseEntity.badRequest().build();

        } catch (Exception e) {
            // Error level logs show as ERROR severity with stack trace
            log.error("Failed to create order for customer: {}",
                    request.getCustomerId(), e);
            return ResponseEntity.internalServerError().build();
        }
    }
}
```

## Structured Logging with Key-Value Pairs

For richer log entries, use structured arguments:

```java
@Service
public class PaymentService {

    private static final Logger log = LoggerFactory.getLogger(PaymentService.class);

    public PaymentResult processPayment(String orderId, BigDecimal amount) {
        // Add structured key-value pairs to the log entry
        // These show up as jsonPayload fields in Cloud Logging
        MDC.put("orderId", orderId);
        MDC.put("amount", amount.toString());
        MDC.put("operation", "payment_processing");

        try {
            log.info("Processing payment for order");

            // Process the payment...
            PaymentResult result = callPaymentGateway(orderId, amount);

            MDC.put("paymentStatus", result.getStatus());
            log.info("Payment processed successfully");

            return result;

        } catch (PaymentDeclinedException e) {
            log.warn("Payment declined: reason={}", e.getReason());
            throw e;
        } finally {
            MDC.remove("orderId");
            MDC.remove("amount");
            MDC.remove("operation");
            MDC.remove("paymentStatus");
        }
    }
}
```

## Log-Based Metrics

Once your logs are in Cloud Logging, you can create log-based metrics:

```bash
# Create a metric that counts payment failures
gcloud logging metrics create payment_failures \
    --description="Count of payment failures" \
    --log-filter='resource.type="cloud_run_revision" AND jsonPayload.operation="payment_processing" AND severity=WARNING'
```

## Application Properties

```properties
# Spring Cloud GCP project configuration
spring.cloud.gcp.project-id=my-project
spring.cloud.gcp.logging.enabled=true

# Logging levels
logging.level.root=INFO
logging.level.com.example=DEBUG

# Active profile for Cloud Run
spring.profiles.active=cloud
```

## Wrapping Up

The Logback appender for Cloud Logging gives your Spring Boot application structured, searchable logs with proper severity levels and trace correlation. Whether you use the direct API approach or structured JSON to stdout, the result is logs that work with Cloud Logging's filtering, alerting, and metrics features. Add MDC context for request-scoped information, custom labels for filtering, and trace correlation to connect logs to distributed traces. This makes debugging production issues significantly faster than searching through unstructured text logs.
