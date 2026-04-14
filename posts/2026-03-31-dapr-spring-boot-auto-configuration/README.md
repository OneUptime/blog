# How to Configure Dapr with Spring Boot Auto-Configuration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Spring Boot, Auto-Configuration, Java, Configuration

Description: Learn how Dapr's Spring Boot auto-configuration works and how to customize beans, properties, and component wiring in your Java microservices.

---

## Introduction

The Dapr Spring Boot starter uses Spring Boot's auto-configuration mechanism to set up `DaprClient`, state repositories, and pub/sub templates automatically. Understanding how to customize this wiring lets you tailor Dapr to your application's needs.

## Starter Dependency

```xml
<dependency>
  <groupId>io.dapr.spring</groupId>
  <artifactId>dapr-spring-boot-starter</artifactId>
  <version>0.13.0</version>
</dependency>
```

## Default Auto-Configuration Properties

Available properties in `application.yml`:

```yaml
dapr:
  client:
    http-endpoint: http://localhost:3500
    grpc-endpoint: localhost:50001
  pubsub:
    name: pubsub
  statestore:
    name: statestore
```

## Customizing the DaprClient Bean

Override the auto-configured `DaprClient` by providing your own bean:

```java
import io.dapr.client.DaprClient;
import io.dapr.client.DaprClientBuilder;
import io.dapr.config.Properties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class DaprConfig {

    @Bean
    public DaprClient daprClient() {
        return new DaprClientBuilder()
            .withPropertyOverride(Properties.HTTP_ENDPOINT, "http://my-dapr-sidecar:3500")
            .withPropertyOverride(Properties.GRPC_ENDPOINT, "my-dapr-sidecar:50001")
            .build();
    }
}
```

## Using DaprStateStoreRepository

The auto-configuration provides a Spring Data-style repository backed by Dapr state store. Enable it with the `@EnableDaprRepositories` annotation and extend the standard `CrudRepository`:

```java
import org.springframework.data.repository.CrudRepository;

public interface OrderRepository extends CrudRepository<Order, String> {
}
```

Inject and use it like any Spring Data repository:

```java
@Service
public class OrderService {

    @Autowired
    private OrderRepository orderRepository;

    public void save(Order order) {
        orderRepository.save(order);
    }

    public Optional<Order> findById(String id) {
        return orderRepository.findById(id);
    }
}
```

## Configuring the State Store Name

Point the repository to a specific Dapr state store component:

```yaml
dapr:
  statestore:
    name: redis-statestore
```

## Customizing Pub/Sub with DaprMessagingTemplate

Use the auto-configured messaging template for type-safe event publishing:

```java
import io.dapr.spring.messaging.DaprMessagingTemplate;
import org.springframework.beans.factory.annotation.Autowired;

@Service
public class NotificationService {

    @Autowired
    private DaprMessagingTemplate<Order> messagingTemplate;

    public void sendNotification(Order order) {
        messagingTemplate.send("orders-topic", order);
    }
}
```

## Disabling Auto-Configuration

To disable specific auto-configured beans, use `@SpringBootApplication(exclude = ...)`:

```java
import io.dapr.spring.boot.autoconfigure.client.DaprClientAutoConfiguration;

@SpringBootApplication(exclude = {
    DaprClientAutoConfiguration.class
})
public class Application {
    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }
}
```

## Summary

Dapr's Spring Boot auto-configuration wires `DaprClient`, state repositories, and messaging templates based on application properties, following standard Spring Boot conventions. You can override any bean or property to customize the behavior for your specific infrastructure requirements.
