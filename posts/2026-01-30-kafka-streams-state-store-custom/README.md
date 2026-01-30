# How to Build Kafka Streams State Store Custom

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Kafka, Streams, State Store, Real-time

Description: Create custom state stores in Kafka Streams for specialized storage requirements with custom serialization and query capabilities.

---

Kafka Streams provides built-in state stores like RocksDB and in-memory stores. However, production systems often require custom storage backends, specialized serialization, or unique query patterns. This guide walks through building custom state stores from scratch.

## Why Build Custom State Stores?

Default state stores work well for most cases, but you might need custom implementations when:

| Use Case | Reason |
|----------|--------|
| External database integration | Store state in Redis, PostgreSQL, or other systems |
| Custom serialization | Use Protobuf, Avro, or domain-specific formats |
| Specialized queries | Range queries, full-text search, or graph traversals |
| Memory optimization | Implement compression or tiered storage |
| Monitoring requirements | Add detailed metrics and tracing |

## Understanding the KeyValueStore Interface

The `KeyValueStore` interface is the foundation for all key-value state stores in Kafka Streams. Here is the core interface you need to implement.

```java
import org.apache.kafka.streams.processor.StateStore;
import org.apache.kafka.streams.state.KeyValueStore;
import org.apache.kafka.streams.state.KeyValueIterator;

public interface KeyValueStore<K, V> extends StateStore, ReadOnlyKeyValueStore<K, V> {

    void put(K key, V value);

    V putIfAbsent(K key, V value);

    void putAll(List<KeyValue<K, V>> entries);

    V delete(K key);

    V get(K key);

    KeyValueIterator<K, V> range(K from, K to);

    KeyValueIterator<K, V> all();

    long approximateNumEntries();
}
```

## Building a Custom In-Memory State Store

Let's start with a simple in-memory implementation that demonstrates all the required methods.

```java
import org.apache.kafka.streams.processor.ProcessorContext;
import org.apache.kafka.streams.processor.StateStore;
import org.apache.kafka.streams.state.KeyValueIterator;
import org.apache.kafka.streams.state.KeyValueStore;
import org.apache.kafka.streams.KeyValue;

import java.util.List;
import java.util.NavigableMap;
import java.util.concurrent.ConcurrentSkipListMap;

public class CustomInMemoryStore<K extends Comparable<K>, V>
        implements KeyValueStore<K, V> {

    private final String name;
    private final NavigableMap<K, V> store;
    private boolean open;
    private ProcessorContext context;

    public CustomInMemoryStore(String name) {
        this.name = name;
        this.store = new ConcurrentSkipListMap<>();
        this.open = false;
    }

    @Override
    public String name() {
        return this.name;
    }

    @Override
    public void init(ProcessorContext context, StateStore root) {
        this.context = context;
        this.open = true;

        // Register the store with the context for changelog tracking
        if (root != null) {
            context.register(root, (key, value) -> {
                // State restoration callback
                if (value == null) {
                    store.remove(deserializeKey(key));
                } else {
                    store.put(deserializeKey(key), deserializeValue(value));
                }
            });
        }
    }

    @Override
    public void put(K key, V value) {
        if (value == null) {
            store.remove(key);
        } else {
            store.put(key, value);
        }
    }

    @Override
    public V putIfAbsent(K key, V value) {
        V existing = store.get(key);
        if (existing == null) {
            store.put(key, value);
        }
        return existing;
    }

    @Override
    public void putAll(List<KeyValue<K, V>> entries) {
        for (KeyValue<K, V> entry : entries) {
            put(entry.key, entry.value);
        }
    }

    @Override
    public V delete(K key) {
        return store.remove(key);
    }

    @Override
    public V get(K key) {
        return store.get(key);
    }

    @Override
    public KeyValueIterator<K, V> range(K from, K to) {
        return new InMemoryKeyValueIterator<>(
            store.subMap(from, true, to, true).entrySet().iterator()
        );
    }

    @Override
    public KeyValueIterator<K, V> all() {
        return new InMemoryKeyValueIterator<>(store.entrySet().iterator());
    }

    @Override
    public long approximateNumEntries() {
        return store.size();
    }

    @Override
    public void flush() {
        // Nothing to flush for in-memory store
    }

    @Override
    public void close() {
        store.clear();
        this.open = false;
    }

    @Override
    public boolean persistent() {
        return false;
    }

    @Override
    public boolean isOpen() {
        return this.open;
    }

    @SuppressWarnings("unchecked")
    private K deserializeKey(byte[] key) {
        // Implement your deserialization logic
        return (K) context.keySerde().deserializer().deserialize(name, key);
    }

    @SuppressWarnings("unchecked")
    private V deserializeValue(byte[] value) {
        // Implement your deserialization logic
        return (V) context.valueSerde().deserializer().deserialize(name, value);
    }
}
```

