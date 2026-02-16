# How to Implement Azure Service Bus Dead Letter Queue Handling in a Spring Boot Application

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Service Bus, Dead Letter Queue, Spring Boot, Java, Messaging, Error Handling, Cloud

Description: Handle Azure Service Bus dead letter queue messages in a Spring Boot application with inspection, reprocessing, and monitoring strategies.

---

Dead letter queues (DLQs) are where messages go to die - or more accurately, where they go when they cannot be processed. Every Azure Service Bus queue and subscription has an associated dead letter queue. Messages end up there when they exceed the maximum delivery count, when they expire, or when your application explicitly dead-letters them. Ignoring the DLQ means silently losing data.

In this post, we will build a Spring Boot application that handles dead letter queue messages properly. We will cover reading from the DLQ, inspecting why messages failed, reprocessing them, and setting up monitoring so you know when messages are accumulating.

## Why Messages End Up in the DLQ

There are several reasons a message gets dead-lettered:

1. **Max delivery count exceeded**: The message was delivered and abandoned (not completed) more times than the queue's max delivery count (default: 10).
2. **TTL expired**: The message sat in the queue longer than its time-to-live.
3. **Explicit dead-lettering**: Your application code called `deadLetter()` on the message because it could not be processed (e.g., invalid format, business rule violation).
4. **Subscription filter evaluation failure**: A topic subscription's filter could not evaluate the message.

Each dead-lettered message includes properties that tell you why it was dead-lettered: `DeadLetterReason` and `DeadLetterErrorDescription`.

## Project Setup

```bash
# Create a new Spring Boot project
# Add these dependencies to pom.xml
```

```xml
<!-- pom.xml dependencies -->
<dependency>
    <groupId>com.azure.spring</groupId>
    <artifactId>spring-cloud-azure-starter-servicebus</artifactId>
    <version>5.8.0</version>
</dependency>
<dependency>
    <groupId>com.azure</groupId>
    <artifactId>azure-messaging-servicebus</artifactId>
    <version>7.15.0</version>
</dependency>
```

## Step 1: Configure Service Bus Connection

```yaml
# application.yml
# Azure Service Bus configuration
spring:
  cloud:
    azure:
      servicebus:
        connection-string: ${SERVICE_BUS_CONNECTION_STRING}

app:
  servicebus:
    queue-name: order-processing
    topic-name: order-events
    subscription-name: notifications
    max-delivery-count: 10
```

## Step 2: Build the Main Message Processor

First, build the normal message processor that handles messages from the main queue.

```java
// src/main/java/com/example/messaging/OrderProcessor.java
// Processes messages from the order-processing queue
package com.example.messaging;

import com.azure.messaging.servicebus.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
public class OrderProcessor {

    private static final Logger log = LoggerFactory.getLogger(OrderProcessor.class);
    private final ObjectMapper objectMapper = new ObjectMapper();

    public void processMessage(ServiceBusReceivedMessageContext context) {
        ServiceBusReceivedMessage message = context.getMessage();

        try {
            String body = message.getBody().toString();
            log.info("Processing message {}: {}", message.getMessageId(), body);

            // Parse the order event
            OrderEvent event = objectMapper.readValue(body, OrderEvent.class);

            // Validate the event
            if (event.getOrderId() == null || event.getOrderId().isEmpty()) {
                // Invalid message - dead letter it with a reason
                context.deadLetter(
                    new DeadLetterOptions()
                        .setDeadLetterReason("InvalidMessage")
                        .setDeadLetterErrorDescription("OrderId is null or empty")
                );
                log.warn("Dead-lettered message {} - missing orderId", message.getMessageId());
                return;
            }

            // Process the order
            processOrder(event);

            // Complete the message - removes it from the queue
            context.complete();
            log.info("Successfully processed order {}", event.getOrderId());

        } catch (TransientException e) {
            // Transient error - abandon the message so it gets retried
            log.warn("Transient error processing message {}, abandoning for retry",
                message.getMessageId(), e);
            context.abandon();

        } catch (Exception e) {
            // Permanent error - dead letter with the error details
            log.error("Permanent error processing message {}", message.getMessageId(), e);
            context.deadLetter(
                new DeadLetterOptions()
                    .setDeadLetterReason("ProcessingError")
                    .setDeadLetterErrorDescription(e.getMessage())
            );
        }
    }

    private void processOrder(OrderEvent event) {
        // Business logic here
        log.info("Processing order {} for customer {}", event.getOrderId(), event.getCustomerId());
    }
}
```

## Step 3: Build the Dead Letter Queue Handler

This is the core of DLQ handling. We read from the DLQ, inspect the messages, and decide what to do with them.

