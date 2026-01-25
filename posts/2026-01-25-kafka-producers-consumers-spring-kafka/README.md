# How to Build Kafka Producers and Consumers with Spring Kafka

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Java, Spring Kafka, Apache Kafka, Messaging, Event-Driven

Description: A practical guide to building Kafka producers and consumers using Spring Kafka, covering configuration, message serialization, error handling, and testing strategies.

---

Apache Kafka has become the backbone of many event-driven architectures. When you need to integrate Kafka with Spring Boot applications, Spring Kafka provides a clean abstraction that handles the complexity while giving you full control when needed.

This guide walks through building production-ready producers and consumers with Spring Kafka. We will cover the essentials first, then move into error handling, serialization, and testing.

## Project Setup

Start by adding the Spring Kafka dependency to your `pom.xml`:

```xml
<dependencies>
    <dependency>
        <groupId>org.springframework.kafka</groupId>
        <artifactId>spring-kafka</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter</artifactId>
    </dependency>
    <!-- For JSON serialization -->
    <dependency>
        <groupId>com.fasterxml.jackson.core</groupId>
        <artifactId>jackson-databind</artifactId>
    </dependency>
    <!-- For testing -->
    <dependency>
        <groupId>org.springframework.kafka</groupId>
        <artifactId>spring-kafka-test</artifactId>
        <scope>test</scope>
    </dependency>
</dependencies>
```

## Basic Configuration

Configure your Kafka connection in `application.yml`:

```yaml
spring:
  kafka:
    bootstrap-servers: localhost:9092
    consumer:
      group-id: my-application
      auto-offset-reset: earliest
      key-deserializer: org.apache.kafka.common.serialization.StringDeserializer
      value-deserializer: org.springframework.kafka.support.serializer.JsonDeserializer
      properties:
        spring.json.trusted.packages: "com.example.events"
    producer:
      key-serializer: org.apache.kafka.common.serialization.StringSerializer
      value-serializer: org.springframework.kafka.support.serializer.JsonSerializer
```

## Building a Producer

Let's create a producer that sends order events. First, define the event class:

```java
// OrderEvent.java - The message payload
public class OrderEvent {
    private String orderId;
    private String customerId;
    private BigDecimal amount;
    private String status;
    private LocalDateTime timestamp;

    // Default constructor required for JSON deserialization
    public OrderEvent() {}

    public OrderEvent(String orderId, String customerId,
                      BigDecimal amount, String status) {
        this.orderId = orderId;
        this.customerId = customerId;
        this.amount = amount;
        this.status = status;
        this.timestamp = LocalDateTime.now();
    }

    // Getters and setters omitted for brevity
}
```

Now create the producer service:

```java
@Service
public class OrderEventProducer {

    private static final Logger log = LoggerFactory.getLogger(OrderEventProducer.class);
    private static final String TOPIC = "order-events";

    private final KafkaTemplate<String, OrderEvent> kafkaTemplate;

    public OrderEventProducer(KafkaTemplate<String, OrderEvent> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

    // Fire-and-forget style - use when you don't need confirmation
    public void sendAsync(OrderEvent event) {
        kafkaTemplate.send(TOPIC, event.getOrderId(), event);
        log.info("Sent order event asynchronously: {}", event.getOrderId());
    }

    // Synchronous send with confirmation - use for critical messages
    public void sendSync(OrderEvent event) {
        try {
            // Block until the message is acknowledged
            SendResult<String, OrderEvent> result = kafkaTemplate
                .send(TOPIC, event.getOrderId(), event)
                .get(10, TimeUnit.SECONDS);

            RecordMetadata metadata = result.getRecordMetadata();
            log.info("Message sent to partition {} with offset {}",
                metadata.partition(), metadata.offset());

        } catch (InterruptedException | ExecutionException | TimeoutException e) {
            log.error("Failed to send order event: {}", event.getOrderId(), e);
            throw new RuntimeException("Failed to send message", e);
        }
    }

    // Async with callback - good balance of performance and reliability
    public CompletableFuture<SendResult<String, OrderEvent>> sendWithCallback(
            OrderEvent event) {

        CompletableFuture<SendResult<String, OrderEvent>> future =
            kafkaTemplate.send(TOPIC, event.getOrderId(), event);

        future.whenComplete((result, ex) -> {
            if (ex == null) {
                log.info("Order event sent successfully: {} to partition {}",
                    event.getOrderId(),
                    result.getRecordMetadata().partition());
            } else {
                log.error("Failed to send order event: {}", event.getOrderId(), ex);
                // Handle failure - retry, dead letter queue, alert, etc.
            }
        });

        return future;
    }
}
```

## Building a Consumer

