# How to Get Started with Kafka Streams

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Kafka, Kafka Streams, Stream Processing, Real-time Analytics, Java, Stateful Processing

Description: A comprehensive guide to getting started with Kafka Streams, covering stream processing fundamentals, topology building, stateless and stateful operations, and practical examples for building real-time data pipelines.

---

Kafka Streams is a client library for building real-time streaming applications. Unlike other stream processing frameworks, it requires no separate cluster - your application is the processing cluster. This guide covers Kafka Streams fundamentals and practical implementation patterns.

## What is Kafka Streams?

Kafka Streams is a Java library that provides:

- **No separate cluster**: Runs within your application
- **Exactly-once semantics**: Built-in transaction support
- **Stateful processing**: Local state stores with fault tolerance
- **DSL and Processor API**: High-level and low-level APIs
- **Elastic scaling**: Add or remove instances dynamically

## Setup and Dependencies

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
        <artifactId>kafka-clients</artifactId>
        <version>3.7.0</version>
    </dependency>
    <!-- For JSON serialization -->
    <dependency>
        <groupId>com.fasterxml.jackson.core</groupId>
        <artifactId>jackson-databind</artifactId>
        <version>2.16.0</version>
    </dependency>
</dependencies>
```

### Gradle

```groovy
implementation 'org.apache.kafka:kafka-streams:3.7.0'
implementation 'org.apache.kafka:kafka-clients:3.7.0'
implementation 'com.fasterxml.jackson.core:jackson-databind:2.16.0'
```

## Basic Configuration

```java
import org.apache.kafka.streams.StreamsConfig;
import org.apache.kafka.common.serialization.Serdes;
import java.util.Properties;

