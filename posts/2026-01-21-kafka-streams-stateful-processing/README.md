# How to Implement Stateful Processing with Kafka Streams

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Apache Kafka, Kafka Streams, Stateful Processing, State Stores, Aggregations, Stream Processing

Description: Learn how to implement stateful stream processing with Kafka Streams, including state stores, aggregations, interactive queries, and fault-tolerant state management for real-time data processing.

---

Stateful processing in Kafka Streams allows you to maintain and query state while processing data streams. This guide covers state stores, aggregations, and building stateful applications that are fault-tolerant and scalable.

## Understanding State in Kafka Streams

### Stateless vs Stateful Operations

```
Stateless Operations:
- filter()
- map()
- flatMap()
- branch()

Stateful Operations:
- count()
- aggregate()
- reduce()
- join()
- windowedBy()
```

### State Store Types

```
Local State Stores:
- RocksDB (default) - persistent, disk-based
- In-Memory - faster, limited by memory

Changelog Topics:
- Automatically created for fault tolerance
- Replayed on restart to rebuild state
```

## Basic State Store Configuration

### Maven Dependencies

```xml
<dependencies>
    <dependency>
        <groupId>org.apache.kafka</groupId>
        <artifactId>kafka-streams</artifactId>
        <version>3.7.0</version>
    </dependency>
    <dependency>
        <groupId>com.fasterxml.jackson.core</groupId>
        <artifactId>jackson-databind</artifactId>
        <version>2.15.2</version>
    </dependency>
</dependencies>
```

### Stream Configuration

```java
import org.apache.kafka.streams.*;
import org.apache.kafka.streams.state.*;
import org.apache.kafka.common.serialization.*;

import java.util.Properties;

public class StatefulStreamConfig {
    public static Properties getConfig() {
        Properties props = new Properties();
        props.put(StreamsConfig.APPLICATION_ID_CONFIG, "stateful-app");
        props.put(StreamsConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");
        props.put(StreamsConfig.DEFAULT_KEY_SERDE_CLASS_CONFIG, Serdes.String().getClass());
        props.put(StreamsConfig.DEFAULT_VALUE_SERDE_CLASS_CONFIG, Serdes.String().getClass());

        // State store settings
        props.put(StreamsConfig.STATE_DIR_CONFIG, "/var/kafka-streams");
        props.put(StreamsConfig.COMMIT_INTERVAL_MS_CONFIG, 1000);

        // Exactly-once processing
        props.put(StreamsConfig.PROCESSING_GUARANTEE_CONFIG, StreamsConfig.EXACTLY_ONCE_V2);

        // RocksDB tuning
        props.put(StreamsConfig.ROCKSDB_CONFIG_SETTER_CLASS_CONFIG, CustomRocksDBConfig.class);

        return props;
    }
}
```

### Custom RocksDB Configuration

```java
import org.apache.kafka.streams.state.RocksDBConfigSetter;
import org.rocksdb.Options;
import org.rocksdb.BlockBasedTableConfig;
import java.util.Map;

public class CustomRocksDBConfig implements RocksDBConfigSetter {
    @Override
    public void setConfig(String storeName, Options options, Map<String, Object> configs) {
        // Optimize for point lookups
        BlockBasedTableConfig tableConfig = new BlockBasedTableConfig();
        tableConfig.setBlockCacheSize(50 * 1024 * 1024L); // 50MB cache
        tableConfig.setBlockSize(4096);

        options.setTableFormatConfig(tableConfig);
        options.setMaxWriteBufferNumber(3);
        options.setWriteBufferSize(16 * 1024 * 1024); // 16MB
    }

    @Override
    public void close(String storeName, Options options) {
        // Cleanup if needed
    }
}
```

## Counting and Aggregations

### Simple Count

```java
import org.apache.kafka.streams.*;
import org.apache.kafka.streams.kstream.*;
import org.apache.kafka.common.serialization.*;

public class EventCounter {
    public static void main(String[] args) {
        StreamsBuilder builder = new StreamsBuilder();

        // Read events stream
        KStream<String, String> events = builder.stream("events");

        // Count events by key
        KTable<String, Long> eventCounts = events
            .groupByKey()
            .count(Materialized.as("event-counts-store"));

        // Output to topic
        eventCounts.toStream().to("event-counts",
            Produced.with(Serdes.String(), Serdes.Long()));

        // Build and start
        KafkaStreams streams = new KafkaStreams(builder.build(), StatefulStreamConfig.getConfig());
        streams.start();

        Runtime.getRuntime().addShutdownHook(new Thread(streams::close));
    }
}
```

