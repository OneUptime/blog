# How to Build Event-Driven Microservices with Spring Cloud Stream

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Java, Spring Cloud Stream, Event-Driven, Microservices, Kafka

Description: A practical guide to building event-driven microservices in Java using Spring Cloud Stream with Apache Kafka, covering producers, consumers, error handling, and testing strategies.

---

Event-driven architecture has become the go-to pattern for building scalable, loosely coupled microservices. Instead of services calling each other directly through HTTP, they communicate by publishing and subscribing to events. This approach reduces tight coupling, improves resilience, and allows services to scale independently.

Spring Cloud Stream provides a framework that abstracts away the messaging infrastructure, letting you focus on your business logic rather than the plumbing. Whether you're using Kafka, RabbitMQ, or another message broker, the programming model stays the same.

## Why Event-Driven Architecture?

Traditional request-response communication creates dependencies between services. When Service A calls Service B synchronously, Service A has to wait for a response. If Service B is slow or down, Service A suffers.

With event-driven communication, Service A publishes an event and moves on. Service B (and any other interested services) consumes the event when ready. This brings several advantages:

- Services can be deployed and scaled independently
- Temporary failures don't cascade through the system
- New consumers can subscribe to existing events without modifying producers
- Natural audit trail of everything that happens in the system

## Setting Up the Project

Start with a Spring Boot project and add the necessary dependencies. We'll use Kafka as our message broker, but switching to RabbitMQ later would require minimal code changes.

```xml
<dependencies>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.cloud</groupId>
        <artifactId>spring-cloud-stream</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.cloud</groupId>
        <artifactId>spring-cloud-stream-binder-kafka</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.kafka</groupId>
        <artifactId>spring-kafka</artifactId>
    </dependency>
</dependencies>

<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>org.springframework.cloud</groupId>
            <artifactId>spring-cloud-dependencies</artifactId>
            <version>2023.0.0</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
    </dependencies>
</dependencyManagement>
```

## Defining Your Events

Events should be self-contained and carry all the information consumers need. Avoid referencing external data that might change. Here's an example order event:

```java
public record OrderCreatedEvent(
    String orderId,
    String customerId,
    List<OrderItem> items,
    BigDecimal totalAmount,
    Instant createdAt
) {
    // Records give us immutability and built-in equals/hashCode
}

public record OrderItem(
    String productId,
    String productName,
    int quantity,
    BigDecimal price
) {}
```

Using Java records keeps your events simple and immutable. The event contains everything a consumer needs to process it - no callbacks to the order service required.

## Creating a Producer

Spring Cloud Stream uses a functional approach. Define a `Supplier` bean to produce events, or inject `StreamBridge` for more control over when events are sent.

```java
@Service
public class OrderService {

    private final StreamBridge streamBridge;

    public OrderService(StreamBridge streamBridge) {
        this.streamBridge = streamBridge;
    }

    public Order createOrder(CreateOrderRequest request) {
        // Create the order in your database
        Order order = orderRepository.save(new Order(
            UUID.randomUUID().toString(),
            request.customerId(),
            request.items(),
            calculateTotal(request.items()),
            Instant.now()
        ));

        // Publish the event
        OrderCreatedEvent event = new OrderCreatedEvent(
            order.getId(),
            order.getCustomerId(),
            order.getItems(),
            order.getTotalAmount(),
            order.getCreatedAt()
        );

        // Send to the "orders" topic
        streamBridge.send("orders-out-0", event);

        return order;
    }
}
```

Configure the binding in `application.yml`:

```yaml
spring:
  cloud:
    stream:
      bindings:
        orders-out-0:
          destination: orders
          content-type: application/json
      kafka:
        binder:
          brokers: localhost:9092
          auto-create-topics: true
```

The binding name `orders-out-0` follows Spring Cloud Stream conventions: the binding name, direction (out for producers), and index.

## Creating a Consumer

Consumers are even simpler. Define a `Consumer` or `Function` bean, and Spring Cloud Stream handles the subscription.

```java
@Configuration
public class OrderEventConsumer {

    private final InventoryService inventoryService;
    private final NotificationService notificationService;

    public OrderEventConsumer(InventoryService inventoryService,
                               NotificationService notificationService) {
        this.inventoryService = inventoryService;
        this.notificationService = notificationService;
    }

    @Bean
    public Consumer<OrderCreatedEvent> processOrder() {
        return event -> {
            // Reserve inventory for each item
            for (OrderItem item : event.items()) {
                inventoryService.reserve(item.productId(), item.quantity());
            }

            // Send confirmation to customer
            notificationService.sendOrderConfirmation(
                event.customerId(),
                event.orderId()
            );
        };
    }
}
```

Configure the consumer binding:

```yaml
spring:
  cloud:
    stream:
      bindings:
        processOrder-in-0:
          destination: orders
          group: inventory-service
          content-type: application/json
      function:
        definition: processOrder
```

The `group` property is critical for production. It ensures that in a cluster of consumers, each message is processed by only one instance. Without it, every instance would receive every message.