public class StreamsConfiguration {
    public static Properties getConfig() {
        Properties props = new Properties();

        // Application identity
        props.put(StreamsConfig.APPLICATION_ID_CONFIG, "my-streams-app");
        props.put(StreamsConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");

        // Default serializers/deserializers
        props.put(StreamsConfig.DEFAULT_KEY_SERDE_CLASS_CONFIG,
            Serdes.String().getClass().getName());
        props.put(StreamsConfig.DEFAULT_VALUE_SERDE_CLASS_CONFIG,
            Serdes.String().getClass().getName());

        // Processing guarantees
        props.put(StreamsConfig.PROCESSING_GUARANTEE_CONFIG,
            StreamsConfig.EXACTLY_ONCE_V2);

        // State store directory
        props.put(StreamsConfig.STATE_DIR_CONFIG, "/tmp/kafka-streams");

        // Commit interval
        props.put(StreamsConfig.COMMIT_INTERVAL_MS_CONFIG, 1000);

        // Number of threads
        props.put(StreamsConfig.NUM_STREAM_THREADS_CONFIG, 2);

        return props;
    }
}
```

## First Streams Application

### Simple Word Count

```java
import org.apache.kafka.streams.*;
import org.apache.kafka.streams.kstream.*;
import org.apache.kafka.common.serialization.Serdes;
import java.util.Arrays;
import java.util.Properties;

public class WordCountApp {
    public static void main(String[] args) {
        Properties props = StreamsConfiguration.getConfig();

        // Build topology
        StreamsBuilder builder = new StreamsBuilder();

        // Create source stream from topic
        KStream<String, String> textLines = builder.stream("input-topic");

        // Process: split into words, group by word, count
        KTable<String, Long> wordCounts = textLines
            // Split lines into words
            .flatMapValues(line -> Arrays.asList(line.toLowerCase().split("\\W+")))
            // Filter empty strings
            .filter((key, word) -> word != null && !word.isEmpty())
            // Group by the word itself (use word as key)
            .groupBy((key, word) -> word)
            // Count occurrences
            .count(Materialized.as("word-counts-store"));

        // Write results to output topic
        wordCounts.toStream().to("output-topic",
            Produced.with(Serdes.String(), Serdes.Long()));

        // Build and start the streams application
        Topology topology = builder.build();
        System.out.println(topology.describe());

        KafkaStreams streams = new KafkaStreams(topology, props);

        // Add shutdown hook
        Runtime.getRuntime().addShutdownHook(new Thread(streams::close));

        // Start processing
        streams.start();
    }
}
```

## Stateless Operations

### Map and Filter

```java
StreamsBuilder builder = new StreamsBuilder();

KStream<String, String> source = builder.stream("orders");

// Map - transform values
KStream<String, Order> orders = source
    .mapValues(value -> parseOrder(value));

// Filter - keep only specific records
KStream<String, Order> highValueOrders = orders
    .filter((key, order) -> order.getAmount() > 1000);

// Map with key change
KStream<String, Order> reKeyed = orders
    .map((key, order) -> KeyValue.pair(order.getCustomerId(), order));

// FlatMap - one to many
KStream<String, OrderItem> items = orders
    .flatMapValues(order -> order.getItems());

// Branch - split stream
Map<String, KStream<String, Order>> branches = orders.split(Named.as("branch-"))
    .branch((key, order) -> order.getAmount() > 1000, Branched.as("high-value"))
    .branch((key, order) -> order.getAmount() > 100, Branched.as("medium-value"))
    .defaultBranch(Branched.as("low-value"));

KStream<String, Order> highValue = branches.get("branch-high-value");
KStream<String, Order> mediumValue = branches.get("branch-medium-value");
KStream<String, Order> lowValue = branches.get("branch-low-value");

// Merge streams
KStream<String, Order> merged = highValue.merge(mediumValue);
```

### Transformations

```java
// SelectKey - change key
KStream<String, Order> byCustomer = orders
    .selectKey((key, order) -> order.getCustomerId());

// Peek - side effects without modification
orders.peek((key, order) ->
    System.out.println("Processing order: " + order.getId()));

// Through - write to topic and continue
KStream<String, Order> throughStream = orders
    .through("intermediate-topic");

// Repartition - explicit repartition
KStream<String, Order> repartitioned = orders
    .repartition(Repartitioned.with(Serdes.String(), orderSerde)
        .withNumberOfPartitions(12));
```

## Stateful Operations

### Aggregations

```java
StreamsBuilder builder = new StreamsBuilder();

KStream<String, Order> orders = builder.stream("orders",
    Consumed.with(Serdes.String(), orderSerde));

// Group by key
KGroupedStream<String, Order> groupedByCustomer = orders
    .groupBy((key, order) -> order.getCustomerId());

// Count
KTable<String, Long> orderCounts = groupedByCustomer.count(
    Materialized.as("order-counts"));

// Reduce - keep highest value order per customer
KTable<String, Order> highestOrder = groupedByCustomer.reduce(
    (order1, order2) -> order1.getAmount() > order2.getAmount() ? order1 : order2,
    Materialized.as("highest-orders"));

// Aggregate - custom aggregation
KTable<String, CustomerStats> customerStats = groupedByCustomer.aggregate(
    // Initializer
    CustomerStats::new,
    // Aggregator
    (customerId, order, stats) -> {
        stats.orderCount++;
        stats.totalAmount += order.getAmount();
        return stats;
    },
    // Materialized with serde
    Materialized.<String, CustomerStats, KeyValueStore<Bytes, byte[]>>as("customer-stats")
        .withKeySerde(Serdes.String())
        .withValueSerde(customerStatsSerde)
);
```

### Windowed Aggregations

```java
import org.apache.kafka.streams.kstream.TimeWindows;
import org.apache.kafka.streams.kstream.SessionWindows;
import org.apache.kafka.streams.kstream.SlidingWindows;
import java.time.Duration;

// Tumbling window - fixed, non-overlapping
KTable<Windowed<String>, Long> tumblingCounts = orders
    .groupBy((key, order) -> order.getProductId())
    .windowedBy(TimeWindows.ofSizeWithNoGrace(Duration.ofMinutes(5)))
    .count(Materialized.as("tumbling-counts"));

// Hopping window - fixed, overlapping
KTable<Windowed<String>, Long> hoppingCounts = orders
    .groupBy((key, order) -> order.getProductId())
    .windowedBy(TimeWindows.ofSizeAndGrace(Duration.ofMinutes(5), Duration.ofMinutes(1))
        .advanceBy(Duration.ofMinutes(1)))
    .count(Materialized.as("hopping-counts"));

// Session window - dynamic, activity-based
KTable<Windowed<String>, Long> sessionCounts = orders
    .groupBy((key, order) -> order.getCustomerId())
    .windowedBy(SessionWindows.ofInactivityGapWithNoGrace(Duration.ofMinutes(30)))
    .count(Materialized.as("session-counts"));

// Sliding window - time-based with fixed size
KTable<Windowed<String>, Long> slidingCounts = orders
    .groupBy((key, order) -> order.getProductId())
    .windowedBy(SlidingWindows.ofTimeDifferenceWithNoGrace(Duration.ofMinutes(5)))
    .count(Materialized.as("sliding-counts"));

// Output windowed results
tumblingCounts.toStream()
    .map((windowedKey, count) -> {
        String key = windowedKey.key();
        long windowStart = windowedKey.window().start();
        long windowEnd = windowedKey.window().end();
        return KeyValue.pair(key, String.format(
            "Product %s: %d orders between %d and %d", key, count, windowStart, windowEnd));
    })
    .to("windowed-output");
```

## Joins

### Stream-Stream Join

```java
StreamsBuilder builder = new StreamsBuilder();

KStream<String, Order> orders = builder.stream("orders");
KStream<String, Payment> payments = builder.stream("payments");

// Inner join within time window
KStream<String, OrderWithPayment> ordersWithPayments = orders.join(
    payments,
    // Value joiner
    (order, payment) -> new OrderWithPayment(order, payment),
    // Join window
    JoinWindows.ofTimeDifferenceWithNoGrace(Duration.ofMinutes(5)),
    // Stream joined configuration
    StreamJoined.with(Serdes.String(), orderSerde, paymentSerde)
);

// Left join - orders that may not have payments
KStream<String, OrderWithPayment> ordersLeftJoin = orders.leftJoin(
    payments,
    (order, payment) -> new OrderWithPayment(order, payment),
    JoinWindows.ofTimeDifferenceWithNoGrace(Duration.ofMinutes(5)),
    StreamJoined.with(Serdes.String(), orderSerde, paymentSerde)
);

// Outer join - all orders and payments
KStream<String, OrderWithPayment> ordersOuterJoin = orders.outerJoin(
    payments,
    (order, payment) -> new OrderWithPayment(order, payment),
    JoinWindows.ofTimeDifferenceWithNoGrace(Duration.ofMinutes(5)),
    StreamJoined.with(Serdes.String(), orderSerde, paymentSerde)
);
```

### Stream-Table Join

```java
StreamsBuilder builder = new StreamsBuilder();

KStream<String, Order> orders = builder.stream("orders");
KTable<String, Customer> customers = builder.table("customers");

// Enrich orders with customer data
KStream<String, EnrichedOrder> enrichedOrders = orders
    .selectKey((key, order) -> order.getCustomerId())
    .join(
        customers,
        (order, customer) -> new EnrichedOrder(order, customer)
    );

// Left join - orders even without customer match
KStream<String, EnrichedOrder> enrichedOrdersLeft = orders
    .selectKey((key, order) -> order.getCustomerId())
    .leftJoin(
        customers,
        (order, customer) -> new EnrichedOrder(order, customer)
    );
```

### Table-Table Join

```java
StreamsBuilder builder = new StreamsBuilder();

KTable<String, Customer> customers = builder.table("customers");
KTable<String, Address> addresses = builder.table("addresses");

// Join customer with address
KTable<String, CustomerWithAddress> customersWithAddress = customers.join(
    addresses,
    (customer, address) -> new CustomerWithAddress(customer, address)
);
```

## State Stores

### Querying State Stores

```java
import org.apache.kafka.streams.state.QueryableStoreTypes;
import org.apache.kafka.streams.state.ReadOnlyKeyValueStore;
import org.apache.kafka.streams.StoreQueryParameters;

public class StateStoreQuery {
    private final KafkaStreams streams;