## Implementing the KeyValueIterator

The iterator is required for range and full scan operations. Here is a proper implementation.

```java
import org.apache.kafka.streams.state.KeyValueIterator;
import org.apache.kafka.streams.KeyValue;

import java.util.Iterator;
import java.util.Map;
import java.util.NoSuchElementException;

public class InMemoryKeyValueIterator<K, V> implements KeyValueIterator<K, V> {

    private final Iterator<Map.Entry<K, V>> iterator;
    private Map.Entry<K, V> current;
    private boolean closed;

    public InMemoryKeyValueIterator(Iterator<Map.Entry<K, V>> iterator) {
        this.iterator = iterator;
        this.closed = false;
    }

    @Override
    public boolean hasNext() {
        if (closed) {
            throw new IllegalStateException("Iterator has been closed");
        }
        return iterator.hasNext();
    }

    @Override
    public KeyValue<K, V> next() {
        if (closed) {
            throw new IllegalStateException("Iterator has been closed");
        }
        if (!hasNext()) {
            throw new NoSuchElementException();
        }
        current = iterator.next();
        return new KeyValue<>(current.getKey(), current.getValue());
    }

    @Override
    public K peekNextKey() {
        if (closed) {
            throw new IllegalStateException("Iterator has been closed");
        }
        if (!hasNext()) {
            throw new NoSuchElementException();
        }
        return iterator.next().getKey();
    }

    @Override
    public void close() {
        this.closed = true;
    }
}
```

## Creating a StateStoreSupplier

The `StoreSupplier` interface tells Kafka Streams how to create instances of your custom store.

```java
import org.apache.kafka.streams.state.KeyValueBytesStoreSupplier;
import org.apache.kafka.streams.state.KeyValueStore;
import org.apache.kafka.common.utils.Bytes;

public class CustomStoreSupplier implements KeyValueBytesStoreSupplier {

    private final String name;
    private final boolean loggingEnabled;

    public CustomStoreSupplier(String name, boolean loggingEnabled) {
        this.name = name;
        this.loggingEnabled = loggingEnabled;
    }

    @Override
    public String name() {
        return name;
    }

    @Override
    public KeyValueStore<Bytes, byte[]> get() {
        return new CustomInMemoryStore<>(name);
    }

    @Override
    public String metricsScope() {
        return "custom-state-store";
    }
}
```

## Building a Persistent State Store with Custom Backend

For production systems, you typically need persistence. Here is an implementation using a file-based backend with memory-mapped files.