### Custom Aggregation

```java
import org.apache.kafka.streams.kstream.*;
import com.fasterxml.jackson.databind.ObjectMapper;

public class OrderAggregator {

    public static void main(String[] args) {
        StreamsBuilder builder = new StreamsBuilder();
        ObjectMapper mapper = new ObjectMapper();

        // Custom Serde for Order
        Serde<Order> orderSerde = createOrderSerde();
        Serde<OrderAggregate> aggregateSerde = createAggregateSerde();

        KStream<String, Order> orders = builder.stream("orders",
            Consumed.with(Serdes.String(), orderSerde));

        // Aggregate orders by customer
        KTable<String, OrderAggregate> customerStats = orders
            .groupBy((key, order) -> order.getCustomerId(),
                Grouped.with(Serdes.String(), orderSerde))
            .aggregate(
                // Initializer
                OrderAggregate::new,
                // Aggregator
                (customerId, order, aggregate) -> {
                    aggregate.addOrder(order);
                    return aggregate;
                },
                // State store config
                Materialized.<String, OrderAggregate, KeyValueStore<Bytes, byte[]>>as("customer-orders")
                    .withKeySerde(Serdes.String())
                    .withValueSerde(aggregateSerde)
            );

        // Output aggregated stats
        customerStats.toStream().to("customer-stats",
            Produced.with(Serdes.String(), aggregateSerde));

        KafkaStreams streams = new KafkaStreams(builder.build(), StatefulStreamConfig.getConfig());
        streams.start();
    }
}

class Order {
    private String orderId;
    private String customerId;
    private double amount;
    private long timestamp;
    // getters and setters
}

class OrderAggregate {
    private int orderCount = 0;
    private double totalAmount = 0.0;
    private double averageAmount = 0.0;
    private long lastOrderTime = 0;

    public void addOrder(Order order) {
        orderCount++;
        totalAmount += order.getAmount();
        averageAmount = totalAmount / orderCount;
        lastOrderTime = Math.max(lastOrderTime, order.getTimestamp());
    }
    // getters
}
```

### Reduce Operation

```java
// Find max value per key
KTable<String, Long> maxValues = stream
    .groupByKey()
    .reduce(
        (value1, value2) -> Math.max(value1, value2),
        Materialized.as("max-values-store")
    );

// Concatenate strings
KTable<String, String> concatenated = stringStream
    .groupByKey()
    .reduce(
        (v1, v2) -> v1 + "," + v2,
        Materialized.as("concatenated-store")
    );
```

## Interactive Queries

### Query Local State Store

```java
import org.apache.kafka.streams.state.*;
import org.apache.kafka.streams.*;

public class StateQueryService {
    private final KafkaStreams streams;

    public StateQueryService(KafkaStreams streams) {
        this.streams = streams;
    }

    public Long getCount(String key) {
        ReadOnlyKeyValueStore<String, Long> store = streams.store(
            StoreQueryParameters.fromNameAndType(
                "event-counts-store",
                QueryableStoreTypes.keyValueStore()
            )
        );
        return store.get(key);
    }

    public Map<String, Long> getAllCounts() {
        ReadOnlyKeyValueStore<String, Long> store = streams.store(
            StoreQueryParameters.fromNameAndType(
                "event-counts-store",
                QueryableStoreTypes.keyValueStore()
            )
        );

        Map<String, Long> results = new HashMap<>();
        try (KeyValueIterator<String, Long> iterator = store.all()) {
            while (iterator.hasNext()) {
                KeyValue<String, Long> entry = iterator.next();
                results.put(entry.key, entry.value);
            }
        }
        return results;
    }

    public Map<String, Long> getCountsInRange(String from, String to) {
        ReadOnlyKeyValueStore<String, Long> store = streams.store(
            StoreQueryParameters.fromNameAndType(
                "event-counts-store",
                QueryableStoreTypes.keyValueStore()
            )
        );

        Map<String, Long> results = new HashMap<>();
        try (KeyValueIterator<String, Long> iterator = store.range(from, to)) {
            while (iterator.hasNext()) {
                KeyValue<String, Long> entry = iterator.next();
                results.put(entry.key, entry.value);
            }
        }
        return results;
    }
}
```

