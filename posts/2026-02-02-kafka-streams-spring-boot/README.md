# How to Use Kafka Streams with Spring Boot

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Java, Spring Boot, Kafka, Stream Processing, Event Driven

Description: A practical guide to building stream processing applications with Kafka Streams and Spring Boot, including configuration, topology design, and production best practices.

---

Kafka Streams is a client library for building real-time applications and microservices. Unlike other stream processing frameworks that require dedicated clusters, Kafka Streams runs as part of your application - no separate infrastructure needed. When combined with Spring Boot, you get a powerful combination for processing event streams with minimal boilerplate.

In this guide, we'll build a practical order processing system that tracks orders in real-time, calculates running totals, and handles stateful operations.

## Why Kafka Streams with Spring Boot?

Before diving into code, here's why this combination works well:

| Feature | Kafka Streams | Spring Cloud Stream |
|---------|--------------|---------------------|
| Deployment | Embedded in your app | Embedded in your app |
| Stateful processing | Native support | Limited |
| Exactly-once semantics | Built-in | Depends on binder |
| Learning curve | Moderate | Lower |
| Flexibility | High | Medium |

Kafka Streams gives you low-level control over stream processing while Spring Boot handles the configuration and lifecycle management.

## Setting Up Dependencies

Add these dependencies to your `pom.xml`:

```xml
<dependencies>
    <!-- Spring Boot Starter -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter</artifactId>
    </dependency>

    <!-- Kafka Streams -->
    <dependency>
        <groupId>org.apache.kafka</groupId>
        <artifactId>kafka-streams</artifactId>
    </dependency>

    <!-- Spring Kafka for integration -->
    <dependency>
        <groupId>org.springframework.kafka</groupId>
        <artifactId>spring-kafka</artifactId>
    </dependency>

    <!-- JSON serialization -->
    <dependency>
        <groupId>com.fasterxml.jackson.core</groupId>
        <artifactId>jackson-databind</artifactId>
    </dependency>

    <!-- Testing -->
    <dependency>
        <groupId>org.apache.kafka</groupId>
        <artifactId>kafka-streams-test-utils</artifactId>
        <scope>test</scope>
    </dependency>
</dependencies>
```

## Configuration

Configure Kafka Streams in your `application.yml`:

```yaml
spring:
  kafka:
    bootstrap-servers: localhost:9092
    streams:
      application-id: order-processing-app
      # Use exactly-once processing for financial data
      properties:
        processing.guarantee: exactly_once_v2
        # Commit interval in milliseconds
        commit.interval.ms: 1000
        # Number of standby replicas for fault tolerance
        num.standby.replicas: 1
        # Replication factor for internal topics
        replication.factor: 3
```

Now create a configuration class that sets up the Streams infrastructure:

```java
@Configuration
@EnableKafkaStreams
public class KafkaStreamsConfig {

    @Value("${spring.kafka.bootstrap-servers}")
    private String bootstrapServers;

    @Value("${spring.kafka.streams.application-id}")
    private String applicationId;

    @Bean(name = KafkaStreamsDefaultConfiguration.DEFAULT_STREAMS_CONFIG_BEAN_NAME)
    public KafkaStreamsConfiguration kafkaStreamsConfig() {
        Map<String, Object> props = new HashMap<>();

        // Required configuration
        props.put(StreamsConfig.APPLICATION_ID_CONFIG, applicationId);
        props.put(StreamsConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);

        // Serialization defaults - Strings for keys, JSON for values
        props.put(StreamsConfig.DEFAULT_KEY_SERDE_CLASS_CONFIG, Serdes.String().getClass());
        props.put(StreamsConfig.DEFAULT_VALUE_SERDE_CLASS_CONFIG, Serdes.String().getClass());

        // Production settings
        props.put(StreamsConfig.PROCESSING_GUARANTEE_CONFIG, "exactly_once_v2");
        props.put(StreamsConfig.NUM_STREAM_THREADS_CONFIG, 3);

        return new KafkaStreamsConfiguration(props);
    }
}
```