```java
import org.apache.kafka.streams.processor.ProcessorContext;
import org.apache.kafka.streams.processor.StateStore;
import org.apache.kafka.streams.state.KeyValueIterator;
import org.apache.kafka.streams.state.KeyValueStore;
import org.apache.kafka.streams.KeyValue;

import java.io.*;
import java.nio.MappedByteBuffer;
import java.nio.channels.FileChannel;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

public class PersistentCustomStore<K, V> implements KeyValueStore<K, V> {

    private final String name;
    private final Path storeDirectory;
    private final Map<K, Long> keyIndex;
    private RandomAccessFile dataFile;
    private FileChannel fileChannel;
    private ProcessorContext context;
    private boolean open;
    private long writePosition;

    public PersistentCustomStore(String name, Path baseDirectory) {
        this.name = name;
        this.storeDirectory = baseDirectory.resolve(name);
        this.keyIndex = new ConcurrentHashMap<>();
        this.writePosition = 0;
    }

    @Override
    public void init(ProcessorContext context, StateStore root) {
        this.context = context;

        try {
            Files.createDirectories(storeDirectory);

            Path dataPath = storeDirectory.resolve("data.bin");
            Path indexPath = storeDirectory.resolve("index.bin");

            this.dataFile = new RandomAccessFile(dataPath.toFile(), "rw");
            this.fileChannel = dataFile.getChannel();

            // Load existing index if present
            if (Files.exists(indexPath)) {
                loadIndex(indexPath);
            }

            this.writePosition = dataFile.length();
            this.open = true;

            // Register for state restoration
            if (root != null) {
                context.register(root, this::restoreCallback);
            }

        } catch (IOException e) {
            throw new RuntimeException("Failed to initialize store: " + name, e);
        }
    }

    private void restoreCallback(byte[] key, byte[] value) {
        // Called during state restoration from changelog
        if (value == null) {
            delete(deserializeKey(key));
        } else {
            put(deserializeKey(key), deserializeValue(value));
        }
    }

    @Override
    public void put(K key, V value) {
        if (value == null) {
            delete(key);
            return;
        }

        try {
            byte[] serializedValue = serializeValue(value);

            // Write value to data file
            dataFile.seek(writePosition);
            dataFile.writeInt(serializedValue.length);
            dataFile.write(serializedValue);

            // Update index
            keyIndex.put(key, writePosition);
            writePosition = dataFile.getFilePointer();

        } catch (IOException e) {
            throw new RuntimeException("Failed to write to store", e);
        }
    }

    @Override
    public V get(K key) {
        Long position = keyIndex.get(key);
        if (position == null) {
            return null;
        }

        try {
            dataFile.seek(position);
            int length = dataFile.readInt();
            byte[] data = new byte[length];
            dataFile.readFully(data);
            return deserializeValue(data);

        } catch (IOException e) {
            throw new RuntimeException("Failed to read from store", e);
        }
    }

    @Override
    public V delete(K key) {
        V oldValue = get(key);
        keyIndex.remove(key);
        return oldValue;
    }

    @Override
    public V putIfAbsent(K key, V value) {
        V existing = get(key);
        if (existing == null) {
            put(key, value);
        }
        return existing;
    }

    @Override
    public void putAll(List<KeyValue<K, V>> entries) {
        for (KeyValue<K, V> entry : entries) {
            put(entry.key, entry.value);
        }
    }

    @Override
    public KeyValueIterator<K, V> range(K from, K to) {
        // For persistent store, load keys into sorted set for range query
        TreeMap<K, V> rangeMap = new TreeMap<>();
        for (K key : keyIndex.keySet()) {
            @SuppressWarnings("unchecked")
            Comparable<K> comparableKey = (Comparable<K>) key;
            if (comparableKey.compareTo(from) >= 0 && comparableKey.compareTo(to) <= 0) {
                rangeMap.put(key, get(key));
            }
        }
        return new InMemoryKeyValueIterator<>(rangeMap.entrySet().iterator());
    }

    @Override
    public KeyValueIterator<K, V> all() {
        Map<K, V> allEntries = new LinkedHashMap<>();
        for (K key : keyIndex.keySet()) {
            allEntries.put(key, get(key));
        }
        return new InMemoryKeyValueIterator<>(allEntries.entrySet().iterator());
    }

    @Override
    public long approximateNumEntries() {
        return keyIndex.size();
    }

    @Override
    public void flush() {
        try {
            fileChannel.force(true);
            saveIndex();
        } catch (IOException e) {
            throw new RuntimeException("Failed to flush store", e);
        }
    }

    @Override
    public void close() {
        try {
            flush();
            fileChannel.close();
            dataFile.close();
            this.open = false;
        } catch (IOException e) {
            throw new RuntimeException("Failed to close store", e);
        }
    }

    @Override
    public String name() {
        return name;
    }

    @Override
    public boolean persistent() {
        return true;
    }

    @Override
    public boolean isOpen() {
        return open;
    }

    private void saveIndex() throws IOException {
        Path indexPath = storeDirectory.resolve("index.bin");
        try (ObjectOutputStream oos = new ObjectOutputStream(
                Files.newOutputStream(indexPath))) {
            oos.writeObject(new HashMap<>(keyIndex));
        }
    }

    @SuppressWarnings("unchecked")
    private void loadIndex(Path indexPath) throws IOException {
        try (ObjectInputStream ois = new ObjectInputStream(
                Files.newInputStream(indexPath))) {
            Map<K, Long> loaded = (Map<K, Long>) ois.readObject();
            keyIndex.putAll(loaded);
        } catch (ClassNotFoundException e) {
            throw new IOException("Failed to load index", e);
        }
    }

    @SuppressWarnings("unchecked")
    private K deserializeKey(byte[] key) {
        return (K) context.keySerde().deserializer().deserialize(name, key);
    }

    @SuppressWarnings("unchecked")
    private V deserializeValue(byte[] value) {
        return (V) context.valueSerde().deserializer().deserialize(name, value);
    }

    private byte[] serializeValue(V value) {
        return context.valueSerde().serializer().serialize(name, value);
    }
}
```

