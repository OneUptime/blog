# How to Build an Async Message Producer with Spring Boot and the Java Pub/Sub Client Library

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Pub/Sub, Spring Boot, Async, Java, Messaging

Description: Build an asynchronous message producer using Spring Boot and the native Java Pub/Sub client library with batching, flow control, ordering keys, and error handling.

---

When you need to publish messages to Pub/Sub from a Spring Boot application, you have two choices: the Spring Cloud GCP Pub/Sub template or the native Google Cloud Pub/Sub Java client library. The Spring wrapper is convenient, but the native client gives you more control over batching, flow control, and error handling. For high-throughput producers, that control matters.

In this post, I will build an async message producer using the native Java Pub/Sub client library within a Spring Boot application.

## Dependencies

```xml
<!-- Google Cloud Pub/Sub client library -->
<dependency>
    <groupId>com.google.cloud</groupId>
    <artifactId>google-cloud-pubsub</artifactId>
    <version>1.126.0</version>
</dependency>

<!-- Spring Boot Web -->
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

## Configuring the Publisher

The `Publisher` client is thread-safe and should be created once and reused. It internally manages a buffer and sends batches of messages to Pub/Sub.

```java
@Configuration
public class PubSubPublisherConfig {

    @Value("${pubsub.project-id}")
    private String projectId;

    @Value("${pubsub.topic}")
    private String topicId;

    // Create a Publisher bean with optimized batching settings
    @Bean
    public Publisher publisher() throws IOException {
        TopicName topicName = TopicName.of(projectId, topicId);

        // Configure batching to group messages before sending
        BatchingSettings batchingSettings = BatchingSettings.newBuilder()
                // Send a batch when 100 messages accumulate
                .setElementCountThreshold(100L)
                // Or when the batch reaches 1MB
                .setRequestByteThreshold(1024 * 1024L) // 1MB
                // Or after 50ms, whichever comes first
                .setDelayThreshold(Duration.ofMillis(50))
                .build();

        // Configure retry settings for failed publishes
        RetrySettings retrySettings = RetrySettings.newBuilder()
                .setInitialRetryDelay(Duration.ofMillis(100))
                .setRetryDelayMultiplier(2.0)
                .setMaxRetryDelay(Duration.ofSeconds(60))
                .setTotalTimeout(Duration.ofSeconds(600))
                .setInitialRpcTimeout(Duration.ofSeconds(10))
                .setMaxRpcTimeout(Duration.ofSeconds(60))
                .build();

        // Flow control to prevent the publisher from buffering too many messages
        FlowControlSettings flowControlSettings = FlowControlSettings.newBuilder()
                .setMaxOutstandingElementCount(10000L)
                .setMaxOutstandingRequestBytes(100 * 1024 * 1024L) // 100MB
                .setLimitExceededBehavior(
                        FlowControlSettings.LimitExceededBehavior.Block)
                .build();

        return Publisher.newBuilder(topicName)
                .setBatchingSettings(batchingSettings)
                .setRetrySettings(retrySettings)
                .setFlowControlSettings(flowControlSettings)
                .setEnableMessageOrdering(false) // Enable if you need ordering
                .build();
    }

    // Shutdown the publisher gracefully when the application stops
    @PreDestroy
    public void shutdownPublisher() throws Exception {
        publisher().shutdown();
        publisher().awaitTermination(30, TimeUnit.SECONDS);
    }
}
```

## The Message Producer Service

Create a service that wraps the publisher with application-specific logic:

```java
@Service
public class EventProducer {

    private static final Logger log = LoggerFactory.getLogger(EventProducer.class);

    private final Publisher publisher;
    private final ObjectMapper objectMapper;

    // Track publish metrics
    private final AtomicLong publishedCount = new AtomicLong(0);
    private final AtomicLong failedCount = new AtomicLong(0);

    public EventProducer(Publisher publisher, ObjectMapper objectMapper) {
        this.publisher = publisher;
        this.objectMapper = objectMapper;
    }

    // Publish a single event asynchronously
    public CompletableFuture<String> publishEvent(EventPayload event) {
        try {
            String jsonData = objectMapper.writeValueAsString(event);

            // Build the Pub/Sub message with data and attributes
            PubsubMessage message = PubsubMessage.newBuilder()
                    .setData(ByteString.copyFromUtf8(jsonData))
                    .putAttributes("eventType", event.getEventType())
                    .putAttributes("timestamp", Instant.now().toString())
                    .putAttributes("source", "spring-boot-producer")
                    .build();

            // Publish returns an ApiFuture with the message ID
            ApiFuture<String> future = publisher.publish(message);

            // Convert to CompletableFuture for easier composition
            CompletableFuture<String> result = new CompletableFuture<>();

            ApiFutures.addCallback(future, new ApiFutureCallback<>() {
                @Override
                public void onSuccess(String messageId) {
                    publishedCount.incrementAndGet();
                    log.debug("Published message: {}", messageId);
                    result.complete(messageId);
                }

                @Override
                public void onFailure(Throwable t) {
                    failedCount.incrementAndGet();
                    log.error("Failed to publish event: {}", event.getEventType(), t);
                    result.completeExceptionally(t);
                }
            }, MoreExecutors.directExecutor());

            return result;

        } catch (JsonProcessingException e) {
            return CompletableFuture.failedFuture(
                    new RuntimeException("Failed to serialize event", e));
        }
    }

