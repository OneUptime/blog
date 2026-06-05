# Validation Summary: How to Monitor Kafka Streams Application State Store Latency and Commit Rate

## Status
validated

## Post Type
Tutorial / monitoring guide

## Technologies Covered
- Apache Kafka Streams
- Kafka Streams JMX metrics
- OpenTelemetry Collector JMX receiver
- OpenTelemetry JMX Metric Gatherer / JMX Scraper
- RocksDB state stores
- Java

## Sources Consulted
- Apache Kafka Streams monitoring documentation: https://kafka.apache.org/43/operations/monitoring/
- Apache Kafka Streams configuration documentation: https://kafka.apache.org/39/streams/developer-guide/config-streams/
- Apache Kafka StreamsConfig Javadocs: https://kafka.apache.org/43/javadoc/org/apache/kafka/streams/StreamsConfig.html
- Apache Kafka RocksDBConfigSetter Javadocs: https://kafka.apache.org/43/javadoc/org/apache/kafka/streams/state/RocksDBConfigSetter.html
- OpenTelemetry JMX metrics documentation: https://opentelemetry.io/docs/languages/java/jmx/
- OpenTelemetry Collector JMX receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/jmxreceiver
- OpenTelemetry JMX Metric Gatherer Kafka target documentation: https://github.com/open-telemetry/opentelemetry-java-contrib/blob/main/jmx-metrics/docs/target-systems/kafka.md

## Issues Found
- The post implied that `target_system: kafka` collects Kafka Streams state store and task metrics. The OpenTelemetry built-in Kafka JMX mapping is broker-focused, so I changed the collector section to use `target_system: jvm` plus `jmx_configs` and added a note that Kafka Streams MBeans need a custom mapping.
- Several RocksDB metric names did not match Kafka Streams documented MBean attributes. I replaced them with normalized names based on documented attributes such as `bytes-read-total`, `cur-size-all-mem-tables`, and `block-cache-data-hit-ratio`.
- `kafka.streams.state.store.all.rate` was described as total operations per second. Kafka documents this as the rate for all-iterator operations, so I corrected the description.
- The Kafka Streams example wrote `Long` aggregation results using the default String value serde. I added `Produced.with(Serdes.String(), Serdes.Long())` for the output topic.
- The RocksDB tuning snippet used the raw string key for the config and created an off-heap `LRUCache` without closing it. I changed it to `StreamsConfig.ROCKSDB_CONFIG_SETTER_CLASS_CONFIG` and added a `close` implementation for the cache.
- The summary said the JMX receiver collects all listed metrics without application changes. I clarified that Kafka Streams metrics can be collected this way when a Kafka Streams MBean mapping is included.

## Review Notes
- The OpenTelemetry Collector `jmxreceiver` is currently documented as deprecated, with standalone JMX gathering/scraping recommended. The post still includes a Collector receiver example, but now notes that the same mapping can be used with the standalone OpenTelemetry JMX Scraper.