    public StateStoreQuery(KafkaStreams streams) {
        this.streams = streams;
    }

    public Long getWordCount(String word) {
        ReadOnlyKeyValueStore<String, Long> store = streams.store(
            StoreQueryParameters.fromNameAndType(
                "word-counts-store",
                QueryableStoreTypes.keyValueStore()
            )
        );

        return store.get(word);
    }

    public Map<String, Long> getAllCounts() {
        ReadOnlyKeyValueStore<String, Long> store = streams.store(
            StoreQueryParameters.fromNameAndType(
                "word-counts-store",
                QueryableStoreTypes.keyValueStore()
            )
        );

        Map<String, Long> counts = new HashMap<>();
        try (KeyValueIterator<String, Long> iterator = store.all()) {
            while (iterator.hasNext()) {
                KeyValue<String, Long> entry = iterator.next();
                counts.put(entry.key, entry.value);
            }
        }
        return counts;
    }
}
```

### Interactive Queries REST API

```java
import static spark.Spark.*;

public class StreamsRestService {
    private final KafkaStreams streams;

    public StreamsRestService(KafkaStreams streams, int port) {
        this.streams = streams;

        port(port);

        get("/count/:word", (req, res) -> {
            String word = req.params(":word");
            Long count = getWordCount(word);
            return count != null ? count : 0;
        });

        get("/counts", (req, res) -> {
            res.type("application/json");
            return new ObjectMapper().writeValueAsString(getAllCounts());
        });
    }

