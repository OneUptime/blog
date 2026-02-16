# How to Instrument a Java Spring Boot Application with Azure Application Insights

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Application Insights, Java, Spring Boot, APM, Monitoring, Azure Monitor, JVM

Description: Step-by-step guide to instrumenting a Java Spring Boot application with Azure Application Insights using the Java agent for automatic telemetry collection.

---

Java Spring Boot applications are everywhere in enterprise environments, and getting observability right for them is important. Azure Application Insights provides a Java agent that instruments your Spring Boot application with zero code changes. It captures HTTP requests, database queries, external HTTP calls, JVM metrics, and more - all by attaching a Java agent at startup.

The agent approach is the recommended way to instrument Java applications with Application Insights. It uses bytecode instrumentation to intercept calls to common libraries (JDBC, HTTP clients, logging frameworks) without modifying your application code. This means you can add monitoring to an existing Spring Boot application without touching a single line of source code.

## Step 1: Download the Java Agent

The Application Insights Java agent is a standalone JAR file that you attach to your JVM.

```bash
# Download the latest Application Insights Java agent
curl -L -o applicationinsights-agent-3.4.0.jar \
  https://github.com/microsoft/ApplicationInsights-Java/releases/download/3.4.0/applicationinsights-agent-3.4.0.jar
```

Place the JAR in a location accessible to your application at runtime. For Docker deployments, include it in your image. For App Service, put it in a directory alongside your application JAR.

## Step 2: Create the Configuration File

The agent reads its configuration from a JSON file named `applicationinsights.json` placed in the same directory as the agent JAR.

```json
{
  "connectionString": "<your-application-insights-connection-string>",
  "role": {
    "name": "order-service",
    "instance": "order-service-01"
  },
  "sampling": {
    "percentage": 100
  },
  "instrumentation": {
    "logging": {
      "level": "WARN"
    },
    "micrometer": {
      "enabled": true
    }
  },
  "heartbeat": {
    "intervalSeconds": 60
  },
  "preview": {
    "sampling": {
      "overrides": [
        {
          "attributes": [
            {
              "key": "http.url",
              "value": "/health",
              "matchType": "contains"
            }
          ],
          "percentage": 0
        }
      ]
    }
  }
}
```

Key configuration options:

- **role.name**: Sets the cloud role name, which identifies your service in the application map and distributed traces
- **sampling.percentage**: Controls what percentage of telemetry is collected (100 = everything, 25 = 25%)
- **preview.sampling.overrides**: Lets you exclude noisy endpoints like health checks from telemetry
- **instrumentation.logging.level**: Controls which log levels are sent to Application Insights

## Step 3: Attach the Agent to Your Application

Add the `-javaagent` JVM argument when starting your Spring Boot application:

```bash
# Start the Spring Boot application with the Application Insights agent
java -javaagent:./applicationinsights-agent-3.4.0.jar \
     -jar my-spring-boot-app.jar
```

For Docker deployments, add it to your Dockerfile:

```dockerfile
FROM eclipse-temurin:17-jre

# Copy the application and the AI agent
COPY target/my-app.jar /app/my-app.jar
COPY applicationinsights-agent-3.4.0.jar /app/applicationinsights-agent.jar
COPY applicationinsights.json /app/applicationinsights.json

WORKDIR /app

# Start with the Java agent attached
ENTRYPOINT ["java", "-javaagent:applicationinsights-agent.jar", "-jar", "my-app.jar"]
```

For Azure App Service, set the `JAVA_OPTS` application setting:

```bash
# Configure the Java agent on Azure App Service
az webapp config appsettings set \
  --resource-group myRG \
  --name mySpringApp \
  --settings JAVA_OPTS="-javaagent:/home/site/wwwroot/applicationinsights-agent-3.4.0.jar"
```

## Step 4: What Gets Auto-Collected

Once the agent is attached, it automatically collects:

**Incoming requests**: Every HTTP request to your Spring Boot endpoints is tracked, including URL, response code, duration, and request body size.

**Outbound HTTP calls**: Calls made through RestTemplate, WebClient, Apache HttpClient, and OkHttp are tracked as dependencies.

**Database queries**: JDBC calls to SQL Server, MySQL, PostgreSQL, Oracle, and others are captured with the query text and duration.

**Redis calls**: Lettuce and Jedis Redis client calls are tracked.

**JVM metrics**: CPU usage, heap memory, garbage collection frequency and duration, thread count, and class loading stats.

**Log forwarding**: Log statements from Log4j2, Logback, and java.util.logging are sent to Application Insights as trace telemetry.

**Spring-specific instrumentation**: Spring MVC controller execution, Spring WebFlux handlers, and Spring Scheduling tasks are all captured.

## Step 5: Add Custom Telemetry with Code

While the agent handles most instrumentation automatically, you sometimes need to track business-specific events or add custom properties to telemetry.

Add the Application Insights SDK to your project:

```xml
<!-- pom.xml - Add the Application Insights SDK for custom telemetry -->
<dependency>
    <groupId>com.microsoft.azure</groupId>
    <artifactId>applicationinsights-core</artifactId>
    <version>3.4.0</version>
</dependency>
```

Then use the TelemetryClient in your code:

