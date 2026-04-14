# How to Use Dapr with Log4j in Java

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Log4j, Java, Logging, Observability

Description: Integrate Log4j 2 with Dapr Java SDK applications to produce structured, correlated logs from service invocations, pub/sub subscribers, and actor implementations.

---

## Log4j 2 with Dapr Java SDK

Log4j 2 is the standard enterprise logging framework for Java applications. When building Dapr microservices with the Java SDK, integrating Log4j 2 with Spring Boot gives you structured logging with correlation context from Dapr's distributed tracing headers.

```xml
<!-- pom.xml dependencies -->
<dependencies>
    <dependency>
        <groupId>io.dapr</groupId>
        <artifactId>dapr-sdk-springboot</artifactId>
        <version>1.12.0</version>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
        <exclusions>
            <exclusion>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-starter-logging</artifactId>
            </exclusion>
        </exclusions>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-log4j2</artifactId>
    </dependency>
</dependencies>
```

## Log4j2.xml Configuration

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Configuration status="WARN" monitorInterval="30">
    <Properties>
        <Property name="LOG_PATTERN">
            %d{yyyy-MM-dd HH:mm:ss.SSS} [%t] %-5level %logger{36}
            traceId=%X{traceId} spanId=%X{spanId} appId=%X{daprAppId}
            - %msg%n
        </Property>
    </Properties>

    <Appenders>
        <Console name="ConsoleAppender" target="SYSTEM_OUT">
            <PatternLayout pattern="${LOG_PATTERN}"/>
        </Console>
        <RollingFile name="FileAppender"
                     fileName="logs/dapr-app.log"
                     filePattern="logs/dapr-app-%d{yyyy-MM-dd}.log.gz">
            <JsonLayout compact="true" eventEol="true" objectMessageAsJsonObject="true">
                <KeyValuePair key="service" value="order-service"/>
            </JsonLayout>
            <Policies>
                <TimeBasedTriggeringPolicy/>
            </Policies>
        </RollingFile>
    </Appenders>

    <Loggers>
        <Logger name="io.dapr" level="INFO" additivity="false">
            <AppenderRef ref="ConsoleAppender"/>
        </Logger>
        <Root level="INFO">
            <AppenderRef ref="ConsoleAppender"/>
            <AppenderRef ref="FileAppender"/>
        </Root>
    </Loggers>
</Configuration>
```

## Service Invocation with Log4j Logging

```java
import io.dapr.client.DaprClient;
import io.dapr.client.DaprClientBuilder;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.apache.logging.log4j.ThreadContext;
import io.dapr.client.domain.HttpExtension;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private static final Logger logger = LogManager.getLogger(OrderController.class);
    private final DaprClient daprClient;

    public OrderController() {
        this.daprClient = new DaprClientBuilder().build();
    }

    @PostMapping
    public ResponseEntity<OrderResponse> createOrder(@RequestBody OrderRequest request,
                                                      @RequestHeader Map<String, String> headers) {
        // Propagate Dapr trace context to Log4j ThreadContext
        String traceParent = headers.getOrDefault("traceparent", "");
        ThreadContext.put("traceId", extractTraceId(traceParent));
        ThreadContext.put("daprAppId", headers.getOrDefault("dapr-caller-app-id", "unknown"));

        try {
            logger.info("Creating order orderId={} customerId={}",
                request.getOrderId(), request.getCustomerId());

            daprClient.invokeMethod(
                "payment-service", "charge", request,
                HttpExtension.POST, PaymentResponse.class
            ).block();

            logger.info("Order created successfully orderId={}", request.getOrderId());
            return ResponseEntity.ok(new OrderResponse(request.getOrderId(), "CREATED"));
        } catch (Exception e) {
            logger.error("Failed to create order orderId={}", request.getOrderId(), e);
            return ResponseEntity.status(500).build();
        } finally {
            ThreadContext.clearAll();
        }
    }

    private String extractTraceId(String traceParent) {
        if (traceParent != null && traceParent.split("-").length >= 2) {
            return traceParent.split("-")[1];
        }
        return "unknown";
    }
}
```

## Pub/Sub Subscriber with Log4j

```java
@PostMapping(path = "/orders/subscribe", consumes = MediaType.ALL_VALUE)
public ResponseEntity<Void> handleOrderEvent(@RequestBody(required = false) CloudEvent<OrderEvent> event) {
    ThreadContext.put("eventId", event.getId());
    ThreadContext.put("eventType", event.getType());

    try {
        logger.info("Processing pub/sub event eventId={} orderId={}",
            event.getId(), event.getData().getOrderId());

        processOrder(event.getData());

        logger.info("Pub/sub event processed successfully eventId={}", event.getId());
        return ResponseEntity.ok().build();
    } finally {
        ThreadContext.clearAll();
    }
}
```

## Summary

Log4j 2 integrates with Dapr Java SDK applications by enriching the ThreadContext with distributed tracing identifiers from Dapr's HTTP headers. This enables correlated log entries across microservices. Use Log4j's JSON layout for file output to enable log aggregation in tools like Elasticsearch, and ThreadContext to propagate the `traceparent` header into every log line within a request scope.