## State Store Restoration

When a Kafka Streams application restarts or rebalances, state stores need to be restored from changelog topics. Here is how to handle restoration properly.

```java
import org.apache.kafka.streams.processor.StateRestoreCallback;
import org.apache.kafka.streams.processor.BatchingStateRestoreCallback;

public class CustomBatchingRestoreCallback implements BatchingStateRestoreCallback {

    private final CustomInMemoryStore<?, ?> store;
    private long recordsRestored;

    public CustomBatchingRestoreCallback(CustomInMemoryStore<?, ?> store) {
        this.store = store;
        this.recordsRestored = 0;
    }

    @Override
    public void restoreAll(Collection<KeyValue<byte[], byte[]>> records) {
        for (KeyValue<byte[], byte[]> record : records) {
            restore(record.key, record.value);
        }
    }

    @Override
    public void restore(byte[] key, byte[] value) {
        // Track restoration progress
        recordsRestored++;

        if (recordsRestored % 10000 == 0) {
            System.out.println("Restored " + recordsRestored + " records to " +
                store.name());
        }

        // Delegate to store's internal restoration
        if (value == null) {
            store.delete(store.deserializeKey(key));
        } else {
            store.put(store.deserializeKey(key), store.deserializeValue(value));
        }
    }

    public long getRecordsRestored() {
        return recordsRestored;
    }
}
```

## Implementing Queryable State Stores

Interactive queries allow external applications to query state stores directly. You need to implement the appropriate read-only interface.

```java
import org.apache.kafka.streams.state.QueryableStoreType;
import org.apache.kafka.streams.state.ReadOnlyKeyValueStore;
import org.apache.kafka.streams.state.internals.StateStoreProvider;

public class CustomQueryableStoreType<K, V>
        implements QueryableStoreType<ReadOnlyKeyValueStore<K, V>> {

    @Override
    public boolean accepts(StateStore stateStore) {
        return stateStore instanceof CustomInMemoryStore;
    }

    @Override
    public ReadOnlyKeyValueStore<K, V> create(
            StateStoreProvider storeProvider,
            String storeName) {

        return new CompositeReadOnlyKeyValueStore<>(storeProvider, storeName);
    }
}
```

Here is the composite store that aggregates results from all partitions.

```java
import org.apache.kafka.streams.state.ReadOnlyKeyValueStore;
import org.apache.kafka.streams.state.KeyValueIterator;
import org.apache.kafka.streams.state.internals.StateStoreProvider;
import org.apache.kafka.streams.KeyValue;

import java.util.List;
import java.util.ArrayList;
import java.util.Iterator;

public class CompositeReadOnlyKeyValueStore<K, V>
        implements ReadOnlyKeyValueStore<K, V> {

    private final StateStoreProvider storeProvider;
    private final String storeName;

    public CompositeReadOnlyKeyValueStore(
            StateStoreProvider storeProvider,
            String storeName) {
        this.storeProvider = storeProvider;
        this.storeName = storeName;
    }

    @Override
    public V get(K key) {
        List<ReadOnlyKeyValueStore<K, V>> stores = getStores();
        for (ReadOnlyKeyValueStore<K, V> store : stores) {
            V value = store.get(key);
            if (value != null) {
                return value;
            }
        }
        return null;
    }

    @Override
    public KeyValueIterator<K, V> range(K from, K to) {
        List<KeyValueIterator<K, V>> iterators = new ArrayList<>();
        for (ReadOnlyKeyValueStore<K, V> store : getStores()) {
            iterators.add(store.range(from, to));
        }
        return new CompositeKeyValueIterator<>(iterators);
    }

    @Override
    public KeyValueIterator<K, V> all() {
        List<KeyValueIterator<K, V>> iterators = new ArrayList<>();
        for (ReadOnlyKeyValueStore<K, V> store : getStores()) {
            iterators.add(store.all());
        }
        return new CompositeKeyValueIterator<>(iterators);
    }

    @Override
    public long approximateNumEntries() {
        long total = 0;
        for (ReadOnlyKeyValueStore<K, V> store : getStores()) {
            total += store.approximateNumEntries();
        }
        return total;
    }

    @SuppressWarnings("unchecked")
    private List<ReadOnlyKeyValueStore<K, V>> getStores() {
        return storeProvider.stores(
            storeName,
            new CustomQueryableStoreType<K, V>()
        );
    }
}
```