## Building Your First Topology

A topology defines how data flows through your stream processing pipeline. Let's create one that processes orders:

```java
@Component
public class OrderProcessingTopology {

    private static final Logger log = LoggerFactory.getLogger(OrderProcessingTopology.class);
    private final ObjectMapper objectMapper;

    public OrderProcessingTopology(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Autowired
    void buildPipeline(StreamsBuilder streamsBuilder) {
        // Create a custom Serde for Order objects
        JsonSerde<Order> orderSerde = new JsonSerde<>(Order.class, objectMapper);

        // Read from the orders topic
        KStream<String, Order> ordersStream = streamsBuilder
            .stream("orders", Consumed.with(Serdes.String(), orderSerde));

        // Process the stream: filter, transform, and route
        ordersStream
            // Filter out cancelled orders
            .filter((key, order) -> !order.getStatus().equals("CANCELLED"))
            // Log each order for debugging
            .peek((key, order) -> log.info("Processing order: {}", order.getOrderId()))
            // Branch based on order value
            .split()
            .branch(
                (key, order) -> order.getTotal() > 1000,
                Branched.withConsumer(stream ->
                    stream.to("high-value-orders", Produced.with(Serdes.String(), orderSerde)))
            )
            .defaultBranch(
                Branched.withConsumer(stream ->
                    stream.to("standard-orders", Produced.with(Serdes.String(), orderSerde)))
            );
    }
}
```

## Stateful Operations with State Stores

Real stream processing often requires maintaining state. Here's how to track order totals per customer:

```java
@Component
public class CustomerAggregationTopology {

    @Autowired
    void buildAggregation(StreamsBuilder streamsBuilder) {
        JsonSerde<Order> orderSerde = new JsonSerde<>(Order.class);
        JsonSerde<CustomerStats> statsSerde = new JsonSerde<>(CustomerStats.class);

        // Read orders and group by customer ID
        KTable<String, CustomerStats> customerStats = streamsBuilder
            .stream("orders", Consumed.with(Serdes.String(), orderSerde))
            // Re-key by customer ID for aggregation
            .selectKey((key, order) -> order.getCustomerId())
            // Group by the new key
            .groupByKey(Grouped.with(Serdes.String(), orderSerde))
            // Aggregate into customer statistics
            .aggregate(
                // Initializer - creates empty stats for new customers
                CustomerStats::new,
                // Aggregator - updates stats with each order
                (customerId, order, stats) -> {
                    stats.setCustomerId(customerId);
                    stats.setOrderCount(stats.getOrderCount() + 1);
                    stats.setTotalSpent(stats.getTotalSpent() + order.getTotal());
                    stats.setLastOrderTime(order.getTimestamp());
                    return stats;
                },
                // Materialized view configuration
                Materialized.<String, CustomerStats, KeyValueStore<Bytes, byte[]>>as("customer-stats-store")
                    .withKeySerde(Serdes.String())
                    .withValueSerde(statsSerde)
            );

        // Output the aggregated stats to a topic
        customerStats.toStream().to("customer-statistics",
            Produced.with(Serdes.String(), statsSerde));
    }
}
```

## Querying State Stores

One powerful feature of Kafka Streams is the ability to query state stores directly:

```java
@RestController
@RequestMapping("/api/customers")
public class CustomerStatsController {

    private final StreamsBuilderFactoryBean factoryBean;

    public CustomerStatsController(StreamsBuilderFactoryBean factoryBean) {
        this.factoryBean = factoryBean;
    }

    @GetMapping("/{customerId}/stats")
    public ResponseEntity<CustomerStats> getCustomerStats(@PathVariable String customerId) {
        // Get the Kafka Streams instance
        KafkaStreams streams = factoryBean.getKafkaStreams();

        // Query the state store directly - no database needed
        ReadOnlyKeyValueStore<String, CustomerStats> store = streams.store(
            StoreQueryParameters.fromNameAndType(
                "customer-stats-store",
                QueryableStoreTypes.keyValueStore()
            )
        );

        CustomerStats stats = store.get(customerId);
        if (stats == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(stats);
    }
}
```

