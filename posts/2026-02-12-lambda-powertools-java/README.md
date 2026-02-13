# How to Use Lambda Powertools for Java

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Lambda, Java, Powertools, Serverless

Description: A comprehensive guide to using AWS Lambda Powertools for Java with structured logging, distributed tracing, custom metrics, and idempotency for enterprise Lambda functions.

---

Java on Lambda has a reputation for cold starts, but it's still the runtime of choice for many enterprise teams. The JVM ecosystem brings mature libraries, strong typing, and patterns that Java developers already know. Lambda Powertools for Java makes it easy to add production-grade observability to your functions without abandoning the patterns you're familiar with.

Lambda Powertools for Java uses annotations and the aspect-oriented programming model, so adding logging, tracing, and metrics is often just a single annotation away.

## Installation

Add the dependencies to your Maven or Gradle build.

Here's the Maven configuration for all Powertools modules.

```xml
<!-- pom.xml -->
<dependencies>
    <!-- Core utilities -->
    <dependency>
        <groupId>software.amazon.lambda</groupId>
        <artifactId>powertools-logging</artifactId>
        <version>2.0.0</version>
    </dependency>
    <dependency>
        <groupId>software.amazon.lambda</groupId>
        <artifactId>powertools-tracing</artifactId>
        <version>2.0.0</version>
    </dependency>
    <dependency>
        <groupId>software.amazon.lambda</groupId>
        <artifactId>powertools-metrics</artifactId>
        <version>2.0.0</version>
    </dependency>
    <dependency>
        <groupId>software.amazon.lambda</groupId>
        <artifactId>powertools-idempotency</artifactId>
        <version>2.0.0</version>
    </dependency>
    <dependency>
        <groupId>software.amazon.lambda</groupId>
        <artifactId>powertools-parameters</artifactId>
        <version>2.0.0</version>
    </dependency>

    <!-- AspectJ for annotation support -->
    <dependency>
        <groupId>org.aspectj</groupId>
        <artifactId>aspectjrt</artifactId>
        <version>1.9.21</version>
    </dependency>
</dependencies>

<build>
    <plugins>
        <!-- AspectJ compile-time weaving -->
        <plugin>
            <groupId>dev.aspectj</groupId>
            <artifactId>aspectj-maven-plugin</artifactId>
            <version>1.14</version>
            <configuration>
                <source>17</source>
                <target>17</target>
                <complianceLevel>17</complianceLevel>
                <aspectLibraries>
                    <aspectLibrary>
                        <groupId>software.amazon.lambda</groupId>
                        <artifactId>powertools-logging</artifactId>
                    </aspectLibrary>
                    <aspectLibrary>
                        <groupId>software.amazon.lambda</groupId>
                        <artifactId>powertools-tracing</artifactId>
                    </aspectLibrary>
                    <aspectLibrary>
                        <groupId>software.amazon.lambda</groupId>
                        <artifactId>powertools-metrics</artifactId>
                    </aspectLibrary>
                </aspectLibraries>
            </configuration>
            <executions>
                <execution>
                    <goals>
                        <goal>compile</goal>
                    </goals>
                </execution>
            </executions>
        </plugin>
    </plugins>
</build>
```

## Structured Logging

The `@Logging` annotation automatically adds Lambda context to every log message.

```java
package com.myapp.handlers;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import software.amazon.lambda.powertools.logging.Logging;
import software.amazon.lambda.powertools.logging.LoggingUtils;

import java.util.Map;

public class OrderHandler implements RequestHandler<OrderEvent, OrderResponse> {

    private static final Logger logger = LogManager.getLogger(OrderHandler.class);

    @Logging(logEvent = true)  // Logs the incoming event
    @Override
    public OrderResponse handleRequest(OrderEvent event, Context context) {
        // Add custom keys to all subsequent log messages
        LoggingUtils.appendKey("orderId", event.getOrderId());
        LoggingUtils.appendKey("customerId", event.getCustomerId());

        logger.info("Processing order");

        try {
            OrderResult result = processOrder(event);
            logger.info("Order processed successfully");

            return new OrderResponse(200, result);
        } catch (Exception e) {
            logger.error("Failed to process order", e);
            return new OrderResponse(500, "Internal error");
        } finally {
            // Clean up for Lambda reuse
            LoggingUtils.removeKey("orderId");
            LoggingUtils.removeKey("customerId");
        }
    }

    private OrderResult processOrder(OrderEvent event) {
        logger.info("Validating {} items", event.getItems().size());
        // Business logic here
        return new OrderResult(event.getOrderId(), "completed");
    }
}
```

