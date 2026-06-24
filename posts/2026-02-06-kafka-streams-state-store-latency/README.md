# How to Monitor Kafka Streams Application State Store Latency and Commit Rate

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Kafka Streams, State Store, Performance

Description: Monitor Kafka Streams application state store latency, commit rate, and processing throughput using OpenTelemetry JMX metrics collection.

Kafka Streams applications maintain local state stores for operations like aggregations, joins, and windowed computations. The performance of these state stores directly impacts your stream processing latency. Monitoring state store operations alongside commit rates and processing throughput helps you tune your Kafka Streams applications for optimal performance.

## Enabling JMX in Kafka Streams

Kafka Streams applications expose metrics via JMX automatically. You just need to enable remote JMX access:

```java
// In your Kafka Streams application configuration
Properties props = new Properties();
props.put(StreamsConfig.APPLICATION_ID_CONFIG, "order-processor");
props.put(StreamsConfig.BOOTSTRAP_SERVERS_CONFIG, "kafka:9092");
// Metrics are exposed via JMX by default
// Enable built-in metrics at DEBUG level for more detail
props.put(StreamsConfig.METRICS_RECORDING_LEVEL_CONFIG, "DEBUG");
```

Start your application with JMX enabled:

```bash
java -Dcom.sun.management.jmxremote \
     -Dcom.sun.management.jmxremote.port=9999 \
     -Dcom.sun.management.jmxremote.authenticate=false \
     -Dcom.sun.management.jmxremote.ssl=false \
     -jar my-streams-app.jar
```

## Collector Configuration

The built-in OpenTelemetry JMX `target_system: kafka` mapping collects Kafka broker metrics. For Kafka Streams task and state store MBeans, add a custom JMX mapping with `jmx_configs` (or run the standalone OpenTelemetry JMX Scraper with the same mapping). The normalized metric names below assume your custom mapping converts Kafka Streams JMX attributes into these OpenTelemetry metric names.

```yaml
receivers:
  jmx/kafka-streams:
    jar_path: /opt/opentelemetry-jmx-metrics.jar
    endpoint: streams-app:9999
    target_system: jvm
    jmx_configs: /etc/otel/kafka-streams-jmx.yaml
    collection_interval: 15s
    resource_attributes:
      service.name: order-processor
      service.type: stream-processor

processors:
  batch:
    timeout: 10s
  resource:
    attributes:
      - key: kafka.streams.application.id
        value: order-processor
        action: upsert

exporters:
  otlp:
    endpoint: "your-backend:4317"
    tls:
      insecure: false

service:
  pipelines:
    metrics:
      receivers: [jmx/kafka-streams]
      processors: [resource, batch]
      exporters: [otlp]
```

## Key State Store Metrics

### RocksDB State Store (Default)

```text
# State store operation latency

kafka.streams.state.store.put.latency_avg     - Average put operation time
kafka.streams.state.store.put.latency_max     - Max put operation time
kafka.streams.state.store.get.latency_avg     - Average get operation time
kafka.streams.state.store.get.latency_max     - Max get operation time
kafka.streams.state.store.delete.latency_avg  - Average delete operation time
kafka.streams.state.store.range.latency_avg   - Average range scan time

# State store operation rates
kafka.streams.state.store.put.rate            - Put operations per second
kafka.streams.state.store.get.rate            - Get operations per second
kafka.streams.state.store.all.rate            - All-iterator operations per second

# RocksDB-specific metrics
kafka.streams.state.store.rocksdb.bytes.read.total      - Total bytes read from RocksDB
kafka.streams.state.store.rocksdb.bytes.written.total   - Total bytes written
kafka.streams.state.store.rocksdb.cur.size.all.mem.tables - Memtable memory usage
kafka.streams.state.store.rocksdb.block.cache.data.hit.ratio - Block cache effectiveness for data blocks
```

### Commit Metrics

```text
kafka.streams.task.commit.latency_avg    - Average commit time
kafka.streams.task.commit.latency_max    - Maximum commit time
kafka.streams.task.commit.rate           - Commits per second
kafka.streams.task.commit.total          - Total commits
```

### Processing Metrics

```text
kafka.streams.task.process.latency_avg   - Average time to process a record
kafka.streams.task.process.rate          - Records processed per second
kafka.streams.task.process.total         - Total records processed
kafka.streams.stream.thread.poll.records_avg - Average records per poll
```

## Example Kafka Streams Application with Monitoring

