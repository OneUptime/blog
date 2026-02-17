# How to Implement Pub/Sub Message Processing in a Spring Boot Application with Acknowledgment and Retry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Pub/Sub, Spring Boot, Message Processing, Retry, Java

Description: Implement reliable Pub/Sub message processing in Spring Boot with manual acknowledgment, retry policies, dead letter queues, and exactly-once processing patterns.

---

Processing messages from Pub/Sub reliably is harder than it looks. You need to handle acknowledgment correctly, deal with messages that fail processing, implement retries with backoff, and make sure you do not lose messages or process them twice. The Spring Cloud GCP Pub/Sub module gives you the building blocks, but assembling them into a production-ready consumer requires understanding the details.

This post covers building a robust Pub/Sub message consumer in Spring Boot with proper acknowledgment handling and retry logic.

## The Basics of Pub/Sub Acknowledgment

When Pub/Sub delivers a message to your subscriber, it expects an acknowledgment. If you do not acknowledge the message within the acknowledgment deadline (default 10 seconds), Pub/Sub will redeliver it. There are three actions you can take:

- **Ack** - Tell Pub/Sub the message was processed successfully. It will not be delivered again.
- **Nack** - Tell Pub/Sub to redeliver the message immediately.
- **Do nothing** - The message will be redelivered after the acknowledgment deadline expires.

The distinction between nack and doing nothing matters. Nacking triggers immediate redelivery, which can cause a tight retry loop if the failure is persistent.

## Project Setup

```xml
<!-- Spring Cloud GCP Pub/Sub starter -->
<dependency>
    <groupId>com.google.cloud</groupId>
    <artifactId>spring-cloud-gcp-starter-pubsub</artifactId>
</dependency>

<!-- Spring Boot Web -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
</dependency>

<!-- Jackson for JSON deserialization -->
<dependency>
    <groupId>com.fasterxml.jackson.core</groupId>
    <artifactId>jackson-databind</artifactId>
</dependency>
```

Configuration:

```properties
# GCP project
spring.cloud.gcp.project-id=my-project

# Subscriber settings
spring.cloud.gcp.pubsub.subscriber.parallel-pull-count=1
spring.cloud.gcp.pubsub.subscriber.executor-threads=4
spring.cloud.gcp.pubsub.subscriber.max-ack-extension-period=600

# Flow control to prevent overwhelming the application
spring.cloud.gcp.pubsub.subscriber.flow-control.max-outstanding-element-count=50
spring.cloud.gcp.pubsub.subscriber.flow-control.max-outstanding-request-bytes=10485760
```

## Manual Acknowledgment with PubSubTemplate

Here is a subscriber with manual acknowledgment:

```java
@Service
public class OrderMessageConsumer {

    private final PubSubTemplate pubSubTemplate;
    private final ObjectMapper objectMapper;
    private final OrderProcessingService orderService;

    public OrderMessageConsumer(PubSubTemplate pubSubTemplate,
                                 ObjectMapper objectMapper,
                                 OrderProcessingService orderService) {
        this.pubSubTemplate = pubSubTemplate;
        this.objectMapper = objectMapper;
        this.orderService = orderService;
    }

    // Start subscribing when the application is ready
    @PostConstruct
    public void startSubscription() {
        pubSubTemplate.subscribe("order-subscription", this::handleMessage);
    }

    // Process each message with manual acknowledgment
    private void handleMessage(BasicAcknowledgeablePubsubMessage message) {
        String payload = message.getPubsubMessage().getData().toStringUtf8();
        String messageId = message.getPubsubMessage().getMessageId();

        try {
            OrderEvent event = objectMapper.readValue(payload, OrderEvent.class);

            // Process the order
            orderService.processOrder(event);

            // Acknowledge only after successful processing
            message.ack();
            System.out.println("Successfully processed message: " + messageId);

        } catch (JsonProcessingException e) {
            // Message is malformed - ack it to prevent infinite redelivery
            System.err.println("Malformed message, acking to remove: " + messageId);
            message.ack();

        } catch (TransientException e) {
            // Transient error - nack for redelivery
            System.err.println("Transient error, nacking for retry: " + messageId);
            message.nack();

        } catch (Exception e) {
            // Unknown error - nack for redelivery
            System.err.println("Processing failed: " + e.getMessage());
            message.nack();
        }
    }
}
```