```java
// src/main/java/com/example/messaging/DeadLetterHandler.java
// Handles messages from the dead letter queue
package com.example.messaging;

import com.azure.messaging.servicebus.*;
import com.azure.messaging.servicebus.models.SubQueue;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

@Component
public class DeadLetterHandler {

    private static final Logger log = LoggerFactory.getLogger(DeadLetterHandler.class);

    @Value("${spring.cloud.azure.servicebus.connection-string}")
    private String connectionString;

    @Value("${app.servicebus.queue-name}")
    private String queueName;

    private ServiceBusProcessorClient dlqProcessor;
    private ServiceBusSenderClient sender;

    @PostConstruct
    public void initialize() {
        // Create a processor that reads from the dead letter sub-queue
        dlqProcessor = new ServiceBusClientBuilder()
            .connectionString(connectionString)
            .processor()
            .queueName(queueName)
            .subQueue(SubQueue.DEAD_LETTER_QUEUE)  // Read from the DLQ
            .processMessage(this::handleDeadLetter)
            .processError(this::handleError)
            .maxConcurrentCalls(5)
            .buildProcessorClient();

        // Create a sender for resubmitting messages to the main queue
        sender = new ServiceBusClientBuilder()
            .connectionString(connectionString)
            .sender()
            .queueName(queueName)
            .buildClient();

        dlqProcessor.start();
        log.info("Dead letter queue handler started for queue: {}", queueName);
    }

    private void handleDeadLetter(ServiceBusReceivedMessageContext context) {
        ServiceBusReceivedMessage message = context.getMessage();

        // Extract dead letter metadata
        String reason = message.getDeadLetterReason();
        String description = message.getDeadLetterErrorDescription();
        String source = message.getDeadLetterSource();
        int deliveryCount = (int) message.getDeliveryCount();

        log.info("Dead letter message received: id={}, reason={}, description={}, source={}, deliveryCount={}",
            message.getMessageId(), reason, description, source, deliveryCount);

        // Decide what to do based on the dead letter reason
        DeadLetterAction action = categorize(reason, description, message);

        switch (action) {
            case RESUBMIT:
                resubmitMessage(message);
                context.complete();
                log.info("Resubmitted message {} to main queue", message.getMessageId());
                break;

            case LOG_AND_DISCARD:
                logForAudit(message, reason, description);
                context.complete();
                log.info("Discarded message {} after logging", message.getMessageId());
                break;

            case ALERT_AND_HOLD:
                sendAlert(message, reason, description);
                // Do not complete - leave it in DLQ for manual inspection
                context.abandon();
                log.warn("Alert sent for message {}, leaving in DLQ", message.getMessageId());
                break;

            default:
                // Complete to remove from DLQ after logging
                logForAudit(message, reason, description);
                context.complete();
        }
    }

    private DeadLetterAction categorize(String reason, String description,
                                         ServiceBusReceivedMessage message) {
        // Categorize dead letters based on their reason
        if ("InvalidMessage".equals(reason)) {
            // Invalid messages should be logged and discarded
            return DeadLetterAction.LOG_AND_DISCARD;
        }

        if ("MaxDeliveryCountExceeded".equals(reason)) {
            // These might be transient failures - try resubmitting once
            Object retryCount = message.getApplicationProperties().get("dlq_retry_count");
            int retries = retryCount != null ? (int) retryCount : 0;
            if (retries < 1) {
                return DeadLetterAction.RESUBMIT;
            }
            return DeadLetterAction.ALERT_AND_HOLD;
        }

        if ("TTLExpired".equals(reason)) {
            // Expired messages are usually stale - discard them
            return DeadLetterAction.LOG_AND_DISCARD;
        }

        // Unknown reason - alert for manual inspection
        return DeadLetterAction.ALERT_AND_HOLD;
    }

    private void resubmitMessage(ServiceBusReceivedMessage deadLetter) {
        // Create a new message with the same body and properties
        ServiceBusMessage newMessage = new ServiceBusMessage(deadLetter.getBody());
        newMessage.setContentType(deadLetter.getContentType());
        newMessage.setSubject(deadLetter.getSubject());

        // Copy application properties
        deadLetter.getApplicationProperties().forEach(
            (key, value) -> newMessage.getApplicationProperties().put(key, value)
        );

        // Track that this message was resubmitted from the DLQ
        newMessage.getApplicationProperties().put("dlq_resubmitted", true);
        newMessage.getApplicationProperties().put("dlq_resubmitted_at",
            OffsetDateTime.now().toString());

        // Increment the retry count
        Object retryCount = deadLetter.getApplicationProperties().get("dlq_retry_count");
        int retries = retryCount != null ? (int) retryCount : 0;
        newMessage.getApplicationProperties().put("dlq_retry_count", retries + 1);

        sender.sendMessage(newMessage);
    }

    private void logForAudit(ServiceBusReceivedMessage message, String reason, String description) {
        // Log the full message details for audit purposes
        log.info("AUDIT - Dead letter discarded: id={}, reason={}, description={}, body={}",
            message.getMessageId(), reason, description, message.getBody().toString());
    }

    private void sendAlert(ServiceBusReceivedMessage message, String reason, String description) {
        // In production: send to PagerDuty, Slack, email, etc.
        log.error("ALERT - Dead letter requires attention: id={}, reason={}, description={}",
            message.getMessageId(), reason, description);
    }

    private void handleError(ServiceBusErrorContext context) {
        log.error("Error in DLQ processor: {}", context.getException().getMessage());
    }

    @PreDestroy
    public void cleanup() {
        if (dlqProcessor != null) dlqProcessor.close();
        if (sender != null) sender.close();
    }

    enum DeadLetterAction {
        RESUBMIT,
        LOG_AND_DISCARD,
        ALERT_AND_HOLD
    }
}
```