Consumers in Spring Kafka use the `@KafkaListener` annotation. Here's a straightforward implementation:

```java
@Service
public class OrderEventConsumer {

    private static final Logger log = LoggerFactory.getLogger(OrderEventConsumer.class);

    private final OrderService orderService;

    public OrderEventConsumer(OrderService orderService) {
        this.orderService = orderService;
    }

    @KafkaListener(
        topics = "order-events",
        groupId = "order-processing-group"
    )
    public void consume(OrderEvent event) {
        log.info("Received order event: {} with status: {}",
            event.getOrderId(), event.getStatus());

        try {
            orderService.processOrder(event);
        } catch (Exception e) {
            log.error("Error processing order: {}", event.getOrderId(), e);
            throw e; // Let the error handler deal with it
        }
    }

    // Access message metadata when you need partition, offset, or headers
    @KafkaListener(
        topics = "order-events",
        groupId = "order-analytics-group"
    )
    public void consumeWithMetadata(
            @Payload OrderEvent event,
            @Header(KafkaHeaders.RECEIVED_PARTITION) int partition,
            @Header(KafkaHeaders.OFFSET) long offset,
            @Header(KafkaHeaders.RECEIVED_TIMESTAMP) long timestamp) {

        log.info("Processing event from partition {} offset {} timestamp {}",
            partition, offset, timestamp);

        // Process the event
    }
}
```

## Advanced Producer Configuration

For production environments, you need more control over producer behavior:

```java
@Configuration
public class KafkaProducerConfig {

    @Value("${spring.kafka.bootstrap-servers}")
    private String bootstrapServers;

    @Bean
    public ProducerFactory<String, OrderEvent> producerFactory() {
        Map<String, Object> config = new HashMap<>();

        // Connection settings
        config.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);

        // Serialization
        config.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG,
            StringSerializer.class);
        config.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG,
            JsonSerializer.class);

        // Reliability settings - "all" means wait for all replicas
        config.put(ProducerConfig.ACKS_CONFIG, "all");

        // Retry settings - handle transient failures
        config.put(ProducerConfig.RETRIES_CONFIG, 3);
        config.put(ProducerConfig.RETRY_BACKOFF_MS_CONFIG, 1000);

        // Idempotence - prevents duplicates on retry
        config.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true);

        // Batching for throughput
        config.put(ProducerConfig.BATCH_SIZE_CONFIG, 16384);
        config.put(ProducerConfig.LINGER_MS_CONFIG, 5);

        return new DefaultKafkaProducerFactory<>(config);
    }

    @Bean
    public KafkaTemplate<String, OrderEvent> kafkaTemplate() {
        return new KafkaTemplate<>(producerFactory());
    }
}
```

## Error Handling in Consumers

Robust error handling separates production code from demo code. Spring Kafka provides several strategies:

```java
@Configuration
@EnableKafka
public class KafkaConsumerConfig {

    @Value("${spring.kafka.bootstrap-servers}")
    private String bootstrapServers;

    @Bean
    public ConsumerFactory<String, OrderEvent> consumerFactory() {
        Map<String, Object> config = new HashMap<>();

        config.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        config.put(ConsumerConfig.GROUP_ID_CONFIG, "order-processing-group");
        config.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG,
            StringDeserializer.class);
        config.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG,
            JsonDeserializer.class);
        config.put(JsonDeserializer.TRUSTED_PACKAGES, "com.example.events");

        // Start from earliest offset if no committed offset exists
        config.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");

        return new DefaultKafkaConsumerFactory<>(config);
    }

    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, OrderEvent>
            kafkaListenerContainerFactory() {

        ConcurrentKafkaListenerContainerFactory<String, OrderEvent> factory =
            new ConcurrentKafkaListenerContainerFactory<>();

        factory.setConsumerFactory(consumerFactory());

        // Retry failed messages up to 3 times with backoff
        factory.setCommonErrorHandler(new DefaultErrorHandler(
            new FixedBackOff(1000L, 3L)
        ));

        // Process 3 partitions concurrently
        factory.setConcurrency(3);

        return factory;
    }
}
```

For messages that fail repeatedly, route them to a dead letter topic:

```java
@Bean
public ConcurrentKafkaListenerContainerFactory<String, OrderEvent>
        kafkaListenerContainerFactory(
            KafkaTemplate<String, OrderEvent> kafkaTemplate) {

    ConcurrentKafkaListenerContainerFactory<String, OrderEvent> factory =
        new ConcurrentKafkaListenerContainerFactory<>();

    factory.setConsumerFactory(consumerFactory());

    // Send to dead letter topic after 3 retries
    DeadLetterPublishingRecoverer recoverer =
        new DeadLetterPublishingRecoverer(kafkaTemplate,
            (record, ex) -> new TopicPartition(
                record.topic() + ".DLT",
                record.partition()));

    DefaultErrorHandler errorHandler = new DefaultErrorHandler(
        recoverer,
        new FixedBackOff(1000L, 3L)
    );

    // Don't retry these exceptions - they won't succeed on retry
    errorHandler.addNotRetryableExceptions(
        ValidationException.class,
        DeserializationException.class
    );

    factory.setCommonErrorHandler(errorHandler);

    return factory;
}
```