## Testing Your Topology

Kafka Streams provides excellent testing utilities. You can test topologies without running a real Kafka broker:

```java
class OrderProcessingTopologyTest {

    private TopologyTestDriver testDriver;
    private TestInputTopic<String, String> inputTopic;
    private TestOutputTopic<String, String> highValueOutput;
    private TestOutputTopic<String, String> standardOutput;

    @BeforeEach
    void setup() {
        // Build the topology
        StreamsBuilder builder = new StreamsBuilder();
        OrderProcessingTopology topology = new OrderProcessingTopology(new ObjectMapper());

        // Configure the test driver
        Properties props = new Properties();
        props.put(StreamsConfig.APPLICATION_ID_CONFIG, "test-app");
        props.put(StreamsConfig.BOOTSTRAP_SERVERS_CONFIG, "dummy:9092");
        props.put(StreamsConfig.DEFAULT_KEY_SERDE_CLASS_CONFIG, Serdes.String().getClass());
        props.put(StreamsConfig.DEFAULT_VALUE_SERDE_CLASS_CONFIG, Serdes.String().getClass());

        testDriver = new TopologyTestDriver(builder.build(), props);

        // Create test topics
        inputTopic = testDriver.createInputTopic("orders",
            new StringSerializer(), new StringSerializer());
        highValueOutput = testDriver.createOutputTopic("high-value-orders",
            new StringDeserializer(), new StringDeserializer());
        standardOutput = testDriver.createOutputTopic("standard-orders",
            new StringDeserializer(), new StringDeserializer());
    }

    @Test
    void highValueOrdersShouldBeRouted() {
        // Send a high-value order
        String orderJson = """
            {"orderId": "123", "customerId": "C1", "total": 1500, "status": "PENDING"}
            """;
        inputTopic.pipeInput("order-123", orderJson);

        // Verify it went to the high-value topic
        assertThat(highValueOutput.isEmpty()).isFalse();
        assertThat(standardOutput.isEmpty()).isTrue();
    }

    @AfterEach
    void teardown() {
        testDriver.close();
    }
}
```

## Production Best Practices

When deploying Kafka Streams to production, keep these tips in mind:

**Error Handling**: Configure a deserialization exception handler to avoid pipeline crashes:

```java
props.put(StreamsConfig.DEFAULT_DESERIALIZATION_EXCEPTION_HANDLER_CLASS_CONFIG,
    LogAndContinueExceptionHandler.class);
```

**Monitoring**: Expose Kafka Streams metrics through Micrometer:

```java
@Bean
public MeterBinder kafkaStreamsMetrics(StreamsBuilderFactoryBean factoryBean) {
    return registry -> {
        KafkaStreams streams = factoryBean.getKafkaStreams();
        if (streams != null) {
            streams.metrics().forEach((name, metric) ->
                Gauge.builder("kafka.streams." + name.name(), metric, m -> {
                    Object value = m.metricValue();
                    return value instanceof Number ? ((Number) value).doubleValue() : 0;
                }).register(registry));
        }
    };
}
```

**Graceful Shutdown**: Spring Boot handles this automatically with `@EnableKafkaStreams`, but make sure your shutdown timeout is sufficient:

```yaml
spring:
  lifecycle:
    timeout-per-shutdown-phase: 30s
```

## Wrapping Up

Kafka Streams with Spring Boot gives you a solid foundation for real-time data processing without the operational overhead of separate cluster management. The combination of Spring's dependency injection and Kafka Streams' powerful DSL makes it straightforward to build everything from simple transformations to complex event-driven architectures.

Start with simple stateless transformations, then gradually introduce state stores and aggregations as your requirements grow. The testing utilities make it easy to verify your topologies before deployment, and the queryable state stores open up interesting patterns for building responsive applications.

For more complex scenarios, look into windowed aggregations for time-based analytics, and consider using the Processor API when the DSL doesn't quite fit your needs.
