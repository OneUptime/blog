# How to Use the Spring Cloud GCP Starter for Pub/Sub to Build Event-Driven Microservices

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Pub/Sub, Spring Cloud, Microservices, Event-Driven, Java

Description: Build event-driven microservices using the Spring Cloud GCP Pub/Sub starter with publishers, subscribers, and Spring Integration channel adapters for reliable messaging.

---

Event-driven architecture is the backbone of scalable microservices. Instead of services calling each other directly, they communicate through events published to a message broker. Google Cloud Pub/Sub is the managed messaging service on GCP, and the Spring Cloud GCP Pub/Sub starter makes it feel native in a Spring Boot application.

In this post, I will show you how to set up publishers and subscribers using the Spring Cloud GCP Pub/Sub starter, including both the template-based approach and the Spring Integration channel adapter approach.

## Project Setup

Add the Spring Cloud GCP Pub/Sub starter to your project:

```xml
<!-- Spring Cloud GCP Pub/Sub starter -->
<dependency>
    <groupId>com.google.cloud</groupId>
    <artifactId>spring-cloud-gcp-starter-pubsub</artifactId>
</dependency>

<!-- Spring Integration for channel adapters (optional but recommended) -->
<dependency>
    <groupId>org.springframework.integration</groupId>
    <artifactId>spring-integration-core</artifactId>
</dependency>

<!-- Spring Boot Web for REST endpoints -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
</dependency>

<!-- Jackson for JSON serialization -->
<dependency>
    <groupId>com.fasterxml.jackson.core</groupId>
    <artifactId>jackson-databind</artifactId>
</dependency>
```

Configure the project properties:

```properties
# GCP project configuration
spring.cloud.gcp.project-id=my-project-id

# Pub/Sub subscription configuration
spring.cloud.gcp.pubsub.subscriber.parallel-pull-count=1
spring.cloud.gcp.pubsub.subscriber.max-ack-extension-period=36000

# JSON serialization for Pub/Sub messages
spring.cloud.gcp.pubsub.subscriber.flow-control.max-outstanding-element-count=100
```

## Publishing Messages with PubSubTemplate

The `PubSubTemplate` is the simplest way to publish messages. It is auto-configured by the starter.

```java
@Service
public class OrderEventPublisher {

    private final PubSubTemplate pubSubTemplate;
    private final ObjectMapper objectMapper;

    // PubSubTemplate is auto-configured and injected
    public OrderEventPublisher(PubSubTemplate pubSubTemplate, ObjectMapper objectMapper) {
        this.pubSubTemplate = pubSubTemplate;
        this.objectMapper = objectMapper;
    }

    // Publish an order event to the orders-topic
    public void publishOrderCreated(OrderEvent event) {
        try {
            String jsonPayload = objectMapper.writeValueAsString(event);

            // Publish with attributes for filtering
            Map<String, String> headers = Map.of(
                    "eventType", "ORDER_CREATED",
                    "version", "1.0"
            );

            ListenableFuture<String> future = pubSubTemplate.publish(
                    "orders-topic", jsonPayload, headers);

            // Add a callback to handle success or failure
            future.addCallback(
                    messageId -> System.out.println("Published message: " + messageId),
                    failure -> System.err.println("Failed to publish: " + failure.getMessage())
            );

        } catch (JsonProcessingException e) {
            throw new RuntimeException("Failed to serialize order event", e);
        }
    }
}
```

## Subscribing with PubSubTemplate

For pull-based subscriptions, you can use the template directly:

```java
@Service
public class OrderEventSubscriber {

    private final PubSubTemplate pubSubTemplate;
    private final ObjectMapper objectMapper;

    public OrderEventSubscriber(PubSubTemplate pubSubTemplate, ObjectMapper objectMapper) {
        this.pubSubTemplate = pubSubTemplate;
        this.objectMapper = objectMapper;
    }

    // Subscribe to the orders-subscription and process messages
    public void subscribe() {
        pubSubTemplate.subscribe("orders-subscription", message -> {
            try {
                String payload = message.getPubsubMessage()
                        .getData()
                        .toStringUtf8();

                OrderEvent event = objectMapper.readValue(payload, OrderEvent.class);

                // Process the order event
                processOrder(event);

                // Acknowledge the message after successful processing
                message.ack();

            } catch (Exception e) {
                System.err.println("Failed to process message: " + e.getMessage());
                // Nack the message so it gets redelivered
                message.nack();
            }
        });
    }

    private void processOrder(OrderEvent event) {
        System.out.println("Processing order: " + event.getOrderId());
        // Business logic here
    }
}
```

## Spring Integration Channel Adapters

The Spring Integration approach is more powerful and fits better into a production setup. You define inbound and outbound channel adapters that connect Pub/Sub topics and subscriptions to Spring Integration message channels.

```java
@Configuration
public class PubSubIntegrationConfig {

    // Inbound channel adapter - pulls messages from a Pub/Sub subscription
    // and sends them to the orderInputChannel
    @Bean
    public PubSubInboundChannelAdapter orderInboundAdapter(
            @Qualifier("orderInputChannel") MessageChannel inputChannel,
            PubSubTemplate pubSubTemplate) {

        PubSubInboundChannelAdapter adapter =
                new PubSubInboundChannelAdapter(pubSubTemplate, "orders-subscription");
        adapter.setOutputChannel(inputChannel);
        adapter.setAckMode(AckMode.MANUAL);
        adapter.setPayloadType(String.class);
        return adapter;
    }

    // Message channel for incoming order messages
    @Bean
    public MessageChannel orderInputChannel() {
        return new DirectChannel();
    }

    // Outbound channel adapter - publishes messages from the
    // orderOutputChannel to a Pub/Sub topic
    @Bean
    @ServiceActivator(inputChannel = "orderOutputChannel")
    public PubSubMessageHandler orderOutboundAdapter(PubSubTemplate pubSubTemplate) {
        PubSubMessageHandler handler = new PubSubMessageHandler(pubSubTemplate, "orders-topic");

        handler.setSuccessCallback((ackId, message) ->
                System.out.println("Message published successfully: " + ackId));
        handler.setFailureCallback((cause, message) ->
                System.err.println("Failed to publish: " + cause.getMessage()));

        return handler;
    }

    // Message channel for outgoing messages
    @Bean
    public MessageChannel orderOutputChannel() {
        return new DirectChannel();
    }
}
```