    private Long getWordCount(String word) {
        try {
            ReadOnlyKeyValueStore<String, Long> store = streams.store(
                StoreQueryParameters.fromNameAndType(
                    "word-counts-store",
                    QueryableStoreTypes.keyValueStore()
                )
            );
            return store.get(word);
        } catch (Exception e) {
            return null;
        }
    }
}
```

## Error Handling

```java
Properties props = StreamsConfiguration.getConfig();

// Default deserialization exception handler
props.put(StreamsConfig.DEFAULT_DESERIALIZATION_EXCEPTION_HANDLER_CLASS_CONFIG,
    LogAndContinueExceptionHandler.class.getName());

// Production exception handler
props.put(StreamsConfig.DEFAULT_PRODUCTION_EXCEPTION_HANDLER_CLASS_CONFIG,
    DefaultProductionExceptionHandler.class.getName());

// Custom exception handler
public class CustomExceptionHandler implements DeserializationExceptionHandler {
    @Override
    public DeserializationHandlerResponse handle(ProcessorContext context,
            ConsumerRecord<byte[], byte[]> record, Exception exception) {
        // Log error and continue
        System.err.println("Deserialization error: " + exception.getMessage());
        // Send to DLQ
        sendToDLQ(record);
        return DeserializationHandlerResponse.CONTINUE;
    }

    @Override
    public void configure(Map<String, ?> configs) {}
}

// Uncaught exception handler
streams.setUncaughtExceptionHandler((thread, exception) -> {
    System.err.println("Uncaught exception in thread " + thread.getName() +
        ": " + exception.getMessage());
    return StreamsUncaughtExceptionHandler.StreamThreadExceptionResponse.REPLACE_THREAD;
});
```

## Graceful Shutdown

```java
public class GracefulStreamsApp {
    public static void main(String[] args) {
        KafkaStreams streams = new KafkaStreams(topology, props);

        // State listener
        streams.setStateListener((newState, oldState) -> {
            System.out.println("State changed from " + oldState + " to " + newState);
        });

        // Shutdown hook
        CountDownLatch latch = new CountDownLatch(1);

        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            System.out.println("Shutting down streams...");
            streams.close(Duration.ofSeconds(30));
            latch.countDown();
        }));

        try {
            streams.start();
            latch.await();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
```

## Conclusion

Kafka Streams provides a powerful yet simple way to build stream processing applications:

1. **No external dependencies**: Runs within your application
2. **Rich DSL**: Expressive API for common operations
3. **Stateful processing**: Built-in state management with fault tolerance
4. **Exactly-once semantics**: Strong processing guarantees
5. **Elastic scaling**: Add instances for more throughput

Start with stateless operations, then graduate to stateful processing and joins as your needs grow. The library handles the complexity of distributed processing while you focus on business logic.
