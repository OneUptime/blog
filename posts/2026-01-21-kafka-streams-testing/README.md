# How to Test Kafka Streams Applications

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Apache Kafka, Kafka Streams, Testing, TopologyTestDriver, Unit Testing, Integration Testing

Description: Learn how to test Kafka Streams applications using TopologyTestDriver for unit tests and embedded Kafka for integration tests, including testing stateful operations, windowed aggregations, and error handling.

---

Testing Kafka Streams applications requires different strategies for unit testing topology logic and integration testing with actual Kafka clusters. This guide covers both approaches with practical examples.

## Testing Dependencies

### Maven

```xml
<dependencies>
    <dependency>
        <groupId>org.apache.kafka</groupId>
        <artifactId>kafka-streams</artifactId>
        <version>3.7.0</version>
    </dependency>
    <dependency>
        <groupId>org.apache.kafka</groupId>
        <artifactId>kafka-streams-test-utils</artifactId>
        <version>3.7.0</version>
        <scope>test</scope>
    </dependency>
    <dependency>
        <groupId>org.junit.jupiter</groupId>
        <artifactId>junit-jupiter</artifactId>
        <version>5.10.0</version>
        <scope>test</scope>
    </dependency>
    <dependency>
        <groupId>org.testcontainers</groupId>
        <artifactId>kafka</artifactId>
        <version>1.19.0</version>
        <scope>test</scope>
    </dependency>
</dependencies>
```

## TopologyTestDriver Basics

The TopologyTestDriver lets you test topologies without a real Kafka cluster:

```java
import org.apache.kafka.streams.*;
import org.apache.kafka.streams.test.TestRecord;
import org.junit.jupiter.api.*;

import java.util.Properties;

public class BasicTopologyTest {
    private TopologyTestDriver testDriver;
    private TestInputTopic<String, String> inputTopic;
    private TestOutputTopic<String, String> outputTopic;

    @BeforeEach
    void setup() {
        // Build topology
        StreamsBuilder builder = new StreamsBuilder();
        KStream<String, String> stream = builder.stream("input-topic");
        stream.mapValues(value -> value.toUpperCase())
              .to("output-topic");

        Topology topology = builder.build();

        // Configure test driver
        Properties props = new Properties();
        props.put(StreamsConfig.APPLICATION_ID_CONFIG, "test-app");
        props.put(StreamsConfig.BOOTSTRAP_SERVERS_CONFIG, "dummy:1234");
        props.put(StreamsConfig.DEFAULT_KEY_SERDE_CLASS_CONFIG, Serdes.String().getClass());
        props.put(StreamsConfig.DEFAULT_VALUE_SERDE_CLASS_CONFIG, Serdes.String().getClass());

        testDriver = new TopologyTestDriver(topology, props);

        // Create test topics
        inputTopic = testDriver.createInputTopic(
            "input-topic",
            new StringSerializer(),
            new StringSerializer()
        );
        outputTopic = testDriver.createOutputTopic(
            "output-topic",
            new StringDeserializer(),
            new StringDeserializer()
        );
    }

    @AfterEach
    void teardown() {
        testDriver.close();
    }

    @Test
    void testUppercaseTransformation() {
        // Send input
        inputTopic.pipeInput("key1", "hello");
        inputTopic.pipeInput("key2", "world");

        // Verify output
        assertThat(outputTopic.readValue()).isEqualTo("HELLO");
        assertThat(outputTopic.readValue()).isEqualTo("WORLD");
        assertThat(outputTopic.isEmpty()).isTrue();
    }

    @Test
    void testWithTimestamps() {
        Instant baseTime = Instant.parse("2024-01-15T10:00:00Z");

        inputTopic.pipeInput("key1", "event1", baseTime);
        inputTopic.pipeInput("key2", "event2", baseTime.plusSeconds(30));

        TestRecord<String, String> record1 = outputTopic.readRecord();
        assertThat(record1.key()).isEqualTo("key1");
        assertThat(record1.timestamp()).isEqualTo(baseTime.toEpochMilli());
    }
}
```