## Processing Messages with a Service Activator

With the channel adapter set up, you create a service activator to process incoming messages:

```java
@Service
public class OrderMessageProcessor {

    private final ObjectMapper objectMapper;

    public OrderMessageProcessor(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    // This method receives messages from the orderInputChannel
    @ServiceActivator(inputChannel = "orderInputChannel")
    public void processOrderMessage(Message<String> message) {
        try {
            String payload = message.getPayload();
            OrderEvent event = objectMapper.readValue(payload, OrderEvent.class);

            // Access Pub/Sub message attributes through headers
            String eventType = (String) message.getHeaders()
                    .get(GcpPubSubHeaders.ORIGINAL_MESSAGE);

            System.out.println("Received order event: " + event.getOrderId());

            // Process the event based on type
            handleOrderEvent(event);

            // Manually acknowledge after successful processing
            BasicAcknowledgeablePubsubMessage ack = message.getHeaders()
                    .get(GcpPubSubHeaders.ORIGINAL_MESSAGE,
                            BasicAcknowledgeablePubsubMessage.class);
            if (ack != null) {
                ack.ack();
            }

        } catch (Exception e) {
            System.err.println("Error processing order message: " + e.getMessage());

            // Nack the message for redelivery
            BasicAcknowledgeablePubsubMessage ack = message.getHeaders()
                    .get(GcpPubSubHeaders.ORIGINAL_MESSAGE,
                            BasicAcknowledgeablePubsubMessage.class);
            if (ack != null) {
                ack.nack();
            }
        }
    }

    private void handleOrderEvent(OrderEvent event) {
        // Route to appropriate handler based on event type
        switch (event.getEventType()) {
            case "ORDER_CREATED":
                System.out.println("New order created: " + event.getOrderId());
                break;
            case "ORDER_SHIPPED":
                System.out.println("Order shipped: " + event.getOrderId());
                break;
            default:
                System.out.println("Unknown event type: " + event.getEventType());
        }
    }
}
```

## The Event Model

Define a clean event class for your messages:

```java
// Order event that flows through the Pub/Sub messaging system
public class OrderEvent {
    private String orderId;
    private String customerId;
    private String eventType;
    private BigDecimal totalAmount;
    private List<String> itemIds;
    private Instant timestamp;

    public OrderEvent() {}

    public OrderEvent(String orderId, String customerId, String eventType,
                      BigDecimal totalAmount, List<String> itemIds) {
        this.orderId = orderId;
        this.customerId = customerId;
        this.eventType = eventType;
        this.totalAmount = totalAmount;
        this.itemIds = itemIds;
        this.timestamp = Instant.now();
    }

    // Getters and setters
    public String getOrderId() { return orderId; }
    public void setOrderId(String orderId) { this.orderId = orderId; }
    public String getCustomerId() { return customerId; }
    public void setCustomerId(String customerId) { this.customerId = customerId; }
    public String getEventType() { return eventType; }
    public void setEventType(String eventType) { this.eventType = eventType; }
    public BigDecimal getTotalAmount() { return totalAmount; }
    public void setTotalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; }
    public List<String> getItemIds() { return itemIds; }
    public void setItemIds(List<String> itemIds) { this.itemIds = itemIds; }
    public Instant getTimestamp() { return timestamp; }
    public void setTimestamp(Instant timestamp) { this.timestamp = timestamp; }
}
```

## REST Controller for Publishing

Expose an endpoint that triggers event publishing:

```java
@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderEventPublisher eventPublisher;

    public OrderController(OrderEventPublisher eventPublisher) {
        this.eventPublisher = eventPublisher;
    }

    // POST endpoint that creates an order and publishes an event
    @PostMapping
    public ResponseEntity<Map<String, String>> createOrder(@RequestBody OrderRequest request) {
        String orderId = UUID.randomUUID().toString();

        OrderEvent event = new OrderEvent(
                orderId,
                request.getCustomerId(),
                "ORDER_CREATED",
                request.getTotalAmount(),
                request.getItemIds());

        eventPublisher.publishOrderCreated(event);

        return ResponseEntity.ok(Map.of(
                "orderId", orderId,
                "status", "ORDER_CREATED"));
    }
}
```

## Dead Letter Topics

Configure a dead letter topic for messages that fail repeatedly:

```bash
# Create a dead letter topic and subscription
gcloud pubsub topics create orders-dead-letter

gcloud pubsub subscriptions update orders-subscription \
    --dead-letter-topic=orders-dead-letter \
    --max-delivery-attempts=5
```

After 5 delivery attempts, unprocessable messages move to the dead letter topic instead of blocking the subscription.

## Wrapping Up

The Spring Cloud GCP Pub/Sub starter gives you two clean ways to integrate Pub/Sub into your microservices. The `PubSubTemplate` approach is straightforward for simple publish-subscribe patterns. The Spring Integration channel adapter approach gives you more flexibility with message routing, transformation, and error handling. Either way, you get automatic credential management, JSON serialization, and manual acknowledgment support. Pair this with dead letter topics for messages that fail processing, and you have a solid foundation for event-driven microservices on GCP.