## Wiring Custom Stores into Your Topology

Now let's put everything together and use the custom store in a Kafka Streams application.

```java
import org.apache.kafka.streams.KafkaStreams;
import org.apache.kafka.streams.StreamsBuilder;
import org.apache.kafka.streams.StreamsConfig;
import org.apache.kafka.streams.Topology;
import org.apache.kafka.streams.kstream.KStream;
import org.apache.kafka.streams.kstream.Materialized;
import org.apache.kafka.streams.state.Stores;
import org.apache.kafka.streams.state.KeyValueStore;
import org.apache.kafka.common.serialization.Serdes;

import java.util.Properties;

public class CustomStateStoreApplication {

    public static final String STORE_NAME = "custom-aggregation-store";

    public static void main(String[] args) {
        Properties props = new Properties();
        props.put(StreamsConfig.APPLICATION_ID_CONFIG, "custom-store-app");
        props.put(StreamsConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");
        props.put(StreamsConfig.DEFAULT_KEY_SERDE_CLASS_CONFIG,
            Serdes.String().getClass());
        props.put(StreamsConfig.DEFAULT_VALUE_SERDE_CLASS_CONFIG,
            Serdes.String().getClass());

        StreamsBuilder builder = new StreamsBuilder();

        // Create custom store supplier
        CustomStoreSupplier storeSupplier = new CustomStoreSupplier(
            STORE_NAME,
            true  // enable changelog logging
        );

        // Add the store to the topology
        builder.addStateStore(
            Stores.keyValueStoreBuilder(
                storeSupplier,
                Serdes.String(),
                Serdes.Long()
            )
        );

        // Process stream and use the custom store
        KStream<String, String> inputStream = builder.stream("input-topic");

        inputStream.process(() -> new CustomStoreProcessor(), STORE_NAME);

        // Build and start the topology
        Topology topology = builder.build();
        KafkaStreams streams = new KafkaStreams(topology, props);

        // Add shutdown hook
        Runtime.getRuntime().addShutdownHook(new Thread(streams::close));

        streams.start();
    }
}
```

## Creating a Custom Processor

The processor interacts with your custom state store.

```java
import org.apache.kafka.streams.processor.api.Processor;
import org.apache.kafka.streams.processor.api.ProcessorContext;
import org.apache.kafka.streams.processor.api.Record;
import org.apache.kafka.streams.state.KeyValueStore;

public class CustomStoreProcessor implements Processor<String, String, Void, Void> {

    private ProcessorContext<Void, Void> context;
    private KeyValueStore<String, Long> stateStore;

    @Override
    public void init(ProcessorContext<Void, Void> context) {
        this.context = context;
        this.stateStore = context.getStateStore(
            CustomStateStoreApplication.STORE_NAME
        );
    }

    @Override
    public void process(Record<String, String> record) {
        String key = record.key();

        // Get current count from custom store
        Long currentCount = stateStore.get(key);
        if (currentCount == null) {
            currentCount = 0L;
        }

        // Increment and store
        Long newCount = currentCount + 1;
        stateStore.put(key, newCount);

        // Log progress
        if (newCount % 1000 == 0) {
            System.out.println("Key " + key + " reached count " + newCount);
        }
    }

    @Override
    public void close() {
        // Cleanup if needed
    }
}
```

## Interactive Queries with Custom Stores

Expose your state store for external queries through a REST API.

