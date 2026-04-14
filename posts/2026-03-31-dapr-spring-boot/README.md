# How to Use Dapr with Spring Boot

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Spring Boot, Java, Microservice, Integration

Description: Learn how to integrate Dapr with Spring Boot to build cloud-native Java microservices with state management, pub/sub, and service invocation.

---

## Introduction

Dapr (Distributed Application Runtime) integrates naturally with Spring Boot, adding distributed systems capabilities like state management, pub/sub messaging, and service invocation without coupling your code to specific infrastructure.

## Adding Dependencies

Add the Dapr Spring Boot starter to your `pom.xml`:

```xml
<dependency>
  <groupId>io.dapr.spring</groupId>
  <artifactId>dapr-spring-boot-starter</artifactId>
  <version>1.16.0</version>
</dependency>
```

## Application Configuration

Configure the Dapr connection in `application.properties`:

```properties
dapr.client.http-endpoint=http://localhost
dapr.client.http-port=3500
dapr.client.grpc-endpoint=localhost
dapr.client.grpc-port=50001
```

## Injecting DaprClient

With the starter, `DaprClient` is auto-configured and available for injection:

```java
import io.dapr.client.DaprClient;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class OrderService {

    @Autowired
    private DaprClient daprClient;

    public void saveOrder(String orderId, Object order) {
        daprClient.saveState("statestore", orderId, order).block();
        System.out.println("Saved order: " + orderId);
    }

    public Order getOrder(String orderId) {
        return daprClient.getState("statestore", orderId, Order.class)
            .block()
            .getValue();
    }
}
```

## Publishing and Subscribing to Events

Publish an event from a service:

```java
@Service
public class EventPublisher {

    @Autowired
    private DaprClient daprClient;

    public void publishOrderCreated(Order order) {
        daprClient.publishEvent("pubsub", "orders", order).block();
    }
}
```

Subscribe with a Spring MVC controller:

```java
import io.dapr.Topic;
import io.dapr.client.domain.CloudEvent;
import org.springframework.web.bind.annotation.*;

@RestController
public class OrderSubscriber {

    @Topic(name = "orders", pubsubName = "pubsub")
    @PostMapping("/orders")
    public ResponseEntity<Void> handleOrder(@RequestBody CloudEvent<Order> event) {
        System.out.println("Received order: " + event.getData().getId());
        return ResponseEntity.ok().build();
    }
}
```

## Calling Other Services

Invoke another Dapr-enabled microservice:

```java
@Service
public class InventoryClient {

    @Autowired
    private DaprClient daprClient;

    public Inventory checkInventory(String productId) {
        return daprClient.invokeMethod(
            "inventory-service",
            "inventory/" + productId,
            null,
            HttpExtension.GET,
            Inventory.class
        ).block();
    }
}
```

## Running Locally with Dapr

Start your Spring Boot app with the Dapr sidecar:

```bash
dapr run \
  --app-id order-service \
  --app-port 8080 \
  --dapr-http-port 3500 \
  -- mvn spring-boot:run
```

## Summary

Integrating Dapr with Spring Boot is straightforward using the Dapr Spring Boot starter. You get auto-configured beans for state management, pub/sub, and service invocation while keeping your Spring Boot application code clean and free of cloud-provider-specific dependencies.