Configure Log4j2 with the Powertools JSON layout for structured output.

```xml
<!-- src/main/resources/log4j2.xml -->
<?xml version="1.0" encoding="UTF-8"?>
<Configuration>
    <Appenders>
        <Console name="JsonAppender" target="SYSTEM_OUT">
            <LambdaJsonLayout />
        </Console>
    </Appenders>
    <Loggers>
        <Root level="INFO">
            <AppenderRef ref="JsonAppender" />
        </Root>
    </Loggers>
</Configuration>
```

## Distributed Tracing

The `@Tracing` annotation integrates with AWS X-Ray for distributed tracing.

```java
package com.myapp.handlers;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import software.amazon.lambda.powertools.tracing.Tracing;
import software.amazon.lambda.powertools.tracing.TracingUtils;
import software.amazon.lambda.powertools.logging.Logging;

public class OrderHandler implements RequestHandler<OrderEvent, OrderResponse> {

    private final OrderRepository orderRepository;
    private final PaymentService paymentService;

    public OrderHandler() {
        this.orderRepository = new OrderRepository();
        this.paymentService = new PaymentService();
    }

    @Tracing  // Creates an X-Ray subsegment for this method
    @Logging
    @Override
    public OrderResponse handleRequest(OrderEvent event, Context context) {
        // Add annotation for filtering in X-Ray
        TracingUtils.putAnnotation("orderId", event.getOrderId());

        Order order = orderRepository.getOrder(event.getOrderId());
        TracingUtils.putMetadata("orderDetails", order);

        double total = calculateTotal(order);
        PaymentResult payment = paymentService.charge(order.getCustomerId(), total);

        return new OrderResponse(200, payment);
    }

    @Tracing(captureMode = CaptureMode.RESPONSE_AND_ERROR)
    private double calculateTotal(Order order) {
        return order.getItems().stream()
                .mapToDouble(item -> item.getPrice() * item.getQuantity())
                .sum();
    }
}
```

The `@Tracing` annotation also patches the AWS SDK automatically when used with the Powertools aspect, so all DynamoDB, S3, and SQS calls show up in your X-Ray traces.

## Custom Metrics

Use the `@Metrics` annotation with the MetricsUtils helper to emit custom CloudWatch metrics.

```java
package com.myapp.handlers;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import software.amazon.cloudwatchlogs.emf.model.Unit;
import software.amazon.lambda.powertools.metrics.Metrics;
import software.amazon.lambda.powertools.metrics.MetricsUtils;

public class OrderHandler implements RequestHandler<OrderEvent, OrderResponse> {

    @Metrics(namespace = "OrderService", service = "order-handler", captureColdStart = true)
    @Override
    public OrderResponse handleRequest(OrderEvent event, Context context) {
        // Single value metric
        MetricsUtils.metricsLogger().putMetric("OrderReceived", 1, Unit.COUNT);

        long startTime = System.currentTimeMillis();

        try {
            OrderResult result = processOrder(event);

            // Business metrics
            MetricsUtils.metricsLogger().putMetric("OrderProcessed", 1, Unit.COUNT);
            MetricsUtils.metricsLogger().putMetric("OrderValue", result.getTotal(), Unit.COUNT);

            // Performance metrics
            long duration = System.currentTimeMillis() - startTime;
            MetricsUtils.metricsLogger().putMetric("ProcessingDuration", duration, Unit.MILLISECONDS);

            // Add dimensions
            MetricsUtils.metricsLogger().putDimensions(
                DimensionSet.of("Environment", System.getenv("ENVIRONMENT"))
            );

            return new OrderResponse(200, result);
        } catch (Exception e) {
            MetricsUtils.metricsLogger().putMetric("OrderFailed", 1, Unit.COUNT);
            throw e;
        }
    }
}
```