```java
import org.apache.kafka.streams.KafkaStreams;
import org.apache.kafka.streams.StoreQueryParameters;
import org.apache.kafka.streams.state.QueryableStoreTypes;
import org.apache.kafka.streams.state.ReadOnlyKeyValueStore;
import org.apache.kafka.streams.state.HostInfo;
import org.apache.kafka.streams.state.StreamsMetadata;

import java.util.Collection;

public class InteractiveQueryService {

    private final KafkaStreams streams;
    private final HostInfo hostInfo;
    private final String storeName;

    public InteractiveQueryService(
            KafkaStreams streams,
            HostInfo hostInfo,
            String storeName) {
        this.streams = streams;
        this.hostInfo = hostInfo;
        this.storeName = storeName;
    }

    public Long getCount(String key) {
        // Find which instance has this key
        StreamsMetadata metadata = streams.metadataForKey(
            storeName,
            key,
            new org.apache.kafka.common.serialization.StringSerializer()
        );

        if (metadata == null || metadata.equals(StreamsMetadata.NOT_AVAILABLE)) {
            throw new IllegalStateException("Metadata not available for key: " + key);
        }

        // Check if this instance has the key
        if (metadata.hostInfo().equals(hostInfo)) {
            return getLocalCount(key);
        } else {
            // Forward request to the correct instance
            return fetchFromRemoteInstance(metadata.hostInfo(), key);
        }
    }

    private Long getLocalCount(String key) {
        ReadOnlyKeyValueStore<String, Long> store = streams.store(
            StoreQueryParameters.fromNameAndType(
                storeName,
                QueryableStoreTypes.keyValueStore()
            )
        );
        return store.get(key);
    }

    private Long fetchFromRemoteInstance(HostInfo remoteHost, String key) {
        // Implement HTTP client to query remote instance
        // This would typically use a REST client
        String url = String.format(
            "http://%s:%d/state/%s/%s",
            remoteHost.host(),
            remoteHost.port(),
            storeName,
            key
        );

        // Make HTTP request and parse response
        // Implementation depends on your HTTP client library
        return null; // Placeholder
    }

    public Collection<StreamsMetadata> getAllMetadata() {
        return streams.streamsMetadataForStore(storeName);
    }
}
```

## Adding Metrics to Custom Stores

Production stores need observability. Here is how to add metrics.

```java
import org.apache.kafka.common.metrics.Metrics;
import org.apache.kafka.common.metrics.Sensor;
import org.apache.kafka.common.metrics.stats.Avg;
import org.apache.kafka.common.metrics.stats.Max;
import org.apache.kafka.common.metrics.stats.Rate;

import java.util.concurrent.atomic.AtomicLong;

public class MetricsAwareStore<K extends Comparable<K>, V>
        extends CustomInMemoryStore<K, V> {

    private final AtomicLong putCount;
    private final AtomicLong getCount;
    private final AtomicLong deleteCount;
    private Sensor putSensor;
    private Sensor getSensor;
    private Sensor deleteSensor;

    public MetricsAwareStore(String name, Metrics metrics) {
        super(name);
        this.putCount = new AtomicLong(0);
        this.getCount = new AtomicLong(0);
        this.deleteCount = new AtomicLong(0);

        initializeMetrics(metrics);
    }

    private void initializeMetrics(Metrics metrics) {
        String groupName = "custom-state-store-metrics";

        putSensor = metrics.sensor("put-rate");
        putSensor.add(
            metrics.metricName("put-rate", groupName, "Rate of put operations"),
            new Rate()
        );
        putSensor.add(
            metrics.metricName("put-latency-avg", groupName, "Average put latency"),
            new Avg()
        );
        putSensor.add(
            metrics.metricName("put-latency-max", groupName, "Max put latency"),
            new Max()
        );

        getSensor = metrics.sensor("get-rate");
        getSensor.add(
            metrics.metricName("get-rate", groupName, "Rate of get operations"),
            new Rate()
        );

        deleteSensor = metrics.sensor("delete-rate");
        deleteSensor.add(
            metrics.metricName("delete-rate", groupName, "Rate of delete operations"),
            new Rate()
        );
    }

    @Override
    public void put(K key, V value) {
        long startTime = System.nanoTime();
        try {
            super.put(key, value);
        } finally {
            long latency = System.nanoTime() - startTime;
            putSensor.record(latency / 1_000_000.0); // Convert to milliseconds
            putCount.incrementAndGet();
        }
    }

    @Override
    public V get(K key) {
        long startTime = System.nanoTime();
        try {
            return super.get(key);
        } finally {
            long latency = System.nanoTime() - startTime;
            getSensor.record(latency / 1_000_000.0);
            getCount.incrementAndGet();
        }
    }

    @Override
    public V delete(K key) {
        long startTime = System.nanoTime();
        try {
            return super.delete(key);
        } finally {
            long latency = System.nanoTime() - startTime;
            deleteSensor.record(latency / 1_000_000.0);
            deleteCount.incrementAndGet();
        }
    }

    public long getPutCount() {
        return putCount.get();
    }

    public long getGetCount() {
        return getCount.get();
    }

    public long getDeleteCount() {
        return deleteCount.get();
    }
}
```

