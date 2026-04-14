# How to Use Dapr Pub/Sub with Java

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Java, Pub Sub, Messaging, Spring Boot, Event Driven

Description: Publish events and subscribe to topics in Java microservices using the Dapr pub/sub building block with Spring Boot annotations and CloudEvents support.

---

## Overview

Dapr pub/sub in Java enables event-driven communication between microservices without coupling them to a specific message broker. Publishers call a single API, and subscribers use Spring Boot annotations to declare topic interest. The Dapr sidecar handles CloudEvents wrapping, delivery guarantees, and broker-specific protocol details.

## Publishing Events

```java
import io.dapr.client.DaprClient;
import io.dapr.client.DaprClientBuilder;

public class Publisher {
    public static void main(String[] args) throws Exception {
        try (DaprClient client = new DaprClientBuilder().build()) {

            OrderPlaced event = new OrderPlaced("ord-001", "Widget Pro", 49.99);

            client.publishEvent("pubsub", "order-placed", event).block();
            System.out.println("Event published");
        }
    }
}
```

## Publishing with Metadata

```java
Map<String, String> metadata = Map.of(
    "ttlInSeconds", "3600",  // event TTL
    "rawPayload", "false"    // wrap in CloudEvents envelope
);

client.publishEvent("pubsub", "order-placed", event, metadata).block();
```

## Subscribing with Spring Boot

The `dapr-sdk-springboot` package provides the `@Topic` annotation for subscribing to topics in a Spring `@RestController`:

```java
import io.dapr.Topic;
import io.dapr.client.domain.CloudEvent;
import org.springframework.web.bind.annotation.*;

@RestController
public class OrderEventController {

    @Topic(name = "order-placed", pubsubName = "pubsub")
    @PostMapping("/events/order-placed")
    public Mono<Void> handleOrderPlaced(@RequestBody CloudEvent<OrderPlaced> event) {
        OrderPlaced order = event.getData();
        System.out.printf("Order received: %s - %s%n", order.getId(), order.getProduct());
        return Mono.empty();
    }
}
```

## Subscribing to Multiple Topics

```java
@Topic(name = "order-placed", pubsubName = "pubsub")
@PostMapping("/events/order-placed")
public Mono<Void> handleOrderPlaced(@RequestBody CloudEvent<OrderPlaced> event) {
    return processOrder(event.getData());
}

@Topic(name = "payment-completed", pubsubName = "pubsub")
@PostMapping("/events/payment-completed")
public Mono<Void> handlePaymentCompleted(@RequestBody CloudEvent<PaymentCompleted> event) {
    return processPayment(event.getData());
}
```

## Dead Letter Topics

Configure a dead letter topic in the subscription metadata:

```java
@Topic(
    name = "order-placed",
    pubsubName = "pubsub",
    deadLetterTopic = "order-placed-dlq")
@PostMapping("/events/order-placed")
public Mono<Void> handleOrderPlaced(@RequestBody CloudEvent<OrderPlaced> event) {
    // Returning an error status will route to dead letter topic
    return processOrder(event.getData());
}
```

## Bulk Publishing

```java
List<BulkPublishEntry<OrderPlaced>> entries = List.of(
    new BulkPublishEntry<>("entry-1",
        new OrderPlaced("ord-1", "Widget", 9.99), "application/json"),
    new BulkPublishEntry<>("entry-2",
        new OrderPlaced("ord-2", "Gadget", 19.99), "application/json"));

BulkPublishRequest<OrderPlaced> request = new BulkPublishRequest<>(
    "pubsub", "order-placed", entries);

BulkPublishResponse<OrderPlaced> result = client.publishEvents(request).block();
```

## Running the Subscriber

```bash
dapr run --app-id order-processor --app-port 8080 --components-path ./components \
  -- java -jar target/order-processor.jar
```

## Summary

Dapr pub/sub in Java uses `DaprClient.publishEvent()` for publishing and the `@Topic` Spring Boot annotation for subscribing. The annotation automatically registers the subscription with the Dapr sidecar at startup. CloudEvent deserialization is handled by the framework, so your handler method receives a strongly-typed `CloudEvent<T>` without manual JSON parsing.
