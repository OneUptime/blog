# How to Use Dapr Java Client

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Java, Client, SDK, Microservice, API

Description: Explore the Dapr Java client API for state management, service invocation, pub/sub, secrets, and configuration with both blocking and reactive usage patterns.

---

## Overview

The Dapr Java `DaprClient` provides access to all Dapr building blocks through a reactive API built on Project Reactor. A `.block()` call makes any operation synchronous, so you can use it in both traditional blocking Java applications and reactive Spring WebFlux services.

## Building the Client

```java
import io.dapr.client.DaprClient;
import io.dapr.client.DaprClientBuilder;
import io.dapr.config.Properties;

DaprClient client = new DaprClientBuilder()
    .withPropertyOverride(Properties.HTTP_PORT, "3500")
    .withPropertyOverride(Properties.GRPC_PORT, "50001")
    .build();
```

## State Management

```java
import io.dapr.client.domain.State;

// Save
client.saveState("statestore", "user:42",
    new User("Alice", "alice@example.com")).block();

// Get
State<User> state = client.getState("statestore", "user:42", User.class).block();
User user = state.getValue();
System.out.println(user.getName()); // Alice

// Delete
client.deleteState("statestore", "user:42").block();

// Bulk get
List<String> keys = List.of("user:42", "user:43");
List<State<User>> states = client.getBulkState("statestore", keys, User.class).block();
```

## Service Invocation

> **Note:** The `invokeMethod` API is deprecated in the current Dapr Java SDK. The recommended approach is to use language-native HTTP or gRPC clients for service invocation instead.

```java
import io.dapr.client.domain.HttpExtension;

// GET request
byte[] response = client.invokeMethod(
    "inventory-service",
    "products/prod-1",
    null,
    HttpExtension.GET,
    byte[].class).block();

// POST request with body
Order order = new Order("ord-1", "Widget", 3, 29.99);
byte[] result = client.invokeMethod(
    "order-service",
    "orders",
    order,
    HttpExtension.POST,
    byte[].class).block();
```

## Publishing Events

```java
// Publish a simple event
client.publishEvent("pubsub", "order-placed",
    new OrderPlaced("ord-1", 99.99)).block();

// Publish with metadata
Map<String, String> metadata = Map.of(
    "cloudevent.traceid", "abc-123",
    "ttlInSeconds", "3600");
client.publishEvent("pubsub", "order-placed",
    new OrderPlaced("ord-2", 49.99), metadata).block();
```

## Secrets

```java
// Get a single secret
Map<String, String> secret = client.getSecret("secret-store", "db-password").block();
String password = secret.get("db-password");

// Get bulk secrets
Map<String, Map<String, String>> allSecrets = client.getBulkSecret("secret-store").block();
```

## Configuration

```java
import io.dapr.client.domain.ConfigurationItem;

// Get single item
ConfigurationItem item = client.getConfiguration("config-store", "feature-x").block();
System.out.println(item.getValue());

// Subscribe to changes
client.subscribeConfiguration("config-store", "feature-x")
    .doOnNext(update -> System.out.println("Config changed: " + update))
    .subscribe();
```

## Closing the Client

Always close the client to release the gRPC channel:

```java
try (DaprClient client = new DaprClientBuilder().build()) {
    // use client
}
```

## Summary

The Dapr Java client provides a reactive `Mono`/`Flux` based API for all building blocks. Calling `.block()` makes any operation synchronous for use in traditional Spring MVC or plain Java applications. For Spring Boot projects, the auto-configured `DaprClient` bean handles lifecycle management, so explicit `close()` calls are not required.