## Testing Custom State Stores

Unit testing is essential. Use the TopologyTestDriver for testing.

```java
import org.apache.kafka.streams.TopologyTestDriver;
import org.apache.kafka.streams.test.TestRecord;
import org.apache.kafka.streams.state.KeyValueStore;
import org.apache.kafka.common.serialization.StringSerializer;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Properties;

import static org.junit.jupiter.api.Assertions.*;

public class CustomStateStoreTest {

    private TopologyTestDriver testDriver;
    private KeyValueStore<String, Long> store;

    @BeforeEach
    void setup() {
        Properties props = new Properties();
        props.put(StreamsConfig.APPLICATION_ID_CONFIG, "test-app");
        props.put(StreamsConfig.BOOTSTRAP_SERVERS_CONFIG, "dummy:9092");

        // Build topology with custom store
        StreamsBuilder builder = new StreamsBuilder();

        CustomStoreSupplier storeSupplier = new CustomStoreSupplier(
            "test-store",
            false
        );

        builder.addStateStore(
            Stores.keyValueStoreBuilder(
                storeSupplier,
                Serdes.String(),
                Serdes.Long()
            )
        );

        builder.stream("input", Consumed.with(Serdes.String(), Serdes.String()))
            .process(() -> new CustomStoreProcessor(), "test-store");

        testDriver = new TopologyTestDriver(builder.build(), props);
        store = testDriver.getKeyValueStore("test-store");
    }

    @AfterEach
    void teardown() {
        testDriver.close();
    }

    @Test
    void testPutAndGet() {
        store.put("key1", 100L);
        assertEquals(100L, store.get("key1"));
    }

    @Test
    void testDelete() {
        store.put("key1", 100L);
        store.delete("key1");
        assertNull(store.get("key1"));
    }

    @Test
    void testRangeQuery() {
        store.put("a", 1L);
        store.put("b", 2L);
        store.put("c", 3L);
        store.put("d", 4L);

        int count = 0;
        try (KeyValueIterator<String, Long> iterator = store.range("b", "c")) {
            while (iterator.hasNext()) {
                iterator.next();
                count++;
            }
        }
        assertEquals(2, count);
    }

    @Test
    void testProcessorWithStore() {
        TestInputTopic<String, String> inputTopic = testDriver.createInputTopic(
            "input",
            new StringSerializer(),
            new StringSerializer()
        );

        inputTopic.pipeInput("user1", "event1");
        inputTopic.pipeInput("user1", "event2");
        inputTopic.pipeInput("user2", "event1");

        assertEquals(2L, store.get("user1"));
        assertEquals(1L, store.get("user2"));
    }
}
```

## Performance Considerations

When building custom state stores, keep these performance factors in mind:

| Factor | Recommendation |
|--------|----------------|
| Serialization | Use efficient formats like Protobuf or Avro |
| Memory | Implement LRU caching for frequently accessed keys |
| Disk I/O | Use memory-mapped files or async writes |
| Concurrency | Use ConcurrentHashMap or similar thread-safe structures |
| Compaction | Implement periodic compaction for persistent stores |
| Batch operations | Support putAll for better throughput |

## Conclusion

Building custom state stores in Kafka Streams gives you complete control over storage semantics, serialization, and query capabilities. Start with the basic KeyValueStore interface, add persistence if needed, implement proper restoration callbacks, and expose queryable interfaces for interactive queries. Always add comprehensive metrics and thorough testing to ensure your custom store behaves correctly under production conditions.

The code examples in this guide provide a solid foundation. Adapt them to your specific requirements, whether that means integrating with Redis, adding full-text search with Lucene, or implementing specialized caching strategies.