```java
import org.apache.kafka.streams.*;
import org.apache.kafka.streams.kstream.*;
import org.apache.kafka.common.serialization.Serdes;
import java.util.Properties;

public class OrderProcessor {
    public static void main(String[] args) {
        Properties props = new Properties();
        props.put(StreamsConfig.APPLICATION_ID_CONFIG, "order-processor");
        props.put(StreamsConfig.BOOTSTRAP_SERVERS_CONFIG, "kafka:9092");
        props.put(StreamsConfig.DEFAULT_KEY_SERDE_CLASS_CONFIG, Serdes.String().getClass());
        props.put(StreamsConfig.DEFAULT_VALUE_SERDE_CLASS_CONFIG, Serdes.String().getClass());
        // Enable detailed metrics
        props.put(StreamsConfig.METRICS_RECORDING_LEVEL_CONFIG, "DEBUG");
        // Commit interval affects latency vs throughput tradeoff
        props.put(StreamsConfig.COMMIT_INTERVAL_MS_CONFIG, 1000);

        StreamsBuilder builder = new StreamsBuilder();

        // Read from input topic
        KStream<String, String> orders = builder.stream("orders");

        // Aggregate order counts per customer (uses state store)
        KTable<String, Long> orderCounts = orders
            .groupByKey()
            .count(Materialized.as("order-counts-store"));

        // Write aggregation results to output topic
        orderCounts.toStream().to("order-counts", Produced.with(Serdes.String(), Serdes.Long()));

        KafkaStreams streams = new KafkaStreams(builder.build(), props);

        // Add shutdown hook for graceful cleanup
        Runtime.getRuntime().addShutdownHook(new Thread(streams::close));

        streams.start();
    }
}
```

## Alert Conditions

```yaml
# State store latency spike
- alert: KafkaStreamsStateStoreSlowPut
  condition: kafka.streams.state.store.put.latency_avg > 10
  for: 5m
  severity: warning
  message: "State store put latency is {{ value }}ms average"

# Commit latency too high
- alert: KafkaStreamsSlowCommit
  condition: kafka.streams.task.commit.latency_avg > 5000
  for: 5m
  severity: warning
  message: "Kafka Streams commit latency is {{ value }}ms"

# Processing throughput dropped
- alert: KafkaStreamsThroughputDrop
  condition: kafka.streams.task.process.rate < 100
  for: 10m
  severity: warning
  message: "Processing rate dropped to {{ value }} records/sec"

# RocksDB block cache miss ratio high
- alert: KafkaStreamsRocksDBCacheMiss
  condition: kafka.streams.state.store.rocksdb.block.cache.data.hit.ratio < 0.8
  for: 15m
  severity: warning
  message: "RocksDB block cache hit ratio is only {{ value }}"
```

## Tuning State Store Performance

Based on the metrics you collect, adjust these settings:

```java
// Increase RocksDB block cache for better read performance
props.put(StreamsConfig.ROCKSDB_CONFIG_SETTER_CLASS_CONFIG, CustomRocksDBConfig.class.getName());
```

```java
// Custom RocksDB configuration
import java.util.HashMap;
import java.util.Map;
import org.apache.kafka.streams.state.RocksDBConfigSetter;
import org.rocksdb.BlockBasedTableConfig;
import org.rocksdb.Cache;
import org.rocksdb.LRUCache;
import org.rocksdb.Options;

public class CustomRocksDBConfig implements RocksDBConfigSetter {
    private final Map<String, Cache> caches = new HashMap<>();

    @Override
    public void setConfig(String storeName, Options options, Map<String, Object> configs) {
        // 128MB block cache (default is much smaller)
        BlockBasedTableConfig tableConfig = (BlockBasedTableConfig) options.tableFormatConfig();
        Cache cache = new LRUCache(128 * 1024 * 1024);
        caches.put(storeName, cache);
        tableConfig.setBlockCache(cache);
        tableConfig.setBlockSize(16 * 1024);
        options.setTableFormatConfig(tableConfig);
        // Write buffer size
        options.setWriteBufferSize(64 * 1024 * 1024);
    }

    @Override
    public void close(String storeName, Options options) {
        Cache cache = caches.remove(storeName);
        if (cache != null) {
            cache.close();
        }
    }
}
```

## Summary

Kafka Streams state store metrics reveal the performance of your stream processing applications. Monitor put/get latency for state store operations, commit rate and latency for processing checkpoints, and processing throughput for overall application health. RocksDB-specific metrics like block cache hit ratio help you tune the underlying storage engine. JMX collection can collect these metrics without modifying your application code when you include a Kafka Streams MBean mapping.
