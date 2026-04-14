# How to Build Microservices with Dapr and Spring Boot

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Spring Boot, Microservice, Java, Architecture

Description: A practical guide to building a production-ready microservices application using Dapr and Spring Boot with state, pub/sub, and service invocation.

---

## Introduction

Combining Dapr with Spring Boot gives you the best of both worlds: Spring Boot's mature ecosystem for building Java services and Dapr's portable building blocks for distributed systems concerns like service discovery, state management, and messaging.

## Project Structure

A typical Dapr + Spring Boot microservices setup:

```text
order-service/         # Handles order creation
inventory-service/     # Manages product inventory
notification-service/  # Sends email/SMS notifications
dapr/components/       # Shared Dapr component YAML files
```

## Shared Dapr Components

Define shared infrastructure in the `dapr/components/` folder:

```yaml
# statestore.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.redis
  version: v1
  metadata:
    - name: redisHost
      value: localhost:6379
---
# pubsub.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
spec:
  type: pubsub.redis
  version: v1
  metadata:
    - name: redisHost
      value: localhost:6379
```

## Order Service

```java
@RestController
@RequestMapping("/orders")
public class OrderController {

    @Autowired
    private DaprClient daprClient;

    @PostMapping
    public ResponseEntity<Order> createOrder(@RequestBody Order order) {
        // Save state
        daprClient.saveState("statestore", order.getId(), order).block();

        // Publish event
        daprClient.publishEvent("pubsub", "order-created", order).block();

        return ResponseEntity.status(201).body(order);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Order> getOrder(@PathVariable String id) {
        Order order = daprClient.getState("statestore", id, Order.class)
            .block().getValue();
        return ResponseEntity.ok(order);
    }
}
```

## Inventory Service

The inventory service subscribes to order events and checks stock:

```java
@RestController
public class InventoryController {

    @Topic(name = "order-created", pubsubName = "pubsub")
    @PostMapping("/order-created")
    public ResponseEntity<Void> handleOrderCreated(@RequestBody CloudEvent<Order> event) {
        Order order = event.getData();
        System.out.println("Reserving inventory for order: " + order.getId());
        // reserve inventory logic
        return ResponseEntity.ok().build();
    }
}
```

## Service Invocation Between Services

The order service calls inventory service directly when needed:

```java
@Service
public class InventoryClient {

    @Autowired
    private DaprClient daprClient;

    public boolean checkStock(String productId, int quantity) {
        StockResponse response = daprClient.invokeMethod(
            "inventory-service",
            "stock/" + productId,
            null,
            HttpExtension.GET,
            StockResponse.class
        ).block();

        return response.getAvailable() >= quantity;
    }
}
```

## Running the Full Stack

Use the Dapr CLI to start each service:

```bash
# Terminal 1 - Order Service
dapr run --app-id order-service --app-port 8081 \
  --resources-path ./dapr/components \
  -- java -jar order-service.jar

# Terminal 2 - Inventory Service
dapr run --app-id inventory-service --app-port 8082 \
  --resources-path ./dapr/components \
  -- java -jar inventory-service.jar
```

## Summary

Building microservices with Dapr and Spring Boot results in clean, portable Java code where distributed systems concerns are handled by the Dapr runtime. Services communicate through well-defined APIs, and infrastructure details live in component YAML files that can be swapped between environments without touching application code.
