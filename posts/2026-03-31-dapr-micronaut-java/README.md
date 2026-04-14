# How to Use Dapr with Micronaut Java Framework

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Micronaut, Java, Microservice, Cloud Native

Description: Build cloud-native Java microservices using Micronaut and Dapr for state management, service invocation, and pub/sub with minimal runtime overhead.

---

Micronaut performs dependency injection at compile time, resulting in extremely fast startup times and low memory usage - properties that make it ideal for sidecar-based architectures like Dapr. This guide shows how to build a Micronaut service that integrates with Dapr's building blocks.

## Setting Up Micronaut with Dapr

Generate a new Micronaut project:

```bash
mn create-app com.example.notification-service \
  --features=graalvm,jackson-databind,http-client \
  --build=maven \
  --lang=java
cd notification-service
```

Add Dapr SDK to `pom.xml`:

```xml
<dependency>
    <groupId>io.dapr</groupId>
    <artifactId>dapr-sdk</artifactId>
    <version>1.10.0</version>
</dependency>
<dependency>
    <groupId>io.micronaut.reactor</groupId>
    <artifactId>micronaut-reactor</artifactId>
</dependency>
<dependency>
    <groupId>io.micronaut</groupId>
    <artifactId>micronaut-http-client</artifactId>
</dependency>
```

## Creating a Dapr Client Bean

Use Micronaut's `@Factory` to create the Dapr client:

```java
// src/main/java/com/example/DaprClientFactory.java
package com.example;

import io.dapr.client.DaprClient;
import io.dapr.client.DaprClientBuilder;
import io.micronaut.context.annotation.Factory;
import io.micronaut.context.annotation.Bean;
import jakarta.inject.Singleton;

@Factory
public class DaprClientFactory {

    @Bean
    @Singleton
    public DaprClient daprClient() {
        return new DaprClientBuilder().build();
    }
}
```

## Building Notification Service with Dapr

```java
// src/main/java/com/example/NotificationController.java
package com.example;

import io.dapr.client.DaprClient;
import io.micronaut.http.HttpResponse;
import io.micronaut.http.annotation.*;
import jakarta.inject.Inject;
import reactor.core.publisher.Mono;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Controller("/notifications")
public class NotificationController {

    private static final String STATE_STORE = "statestore";
    private static final String PUBSUB = "pubsub";

    @Inject
    private DaprClient daprClient;

    @Get
    public Mono<List<Notification>> getAll() {
        return daprClient
            .getState(STATE_STORE, "notifications", List.class)
            .map(state -> state.getValue() != null
                ? (List<Notification>) state.getValue()
                : new ArrayList<>());
    }

    @Post
    public Mono<HttpResponse<Notification>> send(@Body Notification notification) {
        notification.setId(UUID.randomUUID().toString());
        notification.setSentAt(java.time.Instant.now().toString());

        // Invoke email service via Dapr
        return daprClient.invokeMethod(
            "email-service",
            "send",
            notification,
            io.dapr.client.domain.HttpExtension.POST,
            null,
            Void.class
        )
        .then(daprClient.saveState(STATE_STORE, "notif-" + notification.getId(), notification))
        .then(daprClient.publishEvent(PUBSUB, "notification-sent", notification))
        .thenReturn(HttpResponse.created(notification));
    }

    @Get("/{id}")
    public Mono<HttpResponse<Notification>> getById(@PathVariable String id) {
        return daprClient
            .getState(STATE_STORE, "notif-" + id, Notification.class)
            .map(state -> {
                if (state.getValue() == null) {
                    return HttpResponse.<Notification>notFound();
                }
                return HttpResponse.ok(state.getValue());
            });
    }
}
```

## Pub/Sub Subscription Handler

```java
// src/main/java/com/example/EventController.java
package com.example;

import io.dapr.client.DaprClient;
import io.micronaut.http.HttpResponse;
import io.micronaut.http.MediaType;
import io.micronaut.http.annotation.*;
import jakarta.inject.Inject;

import java.util.List;
import java.util.Map;

@Controller("/dapr")
public class EventController {

    @Inject
    private DaprClient daprClient;

    @Get(value = "/subscribe", produces = MediaType.APPLICATION_JSON)
    public List<Map<String, String>> subscribe() {
        return List.of(
            Map.of(
                "pubsubname", "pubsub",
                "topic", "user-registered",
                "route", "/dapr/events/user-registered"
            )
        );
    }

    @Post("/events/user-registered")
    public HttpResponse<String> handleUserRegistered(@Body Map<String, Object> cloudEvent) {
        @SuppressWarnings("unchecked")
        Map<String, String> data = (Map<String, String>) cloudEvent.get("data");
        String userId = data.get("user_id");
        String email = data.get("email");

        // Send welcome notification
        Notification welcome = new Notification();
        welcome.setRecipient(email);
        welcome.setMessage("Welcome to our platform, user " + userId);
        welcome.setChannel("email");

        daprClient.publishEvent("pubsub", "notification-created", welcome).subscribe();

        return HttpResponse.ok("SUCCESS");
    }
}
```

## Micronaut Configuration for Dapr

```yaml
# src/main/resources/application.yml
micronaut:
  application:
    name: notification-service
  server:
    port: 8080

dapr:
  http:
    port: ${DAPR_HTTP_PORT:3500}
```

## Running with Dapr

```bash
dapr run \
  --app-id notification-service \
  --app-port 8080 \
  --dapr-http-port 3500 \
  -- ./mvnw mn:run
```

## Summary

Micronaut's compile-time DI and minimal runtime footprint complement Dapr's sidecar architecture perfectly. Using `@Factory` to create the Dapr client bean and reactive Mono chains for state and pub/sub operations keeps the code clean while benefiting from Micronaut's low-overhead dependency injection.