### REST API for State Queries

```java
import com.sun.net.httpserver.*;
import java.io.*;
import java.net.*;

public class StateQueryServer {
    private final StateQueryService queryService;
    private HttpServer server;

    public StateQueryServer(KafkaStreams streams, int port) throws IOException {
        this.queryService = new StateQueryService(streams);
        this.server = HttpServer.create(new InetSocketAddress(port), 0);

        server.createContext("/count", this::handleCount);
        server.createContext("/counts", this::handleAllCounts);
    }

    public void start() {
        server.start();
        System.out.println("Query server started on port " + server.getAddress().getPort());
    }

    private void handleCount(HttpExchange exchange) throws IOException {
        String key = exchange.getRequestURI().getQuery().split("=")[1];
        Long count = queryService.getCount(key);

        String response = count != null ? count.toString() : "null";
        exchange.sendResponseHeaders(200, response.length());
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(response.getBytes());
        }
    }

    private void handleAllCounts(HttpExchange exchange) throws IOException {
        Map<String, Long> counts = queryService.getAllCounts();
        String response = new ObjectMapper().writeValueAsString(counts);

        exchange.getResponseHeaders().set("Content-Type", "application/json");
        exchange.sendResponseHeaders(200, response.length());
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(response.getBytes());
        }
    }
}
```

### Distributed Queries

```java
public class DistributedQueryService {
    private final KafkaStreams streams;
    private final HostInfo thisHost;

    public DistributedQueryService(KafkaStreams streams, HostInfo thisHost) {
        this.streams = streams;
        this.thisHost = thisHost;
    }

    public Long getCount(String key) {
        // Find which instance has the key
        KeyQueryMetadata metadata = streams.queryMetadataForKey(
            "event-counts-store",
            key,
            Serdes.String().serializer()
        );

        if (metadata.equals(KeyQueryMetadata.NOT_AVAILABLE)) {
            throw new IllegalStateException("Store not available");
        }

        // Check if this instance has the key
        if (metadata.activeHost().equals(thisHost)) {
            return queryLocalStore(key);
        } else {
            // Query remote instance
            return queryRemoteStore(metadata.activeHost(), key);
        }
    }

    private Long queryLocalStore(String key) {
        ReadOnlyKeyValueStore<String, Long> store = streams.store(
            StoreQueryParameters.fromNameAndType(
                "event-counts-store",
                QueryableStoreTypes.keyValueStore()
            )
        );
        return store.get(key);
    }

    private Long queryRemoteStore(HostInfo host, String key) {
        String url = String.format("http://%s:%d/count?key=%s",
            host.host(), host.port(), key);
        // Make HTTP request to remote instance
        // Return result
        return null; // Implementation depends on HTTP client
    }
}
```

## Custom State Stores

### Custom Key-Value Store

```java
import org.apache.kafka.streams.processor.StateStore;
import org.apache.kafka.streams.state.*;

public class CustomStateStore implements StateStore {
    private final String name;
    private final Map<String, String> data = new ConcurrentHashMap<>();
    private boolean open = false;

    public CustomStateStore(String name) {
        this.name = name;
    }

    @Override
    public String name() {
        return name;
    }

    @Override
    public void init(ProcessorContext context, StateStore root) {
        this.open = true;
        // Register for changelog if needed
        context.register(root, (key, value) -> {
            if (value == null) {
                data.remove(new String(key));
            } else {
                data.put(new String(key), new String(value));
            }
        });
    }

    @Override
    public void flush() {
        // Flush to disk if persistent
    }

    @Override
    public void close() {
        this.open = false;
        data.clear();
    }

    @Override
    public boolean persistent() {
        return false;
    }

    @Override
    public boolean isOpen() {
        return open;
    }

    public void put(String key, String value) {
        data.put(key, value);
    }

    public String get(String key) {
        return data.get(key);
    }
}
```

### Register Custom Store

```java
StreamsBuilder builder = new StreamsBuilder();

StoreBuilder<KeyValueStore<String, String>> storeBuilder =
    Stores.keyValueStoreBuilder(
        Stores.persistentKeyValueStore("custom-store"),
        Serdes.String(),
        Serdes.String()
    ).withCachingEnabled();

builder.addStateStore(storeBuilder);

// Use in processor
builder.stream("input")
    .process(() -> new CustomProcessor(), "custom-store");
```