```java
import com.microsoft.applicationinsights.TelemetryClient;
import com.microsoft.applicationinsights.telemetry.EventTelemetry;
import com.microsoft.applicationinsights.telemetry.MetricTelemetry;

@Service
public class OrderService {

    // Create a TelemetryClient instance for sending custom telemetry
    private final TelemetryClient telemetryClient = new TelemetryClient();

    public Order processOrder(OrderRequest request) {
        long startTime = System.currentTimeMillis();

        try {
            Order order = createOrder(request);

            // Track a custom event for the business metric
            EventTelemetry event = new EventTelemetry("OrderProcessed");
            event.getProperties().put("orderId", order.getId());
            event.getProperties().put("customerId", request.getCustomerId());
            event.getMetrics().put("orderTotal", order.getTotal());
            event.getMetrics().put("itemCount", (double) order.getItems().size());
            telemetryClient.trackEvent(event);

            // Track processing time as a custom metric
            MetricTelemetry metric = new MetricTelemetry();
            metric.setName("OrderProcessingTime");
            metric.setValue(System.currentTimeMillis() - startTime);
            telemetryClient.trackMetric(metric);

            return order;
        } catch (Exception e) {
            // Track the exception with additional context
            telemetryClient.trackException(e);
            throw e;
        }
    }
}
```

## Step 6: Configure for Spring Boot Actuator Integration

If you use Spring Boot Actuator and Micrometer for metrics, Application Insights can ingest those metrics automatically.

The Java agent picks up Micrometer metrics by default when `instrumentation.micrometer.enabled` is set to `true` in your configuration file.

Add Micrometer to your project if you have not already:

```xml
<!-- pom.xml - Micrometer dependency for custom metrics -->
<dependency>
    <groupId>io.micrometer</groupId>
    <artifactId>micrometer-core</artifactId>
</dependency>
```

Then create custom metrics using Micrometer:

```java
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;

@RestController
public class PaymentController {

    private final Counter paymentSuccessCounter;
    private final Counter paymentFailureCounter;
    private final Timer paymentProcessingTimer;

    // Micrometer metrics are auto-exported to Application Insights
    public PaymentController(MeterRegistry registry) {
        this.paymentSuccessCounter = Counter.builder("payments.success")
            .description("Number of successful payments")
            .tag("service", "payment-api")
            .register(registry);

        this.paymentFailureCounter = Counter.builder("payments.failure")
            .description("Number of failed payments")
            .tag("service", "payment-api")
            .register(registry);

        this.paymentProcessingTimer = Timer.builder("payments.processing.time")
            .description("Payment processing duration")
            .register(registry);
    }

    @PostMapping("/api/payments")
    public ResponseEntity<PaymentResult> processPayment(@RequestBody PaymentRequest request) {
        return paymentProcessingTimer.record(() -> {
            try {
                PaymentResult result = paymentService.process(request);
                paymentSuccessCounter.increment();
                return ResponseEntity.ok(result);
            } catch (PaymentException e) {
                paymentFailureCounter.increment();
                return ResponseEntity.status(502).body(PaymentResult.failed(e.getMessage()));
            }
        });
    }
}
```

## Step 7: Configure Log Correlation

Application Insights correlates log statements with the request that generated them. This means when you look at a slow request in the portal, you can see all the log entries associated with that specific request.

For Logback (the default in Spring Boot), the agent automatically adds trace context to the MDC. You can include it in your log pattern:

```xml
<!-- logback-spring.xml - Include trace context in log output -->
<configuration>
    <appender name="CONSOLE" class="ch.qos.logback.core.ConsoleAppender">
        <encoder>
            <pattern>%d{yyyy-MM-dd HH:mm:ss} [%thread] %-5level %logger{36} [trace=%mdc{ai-operation-id}] - %msg%n</pattern>
        </encoder>
    </appender>

    <root level="INFO">
        <appender-ref ref="CONSOLE" />
    </root>
</configuration>
```

## Step 8: Configure Sampling for Production

For high-throughput services, sending all telemetry to Application Insights can be expensive. Configure sampling to reduce volume while maintaining visibility.

```json
{
  "connectionString": "<connection-string>",
  "sampling": {
    "percentage": 25,
    "overrides": [
      {
        "attributes": [
          {
            "key": "http.url",
            "value": "/health",
            "matchType": "contains"
          }
        ],
        "percentage": 0
      },
      {
        "attributes": [
          {
            "key": "http.statusCode",
            "value": "5..",
            "matchType": "regexp"
          }
        ],
        "percentage": 100
      }
    ]
  }
}
```

This configuration samples 25% of normal traffic, excludes health check endpoints entirely, and captures 100% of 5xx errors.

## Verify the Setup

After deploying, check that telemetry is flowing:

1. Generate some traffic to your application
2. Go to Application Insights > Live Metrics - you should see requests in real-time
3. Check Transaction Search for individual requests
4. Verify the Application Map shows your service with the correct role name
5. Check Performance to see request duration distributions

If data is not appearing, check the agent logs. The agent writes to `applicationinsights.log` in the same directory as the agent JAR. Common issues include an incorrect connection string, network connectivity to the Application Insights endpoint, or conflicting Java agent configurations.

## Summary

The Application Insights Java agent makes instrumenting a Spring Boot application almost effortless. Attach the agent, provide a configuration file with your connection string and role name, and you immediately get request tracking, dependency monitoring, JVM metrics, and log correlation. For business-specific telemetry, the SDK complements the agent with custom events and metrics. The combination gives you comprehensive visibility into your Spring Boot application's health and performance.