## Testing Stateful Operations

### Testing Aggregations

```java
public class AggregationTopologyTest {
    private TopologyTestDriver testDriver;
    private TestInputTopic<String, Long> inputTopic;
    private TestOutputTopic<String, Long> outputTopic;

    @BeforeEach
    void setup() {
        StreamsBuilder builder = new StreamsBuilder();

        builder.stream("input", Consumed.with(Serdes.String(), Serdes.Long()))
            .groupByKey()
            .count(Materialized.as("count-store"))
            .toStream()
            .to("output", Produced.with(Serdes.String(), Serdes.Long()));

        Properties props = new Properties();
        props.put(StreamsConfig.APPLICATION_ID_CONFIG, "test");
        props.put(StreamsConfig.BOOTSTRAP_SERVERS_CONFIG, "dummy:1234");

        testDriver = new TopologyTestDriver(builder.build(), props);

        inputTopic = testDriver.createInputTopic(
            "input", new StringSerializer(), new LongSerializer());
        outputTopic = testDriver.createOutputTopic(
            "output", new StringDeserializer(), new LongDeserializer());
    }

    @Test
    void testCount() {
        inputTopic.pipeInput("user1", 1L);
        inputTopic.pipeInput("user1", 2L);
        inputTopic.pipeInput("user2", 1L);
        inputTopic.pipeInput("user1", 3L);

        // Read all outputs
        Map<String, Long> results = outputTopic.readKeyValuesToMap();

        // Latest count for each key
        assertThat(results.get("user1")).isEqualTo(3L);
        assertThat(results.get("user2")).isEqualTo(1L);
    }

    @Test
    void testStateStoreAccess() {
        inputTopic.pipeInput("user1", 1L);
        inputTopic.pipeInput("user1", 2L);

        // Access state store directly
        KeyValueStore<String, Long> store = testDriver.getKeyValueStore("count-store");

        assertThat(store.get("user1")).isEqualTo(2L);
        assertThat(store.get("user2")).isNull();
    }
}
```

### Testing Windowed Aggregations

```java
public class WindowedAggregationTest {
    private TopologyTestDriver testDriver;
    private TestInputTopic<String, Long> inputTopic;
    private TestOutputTopic<Windowed<String>, Long> outputTopic;

    @BeforeEach
    void setup() {
        StreamsBuilder builder = new StreamsBuilder();

        TimeWindows windows = TimeWindows.ofSizeWithNoGrace(Duration.ofMinutes(5));

        builder.stream("input", Consumed.with(Serdes.String(), Serdes.Long()))
            .groupByKey()
            .windowedBy(windows)
            .count(Materialized.as("windowed-counts"))
            .toStream()
            .to("output", Produced.with(windowedSerde, Serdes.Long()));

        Properties props = new Properties();
        props.put(StreamsConfig.APPLICATION_ID_CONFIG, "test");
        props.put(StreamsConfig.BOOTSTRAP_SERVERS_CONFIG, "dummy:1234");

        testDriver = new TopologyTestDriver(builder.build(), props);

        inputTopic = testDriver.createInputTopic(
            "input", new StringSerializer(), new LongSerializer());
        outputTopic = testDriver.createOutputTopic(
            "output", windowedDeserializer, new LongDeserializer());
    }

    @Test
    void testWindowedCount() {
        Instant baseTime = Instant.parse("2024-01-15T10:00:00Z");

        // Events in first window [10:00 - 10:05)
        inputTopic.pipeInput("user1", 1L, baseTime);
        inputTopic.pipeInput("user1", 2L, baseTime.plusMinutes(2));

        // Events in second window [10:05 - 10:10)
        inputTopic.pipeInput("user1", 3L, baseTime.plusMinutes(6));

        // Read results
        List<KeyValue<Windowed<String>, Long>> results = outputTopic.readKeyValuesToList();

        // Should have counts for both windows
        assertThat(results).hasSize(3);

        // Access windowed store
        WindowStore<String, Long> store = testDriver.getWindowStore("windowed-counts");
        WindowStoreIterator<Long> iterator = store.fetch(
            "user1",
            baseTime.minusMinutes(1),
            baseTime.plusMinutes(10)
        );

        List<Long> counts = new ArrayList<>();
        while (iterator.hasNext()) {
            counts.add(iterator.next().value);
        }
        iterator.close();

        assertThat(counts).containsExactly(1L, 2L, 1L);
    }
}
```