## Implementing Application-Level Retry

Nacking a message causes immediate redelivery, which can overwhelm your service if the failure persists. Add application-level retry with backoff:

```java
@Service
public class RetryableMessageProcessor {

    private final ObjectMapper objectMapper;
    private final OrderProcessingService orderService;

    // Maximum number of processing attempts before giving up
    private static final int MAX_RETRIES = 3;

    public RetryableMessageProcessor(ObjectMapper objectMapper,
                                      OrderProcessingService orderService) {
        this.objectMapper = objectMapper;
        this.orderService = orderService;
    }

    // Process a message with retry logic
    public void processWithRetry(BasicAcknowledgeablePubsubMessage message) {
        String payload = message.getPubsubMessage().getData().toStringUtf8();
        String messageId = message.getPubsubMessage().getMessageId();

        // Check delivery attempt count from Pub/Sub attributes
        int deliveryAttempt = getDeliveryAttempt(message);

        if (deliveryAttempt > MAX_RETRIES) {
            // Too many attempts - ack the message and log for manual review
            System.err.println("Max retries exceeded for message: " + messageId
                    + " (attempt " + deliveryAttempt + ")");
            message.ack();
            return;
        }

        try {
            OrderEvent event = objectMapper.readValue(payload, OrderEvent.class);
            orderService.processOrder(event);
            message.ack();

        } catch (Exception e) {
            System.err.println("Attempt " + deliveryAttempt + " failed for message "
                    + messageId + ": " + e.getMessage());

            // Modify ack deadline to implement backoff
            // Instead of nacking immediately, extend the deadline
            // and let it expire naturally for a delayed retry
            int backoffSeconds = (int) Math.pow(2, deliveryAttempt) * 10;
            message.modifyAckDeadline(backoffSeconds);
        }
    }

    private int getDeliveryAttempt(BasicAcknowledgeablePubsubMessage message) {
        // Pub/Sub includes delivery attempt count when dead lettering is enabled
        Map<String, String> attributes = message.getPubsubMessage().getAttributesMap();
        String attempt = attributes.get("googclient_deliveryattempt");
        return attempt != null ? Integer.parseInt(attempt) : 1;
    }
}
```

## Spring Integration Approach with Error Handling

For more structured message handling, use Spring Integration with error channels:

```java
@Configuration
public class PubSubIntegrationConfig {

    // Inbound adapter with manual acknowledgment
    @Bean
    public PubSubInboundChannelAdapter inboundAdapter(
            @Qualifier("inputChannel") MessageChannel channel,
            PubSubTemplate pubSubTemplate) {

        PubSubInboundChannelAdapter adapter =
                new PubSubInboundChannelAdapter(pubSubTemplate, "order-subscription");
        adapter.setOutputChannel(channel);
        adapter.setAckMode(AckMode.MANUAL);
        adapter.setPayloadType(String.class);
        // Route errors to the error channel
        adapter.setErrorChannelName("errorChannel");
        return adapter;
    }

    @Bean
    public MessageChannel inputChannel() {
        return new DirectChannel();
    }

    @Bean
    public MessageChannel errorChannel() {
        return new DirectChannel();
    }
}
```

