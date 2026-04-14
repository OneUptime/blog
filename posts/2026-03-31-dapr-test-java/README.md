# How to Test Dapr Java Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Testing, Java, Unit Test, Integration Test

Description: Learn how to write unit and integration tests for Dapr Java applications using mocks, the Dapr testcontainer, and the Dapr test SDK.

---

## Introduction

Testing Dapr Java applications requires strategies for both unit tests (mocking the Dapr client) and integration tests (running a real Dapr sidecar). This guide covers both approaches so you can achieve high confidence in your services.

## Unit Testing with Mocks

Use Mockito to mock the `DaprClient` in unit tests:

```xml
<dependency>
  <groupId>org.mockito</groupId>
  <artifactId>mockito-core</artifactId>
  <version>5.11.0</version>
  <scope>test</scope>
</dependency>
```

```java
import io.dapr.client.DaprClient;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import reactor.core.publisher.Mono;

import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;

@ExtendWith(MockitoExtension.class)
class OrderServiceTest {

    @Mock
    private DaprClient daprClient;

    @InjectMocks
    private OrderService orderService;

    @Test
    void testSaveOrder() {
        Order order = new Order("order-1", "product-A", 2);

        when(daprClient.saveState(eq("statestore"), eq("order-1"), any()))
            .thenReturn(Mono.empty());

        orderService.saveOrder(order);

        verify(daprClient).saveState("statestore", "order-1", order);
    }

    @Test
    void testGetOrder() {
        Order expected = new Order("order-1", "product-A", 2);
        State<Order> state = new State<>("order-1", expected, null, null);

        when(daprClient.getState("statestore", "order-1", Order.class))
            .thenReturn(Mono.just(state));

        Order result = orderService.getOrder("order-1");
        assertEquals(expected.getId(), result.getId());
    }
}
```

## Integration Testing with Testcontainers

Use the Dapr Testcontainer to spin up a real sidecar in tests:

```xml
<dependency>
  <groupId>io.dapr</groupId>
  <artifactId>testcontainers-dapr</artifactId>
  <version>1.13.0</version>
  <scope>test</scope>
</dependency>
<dependency>
  <groupId>org.testcontainers</groupId>
  <artifactId>testcontainers</artifactId>
  <version>1.19.7</version>
  <scope>test</scope>
</dependency>
```

```java
import io.dapr.testcontainers.DaprContainer;
import org.junit.jupiter.api.Test;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@Testcontainers
class OrderIntegrationTest {

    @Container
    static DaprContainer dapr = new DaprContainer("daprio/daprd:1.14.0")
        .withAppName("order-service")
        .withComponent(new Component("statestore", "state.in-memory", "v1", Map.of()));

    @Test
    void testStateRoundTrip() {
        DaprClient client = new DaprClientBuilder()
            .withPropertyOverride(Properties.HTTP_ENDPOINT,
                "http://localhost:" + dapr.getHttpPort())
            .build();

        client.saveState("statestore", "key1", "value1").block();

        State<String> result = client.getState("statestore", "key1", String.class).block();
        assertEquals("value1", result.getValue());
    }
}
```

## Testing Pub/Sub Subscriptions

Test subscription handlers by calling them directly as HTTP endpoints:

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class SubscriberTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Test
    void testOrderCreatedHandler() {
        CloudEvent<Order> event = new CloudEvent<>();
        event.setData(new Order("order-99", "prod-A", 1));

        ResponseEntity<Void> resp = restTemplate.postForEntity(
            "/order-created",
            event,
            Void.class
        );

        assertEquals(200, resp.getStatusCodeValue());
    }
}
```

## Summary

Testing Dapr Java applications involves mocking `DaprClient` for fast unit tests and using Testcontainers with a real Dapr sidecar for integration tests. Combining both strategies gives you confidence that your business logic is correct and that your Dapr integrations work end-to-end before deploying to production.