## Testing Joins

```java
public class JoinTopologyTest {
    private TopologyTestDriver testDriver;
    private TestInputTopic<String, Order> ordersTopic;
    private TestInputTopic<String, Customer> customersTopic;
    private TestOutputTopic<String, EnrichedOrder> outputTopic;

    @BeforeEach
    void setup() {
        StreamsBuilder builder = new StreamsBuilder();

        KStream<String, Order> orders = builder.stream("orders",
            Consumed.with(Serdes.String(), orderSerde));

        KTable<String, Customer> customers = builder.table("customers",
            Consumed.with(Serdes.String(), customerSerde));

        orders.selectKey((k, v) -> v.getCustomerId())
            .join(customers, EnrichedOrder::new)
            .to("enriched-orders", Produced.with(Serdes.String(), enrichedOrderSerde));

        Properties props = new Properties();
        props.put(StreamsConfig.APPLICATION_ID_CONFIG, "test");
        props.put(StreamsConfig.BOOTSTRAP_SERVERS_CONFIG, "dummy:1234");

        testDriver = new TopologyTestDriver(builder.build(), props);

        ordersTopic = testDriver.createInputTopic("orders",
            new StringSerializer(), orderSerializer);
        customersTopic = testDriver.createInputTopic("customers",
            new StringSerializer(), customerSerializer);
        outputTopic = testDriver.createOutputTopic("enriched-orders",
            new StringDeserializer(), enrichedOrderDeserializer);
    }

    @Test
    void testJoin() {
        // First populate customer table
        customersTopic.pipeInput("cust1", new Customer("cust1", "John Doe", "premium"));

        // Then send order
        ordersTopic.pipeInput("order1", new Order("order1", "cust1", 100.0));

        // Verify join result
        EnrichedOrder result = outputTopic.readValue();
        assertThat(result.getOrder().getOrderId()).isEqualTo("order1");
        assertThat(result.getCustomerName()).isEqualTo("John Doe");
        assertThat(result.getCustomerSegment()).isEqualTo("premium");
    }

    @Test
    void testJoinWithMissingCustomer() {
        // Send order without customer in table (for left join scenarios)
        ordersTopic.pipeInput("order1", new Order("order1", "unknown", 100.0));

        // No output for inner join
        assertThat(outputTopic.isEmpty()).isTrue();
    }
}
```

## Testing Error Handling