## Idempotency

Prevent duplicate processing with the idempotency module.

```java
package com.myapp.handlers;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import software.amazon.lambda.powertools.idempotency.Idempotent;
import software.amazon.lambda.powertools.idempotency.Idempotency;
import software.amazon.lambda.powertools.idempotency.IdempotencyConfig;
import software.amazon.lambda.powertools.idempotency.persistence.DynamoDBPersistenceStore;

public class PaymentHandler implements RequestHandler<PaymentEvent, PaymentResponse> {

    public PaymentHandler() {
        // Configure idempotency
        Idempotency.config()
            .withConfig(
                IdempotencyConfig.builder()
                    .withEventKeyJMESPath("paymentId")
                    .withExpiration(java.time.Duration.ofHours(1))
                    .build()
            )
            .withPersistenceStore(
                DynamoDBPersistenceStore.builder()
                    .withTableName("idempotency-store")
                    .build()
            )
            .configure();
    }

    @Idempotent
    @Override
    public PaymentResponse handleRequest(PaymentEvent event, Context context) {
        // This will only execute once per paymentId
        // Subsequent calls with the same paymentId return the cached result

        PaymentResult result = chargeCustomer(
            event.getPaymentId(),
            event.getCustomerId(),
            event.getAmount()
        );

        return new PaymentResponse(200, result);
    }

    private PaymentResult chargeCustomer(String paymentId, String customerId, double amount) {
        // Payment processing logic
        return new PaymentResult(paymentId, "charged", amount);
    }
}
```

## SnapStart Compatibility

Lambda Powertools for Java works with SnapStart, which dramatically reduces cold start times. Here's how to combine them.

```java
package com.myapp.handlers;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestStreamHandler;
import org.crac.Core;
import org.crac.Resource;
import software.amazon.lambda.powertools.logging.Logging;
import software.amazon.lambda.powertools.tracing.Tracing;
import software.amazon.lambda.powertools.metrics.Metrics;

public class OrderHandler implements RequestStreamHandler, Resource {

    private final OrderService orderService;

    public OrderHandler() {
        this.orderService = new OrderService();
        // Register for CRaC lifecycle events
        Core.getGlobalContext().register(this);
    }

    @Override
    public void beforeCheckpoint(org.crac.Context<? extends Resource> context) {
        // Called before SnapStart snapshot
        // Pre-warm connections, load config, etc.
        orderService.warmUp();
    }

    @Override
    public void afterRestore(org.crac.Context<? extends Resource> context) {
        // Called after restore from snapshot
        // Refresh credentials, connections
        orderService.refreshConnections();
    }

    @Logging
    @Tracing
    @Metrics(namespace = "OrderService", captureColdStart = true)
    @Override
    public void handleRequest(InputStream input, OutputStream output, Context context) {
        // Handler logic
    }
}
```

## SAM Template Configuration

Here's a complete SAM template for a Java Lambda function with Powertools.

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31

Globals:
  Function:
    Runtime: java17
    MemorySize: 512
    Timeout: 30
    Tracing: Active
    Environment:
      Variables:
        POWERTOOLS_SERVICE_NAME: order-service
        POWERTOOLS_METRICS_NAMESPACE: OrderService
        LOG_LEVEL: INFO

Resources:
  OrderFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: com.myapp.handlers.OrderHandler::handleRequest
      CodeUri: target/order-handler.jar
      SnapStart:
        ApplyOn: PublishedVersions
      AutoPublishAlias: live
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref OrdersTable
```

## Wrapping Up

Lambda Powertools for Java brings the same observability patterns to the JVM that teams have come to expect from the Python and TypeScript versions. The annotation-based approach feels natural to Java developers, and the AspectJ integration means you don't have to restructure your code.

For the equivalent guides in other languages, check out [Lambda Powertools for Python](https://oneuptime.com/blog/post/2026-02-12-lambda-powertools-python/view) and [Lambda Powertools for TypeScript](https://oneuptime.com/blog/post/2026-02-12-lambda-powertools-typescript/view).