## Processor API for Advanced State Management

```java
import org.apache.kafka.streams.processor.api.*;
import org.apache.kafka.streams.state.*;

public class StatefulProcessor implements Processor<String, String, String, String> {
    private ProcessorContext<String, String> context;
    private KeyValueStore<String, Long> stateStore;

    @Override
    public void init(ProcessorContext<String, String> context) {
        this.context = context;
        this.stateStore = context.getStateStore("count-store");

        // Schedule punctuation for periodic tasks
        context.schedule(
            Duration.ofMinutes(1),
            PunctuationType.WALL_CLOCK_TIME,
            this::emitStats
        );
    }

    @Override
    public void process(Record<String, String> record) {
        String key = record.key();

        // Update state
        Long currentCount = stateStore.get(key);
        long newCount = (currentCount == null ? 0 : currentCount) + 1;
        stateStore.put(key, newCount);

        // Forward result
        context.forward(new Record<>(key, String.valueOf(newCount), record.timestamp()));
    }

    private void emitStats(long timestamp) {
        // Periodic emission of all stats
        try (KeyValueIterator<String, Long> iterator = stateStore.all()) {
            while (iterator.hasNext()) {
                KeyValue<String, Long> entry = iterator.next();
                context.forward(new Record<>(
                    entry.key,
                    "stats:" + entry.value,
                    timestamp
                ));
            }
        }
    }

    @Override
    public void close() {
        // Cleanup
    }
}
```

## Fault Tolerance and Recovery

### Standby Replicas

```java
Properties props = new Properties();
// Enable standby replicas for faster recovery
props.put(StreamsConfig.NUM_STANDBY_REPLICAS_CONFIG, 1);
```

### State Store Restoration

```java
public class RestorationListener implements StateRestoreListener {
    @Override
    public void onRestoreStart(
        TopicPartition topicPartition,
        String storeName,
        long startingOffset,
        long endingOffset
    ) {
        System.out.printf("Starting restoration of %s from offset %d to %d%n",
            storeName, startingOffset, endingOffset);
    }

    @Override
    public void onBatchRestored(
        TopicPartition topicPartition,
        String storeName,
        long batchEndOffset,
        long numRestored
    ) {
        System.out.printf("Restored %d records to %s, current offset: %d%n",
            numRestored, storeName, batchEndOffset);
    }

    @Override
    public void onRestoreEnd(
        TopicPartition topicPartition,
        String storeName,
        long totalRestored
    ) {
        System.out.printf("Completed restoration of %s, total records: %d%n",
            storeName, totalRestored);
    }
}

// Register listener
streams.setGlobalStateRestoreListener(new RestorationListener());
```

## Best Practices

### 1. Choose Right State Store Type

```java
// Persistent for large state (survives restarts)
Stores.persistentKeyValueStore("my-store")

// In-memory for small state (faster access)
Stores.inMemoryKeyValueStore("my-store")

// With caching for better performance
storeBuilder.withCachingEnabled()

// With logging for fault tolerance
storeBuilder.withLoggingEnabled(configs)
```

### 2. Handle Rebalancing

```java
streams.setStateListener((newState, oldState) -> {
    if (newState == KafkaStreams.State.REBALANCING) {
        System.out.println("Rebalancing started - state queries may fail");
    } else if (newState == KafkaStreams.State.RUNNING) {
        System.out.println("Running - state queries available");
    }
});
```

### 3. Monitor State Store Metrics

```java
// Get metrics
Map<MetricName, ? extends Metric> metrics = streams.metrics();

metrics.forEach((name, metric) -> {
    if (name.name().contains("state-store")) {
        System.out.printf("%s: %s%n", name.name(), metric.metricValue());
    }
});
```

## Summary

| Feature | Use Case |
|---------|----------|
| KeyValue Store | Point lookups, counters |
| Window Store | Time-based aggregations |
| Session Store | User session tracking |
| Global Store | Reference data joins |
| Interactive Queries | Real-time state access |

Stateful processing enables powerful real-time analytics. Use appropriate state store types, enable standby replicas for fault tolerance, and leverage interactive queries for building responsive applications.