```java
public class ErrorHandlingTest {
    private TopologyTestDriver testDriver;
    private TestInputTopic<String, String> inputTopic;
    private TestOutputTopic<String, String> outputTopic;
    private TestOutputTopic<String, String> errorTopic;

    @BeforeEach
    void setup() {
        StreamsBuilder builder = new StreamsBuilder();

        KStream<String, String> input = builder.stream("input");

        // Split into success and error branches
        Map<String, KStream<String, String>> branches = input
            .split(Named.as("branch-"))
            .branch((k, v) -> isValid(v), Branched.as("valid"))
            .defaultBranch(Branched.as("invalid"));

        // Process valid records
        branches.get("branch-valid")
            .mapValues(this::process)
            .to("output");

        // Send invalid to error topic
        branches.get("branch-invalid")
            .mapValues(v -> "Invalid: " + v)
            .to("errors");

        Properties props = new Properties();
        props.put(StreamsConfig.APPLICATION_ID_CONFIG, "test");
        props.put(StreamsConfig.BOOTSTRAP_SERVERS_CONFIG, "dummy:1234");
        props.put(StreamsConfig.DEFAULT_KEY_SERDE_CLASS_CONFIG, Serdes.String().getClass());
        props.put(StreamsConfig.DEFAULT_VALUE_SERDE_CLASS_CONFIG, Serdes.String().getClass());

        testDriver = new TopologyTestDriver(builder.build(), props);

        inputTopic = testDriver.createInputTopic("input",
            new StringSerializer(), new StringSerializer());
        outputTopic = testDriver.createOutputTopic("output",
            new StringDeserializer(), new StringDeserializer());
        errorTopic = testDriver.createOutputTopic("errors",
            new StringDeserializer(), new StringDeserializer());
    }

    @Test
    void testValidRecords() {
        inputTopic.pipeInput("key1", "valid-data");

        assertThat(outputTopic.readValue()).isEqualTo("processed: valid-data");
        assertThat(errorTopic.isEmpty()).isTrue();
    }

    @Test
    void testInvalidRecords() {
        inputTopic.pipeInput("key1", "invalid");

        assertThat(outputTopic.isEmpty()).isTrue();
        assertThat(errorTopic.readValue()).contains("Invalid:");
    }

    private boolean isValid(String value) {
        return value != null && value.startsWith("valid");
    }

    private String process(String value) {
        return "processed: " + value;
    }
}
```

## Integration Testing with Testcontainers

```java
import org.testcontainers.containers.KafkaContainer;
import org.testcontainers.utility.DockerImageName;

public class KafkaStreamsIntegrationTest {
    @Container
    static KafkaContainer kafka = new KafkaContainer(
        DockerImageName.parse("confluentinc/cp-kafka:7.5.0")
    );

    private KafkaStreams streams;
    private KafkaProducer<String, String> producer;
    private KafkaConsumer<String, String> consumer;

    @BeforeAll
    static void startKafka() {
        kafka.start();
    }

    @BeforeEach
    void setup() {
        // Create topics
        createTopics("input-topic", "output-topic");

        // Build streams app
        StreamsBuilder builder = new StreamsBuilder();
        builder.stream("input-topic", Consumed.with(Serdes.String(), Serdes.String()))
            .mapValues(v -> v.toUpperCase())
            .to("output-topic", Produced.with(Serdes.String(), Serdes.String()));

        Properties streamsProps = new Properties();
        streamsProps.put(StreamsConfig.APPLICATION_ID_CONFIG, "test-" + UUID.randomUUID());
        streamsProps.put(StreamsConfig.BOOTSTRAP_SERVERS_CONFIG, kafka.getBootstrapServers());
        streamsProps.put(StreamsConfig.DEFAULT_KEY_SERDE_CLASS_CONFIG, Serdes.String().getClass());
        streamsProps.put(StreamsConfig.DEFAULT_VALUE_SERDE_CLASS_CONFIG, Serdes.String().getClass());
        streamsProps.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");

        streams = new KafkaStreams(builder.build(), streamsProps);
        streams.start();

        // Setup producer and consumer
        producer = createProducer();
        consumer = createConsumer("output-topic");
    }

    @AfterEach
    void teardown() {
        if (streams != null) {
            streams.close(Duration.ofSeconds(10));
        }
        if (producer != null) {
            producer.close();
        }
        if (consumer != null) {
            consumer.close();
        }
    }

    @Test
    void testEndToEnd() throws Exception {
        // Wait for streams to be running
        waitForState(KafkaStreams.State.RUNNING, Duration.ofSeconds(30));

        // Send messages
        producer.send(new ProducerRecord<>("input-topic", "key1", "hello")).get();
        producer.send(new ProducerRecord<>("input-topic", "key2", "world")).get();

        // Consume results
        List<ConsumerRecord<String, String>> records = consumeRecords(2, Duration.ofSeconds(30));

        assertThat(records).hasSize(2);
        assertThat(records.get(0).value()).isEqualTo("HELLO");
        assertThat(records.get(1).value()).isEqualTo("WORLD");
    }

    private void waitForState(KafkaStreams.State expected, Duration timeout) throws Exception {
        Instant deadline = Instant.now().plus(timeout);
        while (Instant.now().isBefore(deadline)) {
            if (streams.state() == expected) {
                return;
            }
            Thread.sleep(100);
        }
        throw new TimeoutException("Stream did not reach " + expected);
    }

    private List<ConsumerRecord<String, String>> consumeRecords(int count, Duration timeout) {
        List<ConsumerRecord<String, String>> records = new ArrayList<>();
        Instant deadline = Instant.now().plus(timeout);

        while (records.size() < count && Instant.now().isBefore(deadline)) {
            ConsumerRecords<String, String> polled = consumer.poll(Duration.ofMillis(100));
            polled.forEach(records::add);
        }

        return records;
    }

    private void createTopics(String... topics) {
        Properties adminProps = new Properties();
        adminProps.put(AdminClientConfig.BOOTSTRAP_SERVERS_CONFIG, kafka.getBootstrapServers());

        try (AdminClient admin = AdminClient.create(adminProps)) {
            List<NewTopic> newTopics = Arrays.stream(topics)
                .map(t -> new NewTopic(t, 1, (short) 1))
                .toList();
            admin.createTopics(newTopics).all().get();
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    private KafkaProducer<String, String> createProducer() {
        Properties props = new Properties();
        props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, kafka.getBootstrapServers());
        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
        return new KafkaProducer<>(props);
    }

    private KafkaConsumer<String, String> createConsumer(String topic) {
        Properties props = new Properties();
        props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, kafka.getBootstrapServers());
        props.put(ConsumerConfig.GROUP_ID_CONFIG, "test-consumer-" + UUID.randomUUID());
        props.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");
        props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class);
        props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class);

        KafkaConsumer<String, String> consumer = new KafkaConsumer<>(props);
        consumer.subscribe(Collections.singletonList(topic));
        return consumer;
    }
}
```

