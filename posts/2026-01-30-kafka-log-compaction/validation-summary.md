# Validation Summary: How to Implement Kafka Log Compaction Strategies

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Apache Kafka log compaction
- Apache Kafka topic and broker configuration
- Kafka Java AdminClient and producer APIs
- Kafka JMX monitoring
- Prometheus alerting rules
- Python JMX metrics collection script

## Sources Consulted
- Apache Kafka topic configuration reference: https://kafka.apache.org/30/generated/topic_config.html
- Apache Kafka broker configuration reference: https://kafka.apache.org/41/configuration/broker-configs/
- Apache Kafka design documentation for log compaction: https://kafka.apache.org/43/design/design/
- Apache Kafka monitoring documentation: https://kafka.apache.org/41/operations/monitoring/
- Confluent Kafka log compaction documentation: https://docs.confluent.io/kafka/design/log_compaction.html
- Confluent Kafka JMX monitoring documentation: https://docs.confluent.io/platform/7.5/kafka/monitoring.html

## Issues Found
- The post described Kafka as having "three fundamental cleanup policies." Kafka has two cleanup policy values, `delete` and `compact`, which can be combined. Updated the wording to avoid presenting `compact,delete` as a separate policy value.
- Several statements implied pure compaction immediately keeps only one value per key and that updates do not increase storage. Kafka compaction is asynchronous, does not compact the active segment, and guarantees the latest value is retained while older values are eligible for cleanup. Updated the wording and storage-growth note.
- Comments described `max.compaction.lag.ms` as forcing compaction. Kafka uses it to bound how long records remain ineligible for compaction, subject to cleaner availability and runtime. Updated the comments to describe eligibility correctly.
- The "tiered compaction" strategy was not Kafka tiered storage and could be confused with Kafka's tiered storage feature. Renamed it to high-throughput compaction while preserving the same tuning guidance.
- The low-latency broker example used `log.cleaner.io.max.bytes.per.second=Infinity`. Kafka documents this config as a double with a default maximum double value. Replaced it with `1.7976931348623157E308`.
- The multi-topic Java example used `ConfigResource` without importing `org.apache.kafka.common.config.ConfigResource`. Added the missing import.
- The monitoring examples referenced an undocumented `total-cleaned-bytes-total` log cleaner MBean. Replaced it with documented log cleaner metrics such as `max-clean-time-secs` and `max-compaction-delay-secs`.
- The uncleanable partitions JMX query omitted the documented `logDirectory` key property. Updated the MBean query to include a wildcard log directory.
- The null-key pitfall incorrectly said keyless records would accumulate indefinitely. Kafka compacted topics require keys and brokers reject keyless records. Updated the explanation and kept the producer-side validation example.
- The validating producer snippet omitted required Java imports. Added imports for `KafkaProducer`, `ProducerRecord`, `RecordMetadata`, `Set`, and `Future`.

## Review Notes
- The Prometheus metric names are exporter-dependent. The MBean names are now aligned with documented Kafka metrics, but deployments may need to adjust metric names to match their JMX exporter mapping.