## Handling Errors

Things will go wrong. Network issues, invalid data, bugs in your code. Spring Cloud Stream provides several strategies for handling failures.

### Retry Configuration

```yaml
spring:
  cloud:
    stream:
      bindings:
        processOrder-in-0:
          consumer:
            max-attempts: 3
            back-off-initial-interval: 1000
            back-off-multiplier: 2.0
            back-off-max-interval: 10000
```

This retries failed messages up to 3 times with exponential backoff. Good for transient failures like temporary network issues.

### Dead Letter Queue

For messages that fail after all retries, send them to a dead letter queue for manual inspection:

```yaml
spring:
  cloud:
    stream:
      kafka:
        bindings:
          processOrder-in-0:
            consumer:
              enable-dlq: true
              dlq-name: orders.dlq
```

### Custom Error Handling

For more control, implement custom error handling:

```java
@Bean
public Consumer<OrderCreatedEvent> processOrder() {
    return event -> {
        try {
            processOrderInternal(event);
        } catch (InsufficientInventoryException e) {
            // Business exception - don't retry, handle gracefully
            handleInventoryShortage(event);
        } catch (Exception e) {
            // Technical exception - rethrow to trigger retry
            throw e;
        }
    };
}
```

## Event Routing and Filtering

Sometimes you need to route events to different destinations based on content. Spring Cloud Stream supports this through function composition.

```java
@Bean
public Function<OrderCreatedEvent, Message<OrderCreatedEvent>> routeOrder() {
    return event -> {
        String destination = event.totalAmount().compareTo(new BigDecimal("1000")) > 0
            ? "high-value-orders"
            : "standard-orders";

        return MessageBuilder
            .withPayload(event)
            .setHeader("spring.cloud.stream.sendto.destination", destination)
            .build();
    };
}
```

## Testing Your Event-Driven Services

Testing event-driven code requires a different approach than testing HTTP endpoints. Spring Cloud Stream provides test binders that work without a real message broker.

```java
@SpringBootTest
@Import(TestChannelBinderConfiguration.class)
class OrderEventConsumerTest {

    @Autowired
    private InputDestination input;

    @Autowired
    private OutputDestination output;

    @Test
    void shouldProcessOrderAndReserveInventory() {
        // Create test event
        OrderCreatedEvent event = new OrderCreatedEvent(
            "order-123",
            "customer-456",
            List.of(new OrderItem("prod-1", "Widget", 2, new BigDecimal("25.00"))),
            new BigDecimal("50.00"),
            Instant.now()
        );

        // Send to the consumer
        input.send(new GenericMessage<>(event), "orders");

        // Verify inventory was reserved
        verify(inventoryService).reserve("prod-1", 2);
    }
}
```

For integration tests with a real Kafka instance, use Testcontainers:

```java
@SpringBootTest
@Testcontainers
class OrderServiceIntegrationTest {

    @Container
    static KafkaContainer kafka = new KafkaContainer(
        DockerImageName.parse("confluentinc/cp-kafka:7.4.0")
    );

    @DynamicPropertySource
    static void kafkaProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.cloud.stream.kafka.binder.brokers", kafka::getBootstrapServers);
    }

    @Test
    void shouldPublishOrderCreatedEvent() {
        // Create order through the service
        orderService.createOrder(new CreateOrderRequest(...));

        // Consume and verify the event was published
        ConsumerRecord<String, OrderCreatedEvent> record =
            KafkaTestUtils.getSingleRecord(consumer, "orders");

        assertThat(record.value().orderId()).isNotNull();
    }
}
```

## Production Considerations

Before deploying to production, address these common concerns:

### Idempotency

Messages can be delivered more than once. Your consumers must handle duplicates gracefully:

```java
@Bean
public Consumer<OrderCreatedEvent> processOrder() {
    return event -> {
        // Check if we've already processed this order
        if (processedOrderRepository.exists(event.orderId())) {
            return; // Already processed, skip
        }

        processOrderInternal(event);

        // Mark as processed
        processedOrderRepository.save(event.orderId());
    };
}
```

### Ordering Guarantees

Kafka guarantees order within a partition. If order matters, ensure related events go to the same partition using message keys:

```java
streamBridge.send("orders-out-0",
    MessageBuilder
        .withPayload(event)
        .setHeader(KafkaHeaders.KEY, event.customerId()) // Same customer always goes to same partition
        .build()
);
```

### Monitoring

Add observability to track event processing:

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,metrics,bindings
  metrics:
    tags:
      application: ${spring.application.name}
```

## Wrapping Up

Spring Cloud Stream makes it straightforward to build event-driven microservices. The functional programming model keeps your code clean, and the abstraction layer means you can switch message brokers without rewriting your application.

Start simple with a single producer and consumer. Add error handling and retry logic early. Test with the test binder for unit tests and Testcontainers for integration tests. And always design your consumers to be idempotent.

Event-driven architecture is not a silver bullet, but for systems that need loose coupling, independent scalability, and resilience to failures, it's a solid foundation.