## Testing Best Practices

### 1. Test Topology in Isolation

```java
// Extract topology creation for testing
public class MyTopology {
    public static Topology build() {
        StreamsBuilder builder = new StreamsBuilder();
        // ... topology definition
        return builder.build();
    }
}

// Test the topology
@Test
void testTopology() {
    Topology topology = MyTopology.build();
    TopologyTestDriver driver = new TopologyTestDriver(topology, props);
    // ... test
}
```

### 2. Test Edge Cases

```java
@Test
void testNullValues() {
    inputTopic.pipeInput("key1", null);
    // Verify handling of null
}

@Test
void testEmptyString() {
    inputTopic.pipeInput("key1", "");
    // Verify handling of empty string
}

@Test
void testLateData() {
    Instant now = Instant.now();
    inputTopic.pipeInput("key1", "value", now.minusHours(1));
    // Verify late data handling
}
```

### 3. Verify State After Processing

```java
@Test
void testFinalState() {
    // Process all inputs
    inputTopic.pipeInput("key1", "a");
    inputTopic.pipeInput("key1", "b");
    inputTopic.pipeInput("key1", "c");

    // Verify final state
    KeyValueStore<String, Long> store = testDriver.getKeyValueStore("my-store");
    assertThat(store.get("key1")).isEqualTo(3L);

    // Verify all records in store
    List<KeyValue<String, Long>> all = new ArrayList<>();
    try (KeyValueIterator<String, Long> iter = store.all()) {
        while (iter.hasNext()) {
            all.add(iter.next());
        }
    }
    assertThat(all).hasSize(1);
}
```

## Summary

| Test Type | Tool | Use Case |
|-----------|------|----------|
| Unit | TopologyTestDriver | Fast topology logic tests |
| State | TopologyTestDriver | State store verification |
| Integration | Testcontainers | Full end-to-end tests |
| Performance | Integration | Throughput and latency |

Use TopologyTestDriver for most tests due to its speed and simplicity. Reserve integration tests with real Kafka for verifying deployment configurations and end-to-end scenarios.
