# How to implement OpenTelemetry auto-instrumentation with Java

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Java, Observability, Tracing, Auto-instrumentation

Description: Learn how to implement OpenTelemetry auto-instrumentation with Java applications using the Java agent for zero-code distributed tracing and metrics collection.

---

OpenTelemetry auto-instrumentation for Java provides a powerful way to add observability to your applications without modifying source code. The Java agent automatically detects and instruments popular libraries and frameworks, generating traces, metrics, and logs.

## Understanding Java Auto-instrumentation

The OpenTelemetry Java agent uses bytecode manipulation to inject instrumentation at runtime. This approach requires no code changes and works with most Java applications running on JVM 8 or higher. The agent intercepts method calls in supported libraries and creates spans automatically.

Auto-instrumentation works by attaching a Java agent to your application at startup. The agent scans loaded classes and modifies bytecode to add telemetry collection. This happens transparently without affecting your application logic.

## Installing the Java Agent

Download the latest OpenTelemetry Java agent JAR file from the official releases. The agent is a single JAR file that you attach to your Java application using the `-javaagent` flag.

```bash
# Download the latest Java agent
wget https://github.com/open-telemetry/opentelemetry-java-instrumentation/releases/latest/download/opentelemetry-javaagent.jar

# Verify the download
ls -lh opentelemetry-javaagent.jar
```

The agent JAR contains all necessary dependencies and instrumentation modules. You don't need to add any additional dependencies to your application classpath.

## Basic Configuration

Configure the agent using environment variables or system properties. The most important configuration options control where telemetry data gets exported and what service name to use.

```bash
# Run your Java application with the agent
java -javaagent:opentelemetry-javaagent.jar \
  -Dotel.service.name=my-java-app \
  -Dotel.traces.exporter=otlp \
  -Dotel.metrics.exporter=otlp \
  -Dotel.exporter.otlp.endpoint=http://localhost:4317 \
  -jar your-application.jar
```

The agent starts instrumenting your application immediately. It automatically detects frameworks like Spring Boot, JDBC connections, HTTP clients, and message queues.

## Spring Boot Configuration

Spring Boot applications work seamlessly with OpenTelemetry auto-instrumentation. The agent automatically instruments Spring MVC controllers, REST templates, and WebClient instances.

```java
// Your existing Spring Boot controller - no changes needed
@RestController
@RequestMapping("/api")
public class UserController {

    @Autowired
    private UserService userService;

    @GetMapping("/users/{id}")
    public ResponseEntity<User> getUser(@PathVariable Long id) {
        // The agent automatically creates a span for this endpoint
        User user = userService.findById(id);
        return ResponseEntity.ok(user);
    }

    @PostMapping("/users")
    public ResponseEntity<User> createUser(@RequestBody User user) {
        // Database operations are automatically instrumented
        User created = userService.save(user);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }
}
```

The agent captures HTTP method, path, status code, and timing information automatically. It also propagates trace context across service boundaries when making HTTP calls.

## Database Instrumentation

JDBC connections get instrumented automatically, creating spans for every database query. The agent captures SQL statements, connection pool metrics, and query timing.

```java
@Service
public class UserService {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    public User findById(Long id) {
        // This query is automatically instrumented
        String sql = "SELECT * FROM users WHERE id = ?";
        return jdbcTemplate.queryForObject(sql, new Object[]{id},
            (rs, rowNum) -> new User(
                rs.getLong("id"),
                rs.getString("name"),
                rs.getString("email")
            ));
    }

    public User save(User user) {
        // INSERT statements are also automatically traced
        String sql = "INSERT INTO users (name, email) VALUES (?, ?)";
        jdbcTemplate.update(sql, user.getName(), user.getEmail());
        return user;
    }
}
```

The agent sanitizes sensitive data in SQL statements by default. You can configure this behavior using additional properties.

## HTTP Client Instrumentation

Outbound HTTP calls made with popular Java HTTP clients get instrumented automatically. The agent injects trace context headers and creates client spans.

```java
@Service
public class ExternalApiService {

    private final RestTemplate restTemplate;

    public ExternalApiService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    public OrderResponse fetchOrder(String orderId) {
        // Outbound HTTP call is automatically instrumented
        // Trace context is propagated via W3C headers
        String url = "https://api.example.com/orders/" + orderId;
        return restTemplate.getForObject(url, OrderResponse.class);
    }

    public void sendNotification(Notification notification) {
        // POST requests are also traced automatically
        String url = "https://api.example.com/notifications";
        restTemplate.postForObject(url, notification, Void.class);
    }
}
```

The agent handles context propagation using W3C Trace Context headers. This ensures distributed traces span across multiple services correctly.

## Messaging Framework Support

Popular messaging frameworks like Kafka, RabbitMQ, and JMS get instrumented automatically. The agent creates producer and consumer spans for message processing.

```java
@Component
public class OrderEventProducer {

    @Autowired
    private KafkaTemplate<String, OrderEvent> kafkaTemplate;

    public void publishOrderCreated(OrderEvent event) {
        // Kafka producer is automatically instrumented
        // Trace context is injected into message headers
        kafkaTemplate.send("order-events", event.getOrderId(), event);
    }
}

@Component
public class OrderEventConsumer {

    @KafkaListener(topics = "order-events", groupId = "order-processor")
    public void handleOrderEvent(OrderEvent event) {
        // Consumer span is automatically created
        // Trace context is extracted from message headers
        processOrder(event);
    }

    private void processOrder(OrderEvent event) {
        // Processing logic creates child spans automatically
        System.out.println("Processing order: " + event.getOrderId());
    }
}
```