## Step 4: REST API for DLQ Management

Build an API for operators to inspect and manage dead letter messages.

```java
// src/main/java/com/example/controller/DlqController.java
// REST API for inspecting and managing dead letter queue messages
package com.example.controller;

import com.azure.messaging.servicebus.*;
import com.azure.messaging.servicebus.models.SubQueue;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/dlq")
public class DlqController {

    @Value("${spring.cloud.azure.servicebus.connection-string}")
    private String connectionString;

    @Value("${app.servicebus.queue-name}")
    private String queueName;

    // Peek at dead letter messages without removing them
    @GetMapping("/peek")
    public List<Map<String, Object>> peekMessages(
            @RequestParam(defaultValue = "10") int count) {

        ServiceBusReceiverClient receiver = new ServiceBusClientBuilder()
            .connectionString(connectionString)
            .receiver()
            .queueName(queueName)
            .subQueue(SubQueue.DEAD_LETTER_QUEUE)
            .buildClient();

        List<Map<String, Object>> messages = new ArrayList<>();

        // Peek does not lock or remove messages
        for (ServiceBusReceivedMessage msg : receiver.peekMessages(count)) {
            Map<String, Object> info = new LinkedHashMap<>();
            info.put("messageId", msg.getMessageId());
            info.put("deadLetterReason", msg.getDeadLetterReason());
            info.put("deadLetterErrorDescription", msg.getDeadLetterErrorDescription());
            info.put("enqueuedTime", msg.getEnqueuedTime());
            info.put("deliveryCount", msg.getDeliveryCount());
            info.put("body", msg.getBody().toString());
            info.put("applicationProperties", msg.getApplicationProperties());
            messages.add(info);
        }

        receiver.close();
        return messages;
    }

    // Get the count of messages in the DLQ
    @GetMapping("/count")
    public Map<String, Object> getCount() {
        // Use the management client or runtime info to get the count
        ServiceBusReceiverClient receiver = new ServiceBusClientBuilder()
            .connectionString(connectionString)
            .receiver()
            .queueName(queueName)
            .subQueue(SubQueue.DEAD_LETTER_QUEUE)
            .buildClient();

        // Peek to count (not ideal for large queues, but works for monitoring)
        int count = 0;
        for (ServiceBusReceivedMessage msg : receiver.peekMessages(1000)) {
            count++;
        }

        receiver.close();
        return Map.of(
            "queueName", queueName,
            "deadLetterCount", count,
            "checkedAt", new Date()
        );
    }
}
```

## Step 5: Monitoring with Health Checks

Add a health check that alerts when the DLQ has too many messages.

```java
// src/main/java/com/example/health/DlqHealthIndicator.java
// Health indicator that checks the DLQ message count
package com.example.health;

import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.stereotype.Component;

@Component
public class DlqHealthIndicator implements HealthIndicator {

    private static final int WARNING_THRESHOLD = 10;
    private static final int CRITICAL_THRESHOLD = 100;

    @Override
    public Health health() {
        // In production, cache this value and refresh periodically
        int dlqCount = getDlqCount();

        if (dlqCount >= CRITICAL_THRESHOLD) {
            return Health.down()
                .withDetail("dlqCount", dlqCount)
                .withDetail("threshold", CRITICAL_THRESHOLD)
                .withDetail("message", "Dead letter queue has exceeded critical threshold")
                .build();
        }

        if (dlqCount >= WARNING_THRESHOLD) {
            return Health.up()
                .withDetail("dlqCount", dlqCount)
                .withDetail("status", "warning")
                .withDetail("message", "Dead letter queue is accumulating messages")
                .build();
        }

        return Health.up()
            .withDetail("dlqCount", dlqCount)
            .build();
    }

    private int getDlqCount() {
        // Implement DLQ count retrieval
        return 0;
    }
}
```

## Best Practices

1. **Always monitor the DLQ**: Set up alerts when the DLQ count exceeds a threshold. Unmonitored DLQs lead to silent data loss.
2. **Categorize failures**: Not all dead letters are equal. Invalid messages should be discarded. Transient failures should be retried. Unknown failures need human attention.
3. **Limit resubmissions**: Track how many times a message has been resubmitted to prevent infinite retry loops.
4. **Log everything**: When discarding a dead letter, log the full message body and properties for audit purposes.
5. **Set appropriate max delivery counts**: The default of 10 is usually fine, but reduce it for messages that should fail fast.

## Summary

Dead letter queue handling is not optional - it is a critical part of any Service Bus-based architecture. Without it, failed messages disappear silently, and you have no way to know what went wrong or recover the data. The pattern we built categorizes dead letters, automatically resubmits transient failures, discards invalid messages, and alerts operators for unknown issues. Combined with health checks and monitoring, this gives you full visibility into your messaging pipeline's failure modes.