```java
@Service
public class MessageHandler {

    private final ObjectMapper objectMapper;
    private final OrderProcessingService orderService;

    public MessageHandler(ObjectMapper objectMapper, OrderProcessingService orderService) {
        this.objectMapper = objectMapper;
        this.orderService = orderService;
    }

    // Handle successful messages
    @ServiceActivator(inputChannel = "inputChannel")
    public void handleMessage(Message<String> message) throws Exception {
        OrderEvent event = objectMapper.readValue(message.getPayload(), OrderEvent.class);
        orderService.processOrder(event);

        // Ack after successful processing
        BasicAcknowledgeablePubsubMessage ackMessage = message.getHeaders()
                .get(GcpPubSubHeaders.ORIGINAL_MESSAGE,
                        BasicAcknowledgeablePubsubMessage.class);
        if (ackMessage != null) {
            ackMessage.ack();
        }
    }

    // Handle errors from the error channel
    @ServiceActivator(inputChannel = "errorChannel")
    public void handleError(ErrorMessage errorMessage) {
        MessagingException exception = (MessagingException) errorMessage.getPayload();
        Message<?> failedMessage = exception.getFailedMessage();

        System.err.println("Message processing failed: " + exception.getMessage());

        // Nack the original message for redelivery
        if (failedMessage != null) {
            BasicAcknowledgeablePubsubMessage ackMessage = failedMessage.getHeaders()
                    .get(GcpPubSubHeaders.ORIGINAL_MESSAGE,
                            BasicAcknowledgeablePubsubMessage.class);
            if (ackMessage != null) {
                ackMessage.nack();
            }
        }
    }
}
```

## Dead Letter Queue Configuration

Configure a dead letter topic so messages that fail repeatedly are moved out of the main queue:

```bash
# Create the dead letter topic and subscription
gcloud pubsub topics create order-dead-letter
gcloud pubsub subscriptions create order-dead-letter-sub \
    --topic=order-dead-letter

# Update the main subscription with dead letter policy
gcloud pubsub subscriptions update order-subscription \
    --dead-letter-topic=order-dead-letter \
    --max-delivery-attempts=5

# Grant Pub/Sub permission to publish to the dead letter topic
gcloud pubsub topics add-iam-policy-binding order-dead-letter \
    --member="serviceAccount:service-PROJECT_NUMBER@gcp-sa-pubsub.iam.gserviceaccount.com" \
    --role="roles/pubsub.publisher"
```

## Idempotent Processing

Pub/Sub guarantees at-least-once delivery, which means you might receive the same message more than once. Make your processing idempotent:

```java
@Service
public class IdempotentOrderProcessor {

    // Track processed message IDs to prevent duplicate processing
    private final Set<String> processedIds = ConcurrentHashMap.newKeySet();
    private final OrderProcessingService orderService;

    public IdempotentOrderProcessor(OrderProcessingService orderService) {
        this.orderService = orderService;
    }

    // Process the order only if we have not seen this message before
    public boolean processIfNew(String messageId, OrderEvent event) {
        // Check if already processed
        if (!processedIds.add(messageId)) {
            System.out.println("Duplicate message detected, skipping: " + messageId);
            return false;
        }

        try {
            orderService.processOrder(event);
            return true;
        } catch (Exception e) {
            // Remove from processed set so it can be retried
            processedIds.remove(messageId);
            throw e;
        }
    }
}
```

For production, replace the in-memory set with a Redis or Memorystore lookup so it works across multiple instances.

## Monitoring and Observability

Track message processing metrics:

```java
@Component
public class MessageMetrics {

    private final AtomicLong messagesReceived = new AtomicLong(0);
    private final AtomicLong messagesProcessed = new AtomicLong(0);
    private final AtomicLong messagesFailed = new AtomicLong(0);

    public void recordReceived() { messagesReceived.incrementAndGet(); }
    public void recordProcessed() { messagesProcessed.incrementAndGet(); }
    public void recordFailed() { messagesFailed.incrementAndGet(); }

    // Expose as an actuator endpoint
    @RestController
    @RequestMapping("/api/metrics/pubsub")
    public class MetricsEndpoint {
        @GetMapping
        public Map<String, Long> getMetrics() {
            return Map.of(
                    "received", messagesReceived.get(),
                    "processed", messagesProcessed.get(),
                    "failed", messagesFailed.get());
        }
    }
}
```

## Wrapping Up

Reliable Pub/Sub message processing requires careful attention to acknowledgment timing, retry strategies, and idempotency. Use manual acknowledgment to control when messages are removed from the subscription. Implement application-level retry with backoff instead of relying solely on nack for retries. Configure dead letter topics as a safety net for messages that cannot be processed after multiple attempts. And always make your processing logic idempotent because Pub/Sub guarantees at-least-once delivery, not exactly-once.