Message queue instrumentation ensures trace continuity across asynchronous boundaries. The agent handles context propagation through message headers.

## Advanced Configuration

Fine-tune the agent behavior using additional configuration options. You can enable specific instrumentations, adjust sampling rates, and configure resource attributes.

```bash
# Docker Compose example with full configuration
version: '3.8'
services:
  java-app:
    image: my-java-app:latest
    environment:
      # Service identification
      - OTEL_SERVICE_NAME=payment-service
      - OTEL_SERVICE_VERSION=1.0.0
      - OTEL_DEPLOYMENT_ENVIRONMENT=production

      # Exporter configuration
      - OTEL_TRACES_EXPORTER=otlp
      - OTEL_METRICS_EXPORTER=otlp
      - OTEL_LOGS_EXPORTER=otlp
      - OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4317

      # Sampling configuration
      - OTEL_TRACES_SAMPLER=parentbased_traceidratio
      - OTEL_TRACES_SAMPLER_ARG=0.1

      # Resource attributes
      - OTEL_RESOURCE_ATTRIBUTES=environment=prod,team=payments

      # Instrumentation configuration
      - OTEL_INSTRUMENTATION_JDBC_STATEMENT_SANITIZER_ENABLED=true
      - OTEL_INSTRUMENTATION_COMMON_DB_STATEMENT_SANITIZER_ENABLED=true
    command: >
      java -javaagent:/app/opentelemetry-javaagent.jar
           -jar /app/application.jar
```

These environment variables control every aspect of auto-instrumentation. You can enable or disable specific instrumentations using the `OTEL_INSTRUMENTATION_*` pattern.

## Excluding Dependencies

Sometimes you need to exclude certain libraries from instrumentation. This helps reduce overhead or avoid conflicts with custom instrumentation.

```bash
# Disable specific instrumentations
export OTEL_INSTRUMENTATION_KAFKA_ENABLED=false
export OTEL_INSTRUMENTATION_REDIS_ENABLED=false

# Run with exclusions
java -javaagent:opentelemetry-javaagent.jar \
  -Dotel.service.name=my-app \
  -jar application.jar
```

You can also exclude specific packages or classes from instrumentation using additional configuration options.

## Kubernetes Deployment

Deploy Java applications with auto-instrumentation in Kubernetes using init containers or the OpenTelemetry Operator. The init container approach copies the agent JAR into a shared volume.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: java-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: java-app
  template:
    metadata:
      labels:
        app: java-app
    spec:
      initContainers:
      - name: otel-agent
        image: ghcr.io/open-telemetry/opentelemetry-java-instrumentation/autoinstrumentation-java:latest
        command: ['cp', '/javaagent.jar', '/otel-auto-instrumentation/javaagent.jar']
        volumeMounts:
        - name: otel-auto-instrumentation
          mountPath: /otel-auto-instrumentation
      containers:
      - name: app
        image: my-java-app:latest
        env:
        - name: JAVA_TOOL_OPTIONS
          value: "-javaagent:/otel-auto-instrumentation/javaagent.jar"
        - name: OTEL_SERVICE_NAME
          value: "java-app"
        - name: OTEL_EXPORTER_OTLP_ENDPOINT
          value: "http://otel-collector:4317"
        volumeMounts:
        - name: otel-auto-instrumentation
          mountPath: /otel-auto-instrumentation
      volumes:
      - name: otel-auto-instrumentation
        emptyDir: {}
```

This pattern ensures your application container has access to the agent JAR without modifying the application image.

## Verifying Instrumentation

After deploying your application with the agent, verify that telemetry data flows correctly. Check application logs for agent initialization messages.

```bash
# Check agent initialization in logs
kubectl logs -f deployment/java-app | grep -i "opentelemetry"

# Expected output:
# [otel.javaagent] OpenTelemetry Javaagent 1.32.0
# [otel.javaagent] Instrumentation loaded: spring-webmvc-6.0
# [otel.javaagent] Instrumentation loaded: jdbc
# [otel.javaagent] Instrumentation loaded: kafka-clients-2.6
```

The agent logs show which instrumentations loaded successfully. This helps troubleshoot configuration issues.

## Troubleshooting Common Issues

When auto-instrumentation doesn't work as expected, check these common issues. Missing or incorrect configuration often causes problems.

First, verify the agent JAR loads correctly. Look for OpenTelemetry startup messages in application logs. If you don't see these messages, the agent isn't attached properly.

Second, check network connectivity to your collector endpoint. The agent must reach the OTLP endpoint to export telemetry data.

Third, verify environment variables or system properties are set correctly. Typos in property names prevent proper configuration.

Fourth, ensure your Java version is compatible. The agent requires JVM 8 or higher. Some instrumentations require newer JVM versions.

OpenTelemetry auto-instrumentation for Java provides comprehensive observability with minimal effort. The agent handles most common frameworks and libraries automatically, making it easy to adopt distributed tracing in existing applications.