## Testing Producers and Consumers

Spring Kafka provides an embedded Kafka broker for integration tests:

```java
@SpringBootTest
@EmbeddedKafka(
    partitions = 1,
    topics = {"order-events"},
    brokerProperties = {"listeners=PLAINTEXT://localhost:9092"}
)
class OrderEventIntegrationTest {

    @Autowired
    private OrderEventProducer producer;

    @Autowired
    private KafkaTemplate<String, OrderEvent> kafkaTemplate;

    @Autowired
    private EmbeddedKafkaBroker embeddedKafka;

    private Consumer<String, OrderEvent> consumer;

    @BeforeEach
    void setUp() {
        Map<String, Object> consumerProps = KafkaTestUtils.consumerProps(
            "test-group", "true", embeddedKafka);
        consumerProps.put(JsonDeserializer.TRUSTED_PACKAGES, "*");

        consumer = new DefaultKafkaConsumerFactory<String, OrderEvent>(
            consumerProps,
            new StringDeserializer(),
            new JsonDeserializer<>(OrderEvent.class)
        ).createConsumer();

        embeddedKafka.consumeFromAllEmbeddedTopics(consumer);
    }

    @AfterEach
    void tearDown() {
        consumer.close();
    }

    @Test
    void shouldSendAndReceiveOrderEvent() {
        // Given
        OrderEvent event = new OrderEvent(
            "order-123",
            "customer-456",
            new BigDecimal("99.99"),
            "CREATED"
        );

        // When
        producer.sendSync(event);

        // Then
        ConsumerRecords<String, OrderEvent> records =
            KafkaTestUtils.getRecords(consumer, Duration.ofSeconds(10));

        assertThat(records.count()).isEqualTo(1);

        ConsumerRecord<String, OrderEvent> record = records.iterator().next();
        assertThat(record.key()).isEqualTo("order-123");
        assertThat(record.value().getCustomerId()).isEqualTo("customer-456");
    }
}
```

## Batch Processing

When throughput matters more than latency, batch processing helps:

```java
@KafkaListener(
    topics = "order-events",
    groupId = "batch-processor",
    containerFactory = "batchKafkaListenerContainerFactory"
)
public void consumeBatch(List<OrderEvent> events) {
    log.info("Received batch of {} events", events.size());

    // Process all events in a single database transaction
    orderService.processBatch(events);
}

// Configuration for batch listening
@Bean
public ConcurrentKafkaListenerContainerFactory<String, OrderEvent>
        batchKafkaListenerContainerFactory() {

    ConcurrentKafkaListenerContainerFactory<String, OrderEvent> factory =
        new ConcurrentKafkaListenerContainerFactory<>();

    factory.setConsumerFactory(consumerFactory());
    factory.setBatchListener(true);

    // Fetch up to 500 records per poll
    factory.getContainerProperties().setIdleBetweenPolls(0);

    return factory;
}
```

## Manual Offset Commits

For exactly-once processing semantics, control when offsets are committed:

```java
@KafkaListener(
    topics = "order-events",
    groupId = "manual-commit-group"
)
public void consumeWithManualCommit(
        OrderEvent event,
        Acknowledgment acknowledgment) {

    try {
        // Process the event
        orderService.processOrder(event);

        // Commit only after successful processing
        acknowledgment.acknowledge();

    } catch (Exception e) {
        // Don't acknowledge - message will be redelivered
        log.error("Processing failed, will retry: {}", event.getOrderId(), e);
        throw e;
    }
}
```

Enable manual acknowledgment in your factory:

```java
factory.getContainerProperties()
    .setAckMode(ContainerProperties.AckMode.MANUAL);
```

## Summary

Spring Kafka simplifies Kafka integration while giving you control over the details that matter. The key points to remember are:

- Use `KafkaTemplate` for producing messages, choosing between async and sync based on your reliability requirements
- Configure idempotence and proper acks to prevent message loss
- Implement dead letter queues for messages that fail repeatedly
- Use embedded Kafka for reliable integration tests
- Consider batch processing when throughput is critical
- Use manual offset commits when you need exactly-once semantics

Start with the simple configurations and add complexity only when you need it. The defaults in Spring Kafka are sensible for most use cases, and you can tune them as your requirements become clearer.