    // Publish a batch of events and wait for all to complete
    public List<String> publishBatch(List<EventPayload> events) {
        List<CompletableFuture<String>> futures = events.stream()
                .map(this::publishEvent)
                .collect(Collectors.toList());

        // Wait for all publishes to complete
        return futures.stream()
                .map(f -> {
                    try {
                        return f.get(30, TimeUnit.SECONDS);
                    } catch (Exception e) {
                        log.error("Batch publish failed for one message", e);
                        return null;
                    }
                })
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
    }

    // Get publish statistics
    public Map<String, Long> getStats() {
        return Map.of(
                "published", publishedCount.get(),
                "failed", failedCount.get());
    }
}
```

## Message Ordering

If you need messages to be delivered in order, enable message ordering and set an ordering key:

```java
// Publish ordered messages for a specific entity
public CompletableFuture<String> publishOrderedEvent(String entityId, EventPayload event) {
    try {
        String jsonData = objectMapper.writeValueAsString(event);

        PubsubMessage message = PubsubMessage.newBuilder()
                .setData(ByteString.copyFromUtf8(jsonData))
                // The ordering key ensures messages with the same key
                // are delivered in order
                .setOrderingKey(entityId)
                .putAttributes("eventType", event.getEventType())
                .build();

        ApiFuture<String> future = publisher.publish(message);

        CompletableFuture<String> result = new CompletableFuture<>();
        ApiFutures.addCallback(future, new ApiFutureCallback<>() {
            @Override
            public void onSuccess(String messageId) {
                result.complete(messageId);
            }

            @Override
            public void onFailure(Throwable t) {
                // When ordering is enabled, a failed publish blocks
                // subsequent messages with the same ordering key.
                // Resume publishing for this key:
                publisher.resumePublish(entityId);
                result.completeExceptionally(t);
            }
        }, MoreExecutors.directExecutor());

        return result;
    } catch (JsonProcessingException e) {
        return CompletableFuture.failedFuture(e);
    }
}
```

When message ordering is enabled in the Publisher configuration, all messages with the same ordering key are guaranteed to be delivered to subscribers in the order they were published.

## REST Controller

Expose endpoints for publishing events:

```java
@RestController
@RequestMapping("/api/events")
public class EventController {

    private final EventProducer eventProducer;

    public EventController(EventProducer eventProducer) {
        this.eventProducer = eventProducer;
    }

    // Publish a single event
    @PostMapping
    public ResponseEntity<Map<String, String>> publishEvent(@RequestBody EventPayload event) {
        try {
            String messageId = eventProducer.publishEvent(event).get(10, TimeUnit.SECONDS);
            return ResponseEntity.ok(Map.of(
                    "messageId", messageId,
                    "status", "published"));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of(
                    "error", e.getMessage()));
        }
    }

    // Publish a batch of events
    @PostMapping("/batch")
    public ResponseEntity<Map<String, Object>> publishBatch(
            @RequestBody List<EventPayload> events) {

        List<String> messageIds = eventProducer.publishBatch(events);

        return ResponseEntity.ok(Map.of(
                "published", messageIds.size(),
                "total", events.size(),
                "messageIds", messageIds));
    }

    // Fire-and-forget async publish
    @PostMapping("/async")
    public ResponseEntity<Map<String, String>> publishAsync(@RequestBody EventPayload event) {
        eventProducer.publishEvent(event); // Don't wait for the result
        return ResponseEntity.accepted().body(Map.of("status", "accepted"));
    }

    // Get producer statistics
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Long>> getStats() {
        return ResponseEntity.ok(eventProducer.getStats());
    }
}
```

## The Event Payload

```java
// Event payload class for the messages
public class EventPayload {
    private String eventType;
    private String entityId;
    private Map<String, Object> data;
    private Instant timestamp;

    public EventPayload() {
        this.timestamp = Instant.now();
    }

    public EventPayload(String eventType, String entityId, Map<String, Object> data) {
        this.eventType = eventType;
        this.entityId = entityId;
        this.data = data;
        this.timestamp = Instant.now();
    }

    // Getters and setters
    public String getEventType() { return eventType; }
    public void setEventType(String eventType) { this.eventType = eventType; }
    public String getEntityId() { return entityId; }
    public void setEntityId(String entityId) { this.entityId = entityId; }
    public Map<String, Object> getData() { return data; }
    public void setData(Map<String, Object> data) { this.data = data; }
    public Instant getTimestamp() { return timestamp; }
    public void setTimestamp(Instant timestamp) { this.timestamp = timestamp; }
}
```

## Application Properties

```properties
# Pub/Sub configuration
pubsub.project-id=my-project
pubsub.topic=events-topic

# Server configuration
server.port=8080
```

## Wrapping Up

The native Java Pub/Sub client library gives you fine-grained control over message publishing in a Spring Boot application. The batching settings let you tune the tradeoff between latency and throughput. Flow control prevents the publisher from overwhelming your application's memory. Message ordering guarantees delivery sequence for related messages. For most applications, the async fire-and-forget pattern with batch publishing provides the best throughput, while the synchronous approach is better when you need to confirm that each message was accepted before proceeding.
